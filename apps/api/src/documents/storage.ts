import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, open, readdir, rename, unlink } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { HttpException } from "@nestjs/common";
import type { StorageEngine } from "multer";
import { validateDocx } from "./docx";
export const MAX_SIZE = 50 * 1024 * 1024;
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class DiskStorage implements StorageEngine {
  constructor(readonly directory: string) {}
  location(id: string, staging = false) {
    if (!UUID.test(id)) throw new Error("Invalid internal identifier");
    return path.join(this.directory, id + (staging ? ".part" : ""));
  }
  async initialize() {
    await mkdir(this.directory, { recursive: true });
  }
  _handleFile(
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, info?: Partial<Express.Multer.File>) => void,
  ) {
    const id = randomUUID(),
      destination = this.location(id, true),
      hash = createHash("sha256");
    let size = 0;
    const measure = new Transform({
      transform(chunk, _encoding, done) {
        size += chunk.length;
        hash.update(chunk);
        done(
          size > MAX_SIZE
            ? new HttpException("El archivo supera 50 MiB.", 413)
            : null,
          chunk,
        );
      },
    });
    pipeline(
      file.stream,
      measure,
      createWriteStream(destination, { flags: "wx", mode: 0o600 }),
    )
      .then(() =>
        cb(null, {
          filename: id,
          path: destination,
          size,
          ...{ hash: hash.digest("hex") },
        }),
      )
      .catch(async (error) => {
        await unlink(destination).catch(() => {});
        cb(error);
      });
  }
  _removeFile(
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null) => void,
  ) {
    unlink(file.path)
      .then(() => cb(null))
      .catch((error) => cb(error.code === "ENOENT" ? null : error));
  }
  async remove(id: string, staging = false) {
    await unlink(this.location(id, staging)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  async publish(id: string) {
    await rename(this.location(id, true), this.location(id));
  }
  async validate(file: Express.Multer.File) {
    // Multipart browser headers carry UTF-8 while Busboy defaults to Latin-1.
    if ([...file.originalname].every((char) => char.codePointAt(0)! <= 255)) {
      try {
        file.originalname = new TextDecoder("utf-8", { fatal: true }).decode(
          Buffer.from(file.originalname, "latin1"),
        );
      } catch {
        /* Keep genuine Latin-1 filenames. */
      }
    }
    if (!file.size) throw new HttpException("El archivo está vacío.", 422);
    if (
      /[\\/\x00-\x1f]/.test(file.originalname) ||
      Buffer.byteLength(file.originalname) > 255
    )
      throw new HttpException("Nombre de archivo inválido.", 422);
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const handle = await open(file.path, "r");
    let head: Buffer;
    try {
      head = Buffer.alloc(16);
      const result = await handle.read(head, 0, 16, 0);
      head = head.subarray(0, result.bytesRead);
    } finally {
      await handle.close();
    }
    const matches = (bytes: number[]) => bytes.every((b, i) => head[i] === b);
    if (ext === "pdf" && head.subarray(0, 5).toString() === "%PDF-")
      return { kind: "pdf", extension: ext, mimeType: "application/pdf" };
    if (ext === "png" && matches([137, 80, 78, 71, 13, 10, 26, 10]))
      return { kind: "image", extension: ext, mimeType: "image/png" };
    if (["jpg", "jpeg"].includes(ext) && matches([255, 216, 255]))
      return { kind: "image", extension: ext, mimeType: "image/jpeg" };
    if (ext === "docx" && matches([80, 75, 3, 4])) {
      await validateDocx(file.path);
      return {
        kind: "docx",
        extension: ext,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
    if (["txt", "md", "markdown"].includes(ext)) {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      try {
        for await (const chunk of createReadStream(file.path)) {
          const text = decoder.decode(chunk, { stream: true });
          if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) throw new Error();
        }
        decoder.decode();
      } catch {
        throw new HttpException("Se requiere texto UTF-8 válido.", 422);
      }
      return {
        kind: "text",
        extension: ext,
        mimeType: "text/plain; charset=utf-8",
      };
    }
    throw new HttpException("Formato o firma del archivo no admitido.", 422);
  }
  async stagedIds() {
    return (await readdir(this.directory))
      .filter((n) => n.endsWith(".part") && UUID.test(n.slice(0, -5)))
      .map((n) => n.slice(0, -5));
  }
}
