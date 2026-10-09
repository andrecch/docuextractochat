// Explicit acceptance test: recreates this project's app/db, retaining volumes.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const base = "http://127.0.0.1:8080";
const context =
  process.env.DOCKER_CONTEXT ??
  (process.platform === "win32" ? "desktop-linux" : "default");
const bytes = `Synthetic persistence verification ${randomUUID()}`;
let id;
async function healthy() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      if (
        (
          await fetch(`${base}/api/health`, {
            signal: AbortSignal.timeout(2000),
          })
        ).ok
      )
        return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Application did not become healthy after recreation.");
}
try {
  await healthy();
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes], { type: "text/plain" }),
    "persistence-synthetic.txt",
  );
  form.append("sensitivity", "sensitive");
  const saved = await fetch(`${base}/api/documents`, {
    method: "POST",
    body: form,
  });
  assert.equal(saved.status, 201);
  const record = await saved.json();
  id = record.id;
  execFileSync(
    "docker",
    [
      "--context",
      context,
      "compose",
      "up",
      "--no-build",
      "-d",
      "--force-recreate",
      "app",
      "db",
    ],
    { stdio: "inherit" },
  );
  await healthy();
  const listing = await (
    await fetch(`${base}/api/documents?page=1&limit=50`)
  ).json();
  const restored = listing.items.find((item) => item.id === id);
  assert.ok(restored);
  assert.equal(restored.hash, record.hash);
  assert.equal(restored.sensitivity, "sensitive");
  const downloaded = await fetch(`${base}/api/documents/${id}/download`);
  assert.equal(downloaded.status, 200);
  assert.equal(await downloaded.text(), bytes);
  assert.equal(
    (await fetch(`${base}/api/documents/${id}`, { method: "DELETE" })).status,
    204,
  );
  assert.equal((await fetch(`${base}/api/documents/${id}/file`)).status, 404);
  id = undefined;
  console.log(
    "PASS: database metadata and original bytes survive app/db recreation; deletion removes access.",
  );
} finally {
  if (id)
    await fetch(`${base}/api/documents/${id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
}
