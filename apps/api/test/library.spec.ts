import request from "supertest";
import { DataSource } from "typeorm";
import { createDataSource } from "../src/database/data-source";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, ChildProcess } from "node:child_process";
import { ZipFile } from "yazl";

const databaseUrl = process.env.DATABASE_TEST_URL;
const suite = databaseUrl ? describe : describe.skip;
async function zip(entries: Record<string, string | Buffer>) {
  const z = new ZipFile();
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    z.outputStream.on("data", (c) => chunks.push(c));
    z.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    z.outputStream.on("error", reject);
  });
  for (const [name, data] of Object.entries(entries))
    z.addBuffer(Buffer.isBuffer(data) ? data : Buffer.from(data), name);
  z.end();
  return done;
}
async function docx() {
  return zip({
    "[Content_Types].xml":
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    "_rels/.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    "word/document.xml":
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:r><w:t>Synthetic document</w:t></w:r></w:p><w:p><w:hyperlink r:id="evil"><w:r><w:t>Unsafe link</w:t></w:r></w:hyperlink></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Table cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>',
    "word/_rels/document.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="evil" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="javascript:alert(1)" TargetMode="External"/></Relationships>',
  });
}

suite("Persistent local library (real PostgreSQL)", () => {
  let admin: DataSource, db: DataSource, storage: string, child: ChildProcess;
  let logs = "";
  const schema = `test_library_${randomUUID().replaceAll("-", "")}`;
  const port = Number(process.env.TEST_API_PORT ?? 39031);
  const api = request(`http://127.0.0.1:${port}`);
  async function stop() {
    if (!child || child.exitCode !== null) return;
    const exited = new Promise<void>((resolve) =>
      child.once("exit", () => resolve()),
    );
    child.kill("SIGTERM");
    await exited;
  }
  async function start() {
    logs = "";
    child = spawn(
      process.execPath,
      [path.resolve(__dirname, "../src/main.js")],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          DATABASE_SCHEMA: schema,
          STORAGE_DIR: storage,
          PORT: String(port),
          HOST: "127.0.0.1",
          NODE_ENV: "test",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.stdout?.on("data", (c) => (logs += c));
    child.stderr?.on("data", (c) => (logs += c));
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null)
        throw new Error(`API startup failed: ${logs}`);
      try {
        const response = await api.get("/api/health");
        if (response.status === 200) return;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`API startup timed out: ${logs}`);
  }
  beforeAll(async () => {
    admin = createDataSource(databaseUrl);
    await admin.initialize();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    db = createDataSource(databaseUrl, schema);
    await db.initialize();
    await db.runMigrations();
    expect(await db.runMigrations()).toEqual([]);
    storage = await mkdtemp(path.resolve(__dirname, "../../.test-storage-"));
    await start();
  });
  afterAll(async () => {
    await stop();
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.destroy();
    }
    if (storage) await rm(storage, { recursive: true, force: true });
  });
  test("upload, pagination, original bytes, sensitivity and deletion", async () => {
    const bytes = Buffer.from("Factura sintética");
    const created = await api
      .post("/api/documents")
      .field("sensitivity", "sensitive")
      .attach("file", bytes, "factura-á.txt")
      .expect(201);
    const id = created.body.id;
    expect(created.body).toMatchObject({
      name: "factura-á.txt",
      size: bytes.length,
      sensitivity: "sensitive",
      kind: "text",
      extension: "txt",
    });
    expect(created.body.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      (
        await api.get("/api/documents?page=1&limit=20").expect(200)
      ).body.items.some((item: { id: string }) => item.id === id),
    ).toBe(true);
    const original = await api.get(`/api/documents/${id}/download`).expect(200);
    expect(original.text).toBe(bytes.toString());
    expect(original.headers["content-disposition"]).toContain("attachment");
    expect(original.headers["content-disposition"]).toContain(
      encodeURIComponent("factura-á.txt"),
    );
    expect(
      (
        await api
          .patch(`/api/documents/${id}/sensitivity`)
          .send({ sensitivity: "non-sensitive" })
          .expect(200)
      ).body.sensitivity,
    ).toBe("non-sensitive");
    await api
      .patch(`/api/documents/${id}/sensitivity`)
      .send({ sensitivity: "invalid" })
      .expect(400);
    await api.delete(`/api/documents/${id}`).expect(204);
    await api.get(`/api/documents/${id}/file`).expect(404);
    expect(await readdir(storage)).not.toContain(id);
  });
  test("concurrent duplicate upload creates one record and leaves no staging files", async () => {
    const results = await Promise.all([
      api
        .post("/api/documents")
        .attach("file", Buffer.from("Concurrent identical"), "a.txt"),
      api
        .post("/api/documents")
        .attach("file", Buffer.from("Concurrent identical"), "b.txt"),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const saved = results.find((r) => r.status === 201)!;
    expect(results.find((r) => r.status === 409)!.body.documentId).toBe(
      saved.body.id,
    );
    expect((await readdir(storage)).filter((n) => n.endsWith(".part"))).toEqual(
      [],
    );
  });
  test("rejects invalid content, UTF8, empty, path names and cross origin before storing", async () => {
    await api
      .post("/api/documents")
      .attach("file", Buffer.from("not pdf"), "false.pdf")
      .expect(422);
    await api
      .post("/api/documents")
      .attach("file", Buffer.from([0xff]), "bad.txt")
      .expect(422);
    await api
      .post("/api/documents")
      .attach("file", Buffer.alloc(0), "empty.txt")
      .expect(422);
    await api
      .post("/api/documents")
      .set("Origin", "https://evil.example")
      .attach("file", Buffer.from("blocked"), "a.txt")
      .expect(403);
    await api
      .post("/api/documents")
      .set("Sec-Fetch-Site", "cross-site")
      .attach("file", Buffer.from("blocked"), "a.txt")
      .expect(403);
    await api
      .get("/api/documents")
      .set("Host", "evil.example:3000")
      .expect(403);
    await api.get("/api/documents/not-a-uuid/file").expect(400);
    await api.get("/api/documents?page=0").expect(400);
    await api.get("/api/documents?limit=51").expect(400);
    await api
      .post("/api/documents")
      .field("unexpected", "value")
      .attach("file", Buffer.from("unknown field"), "bad.txt")
      .expect(400);
    expect((await readdir(storage)).filter((n) => n.endsWith(".part"))).toEqual(
      [],
    );
  });
  test("oversized streaming upload returns 413 and cleans staging", async () => {
    await api
      .post("/api/documents")
      .attach("file", Buffer.alloc(50 * 1024 * 1024 + 1, 65), "oversized.txt")
      .expect(413);
    expect((await readdir(storage)).filter((n) => n.endsWith(".part"))).toEqual(
      [],
    );
  });
  test("bounded DOCX conversion sanitizes links while preserving paragraphs and tables", async () => {
    const bytes = await docx();
    const created = await api
      .post("/api/documents")
      .attach("file", bytes, "test.docx")
      .expect(201);
    const preview = await api
      .get(`/api/documents/${created.body.id}/preview`)
      .expect(200);
    expect(preview.body.html).toContain("Synthetic document");
    expect(preview.body.html).toContain("<table>");
    expect(preview.body.html).not.toMatch(
      /javascript:|href=|<img|<script|style=/i,
    );
    expect(preview.body.warnings.length).toBeGreaterThan(0);
    expect(await readFile(path.join(storage, created.body.id))).toEqual(bytes);
    await api
      .post("/api/documents")
      .attach("file", await zip({ "random.txt": "not DOCX" }), "bad.docx")
      .expect(422);
    await api
      .post("/api/documents")
      .attach("file", bytes.subarray(0, 100), "corrupt.docx")
      .expect(422);
    await api
      .post("/api/documents")
      .attach(
        "file",
        await zip({
          "[Content_Types].xml": "x",
          "_rels/.rels": "x",
          "word/document.xml": Buffer.alloc(21 * 1024 * 1024),
        }),
        "large.docx",
      )
      .expect(422);
  });
  test("restart recovers completed pending write and deletion without erasing valid documents", async () => {
    await stop();
    const pending = randomUUID(),
      missing = randomUUID(),
      deleting = randomUUID(),
      orphan = randomUUID();
    for (const [id, state] of [
      [pending, "pending"],
      [missing, "pending"],
      [deleting, "deleting"],
    ])
      await db.query(
        'INSERT INTO documents(id,name,size,"mimeType",kind,extension,hash,sensitivity,state) VALUES($1,$2,4,$3,$4,$5,$6,$7,$8)',
        [
          id,
          "recovery.txt",
          "text/plain",
          "text",
          "txt",
          id.replaceAll("-", "").padEnd(64, "0"),
          "unknown",
          state,
        ],
      );
    await writeFile(path.join(storage, pending), "safe");
    await writeFile(path.join(storage, missing + ".part"), "temp");
    await writeFile(path.join(storage, deleting), "gone");
    await writeFile(path.join(storage, orphan + ".part"), "temp");
    await start();
    await api.get(`/api/documents/${pending}/file`).expect(200);
    await api.get(`/api/documents/${missing}/file`).expect(404);
    await api.get(`/api/documents/${deleting}/file`).expect(404);
    expect((await readdir(storage)).filter((n) => n.endsWith(".part"))).toEqual(
      [],
    );
  });
});
