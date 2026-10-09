import yauzl from "yauzl";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { HttpException } from "@nestjs/common";

const invalid = () =>
  new HttpException(
    "El archivo DOCX está dañado o supera los límites de seguridad.",
    422,
  );
export async function validateDocx(file: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    yauzl.open(
      file,
      { lazyEntries: true, validateEntrySizes: true },
      (err, zip) => {
        if (err || !zip) return reject(invalid());
        let count = 0,
          expanded = 0;
        const names = new Set<string>();
        let finished = false;
        const fail = () => {
          if (!finished) {
            finished = true;
            zip.close();
            reject(invalid());
          }
        };
        zip.on("error", fail);
        zip.on("entry", (entry) => {
          if (
            ++count > 1000 ||
            entry.generalPurposeBitFlag & 1 ||
            entry.uncompressedSize > 20 * 1024 * 1024 ||
            entry.fileName.includes("..") ||
            names.has(entry.fileName)
          )
            return fail();
          names.add(entry.fileName);
          if (entry.fileName.endsWith("/")) return zip.readEntry();
          zip.openReadStream(entry, (error, stream) => {
            if (error || !stream) return fail();
            stream.on("error", fail);
            stream.on("data", (chunk) => {
              expanded += chunk.length;
              if (expanded > 20 * 1024 * 1024) {
                stream.destroy();
                fail();
              }
            });
            stream.on("end", () => {
              if (!finished) zip.readEntry();
            });
          });
        });
        zip.on("end", () => {
          if (finished) return;
          if (
            !names.has("[Content_Types].xml") ||
            !names.has("_rels/.rels") ||
            !names.has("word/document.xml")
          )
            return fail();
          finished = true;
          resolve();
        });
        zip.readEntry();
      },
    );
  });
}
export class DocxPreview {
  private busy = false;
  async convert(file: string): Promise<{ html: string; warnings: string[] }> {
    if (this.busy)
      throw new HttpException(
        "Hay otra vista DOCX en proceso. Inténtalo de nuevo.",
        503,
      );
    this.busy = true;
    try {
      await validateDocx(file);
      return await new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, "docx-worker.js"), {
          workerData: { file },
          resourceLimits: {
            maxOldGenerationSizeMb: 64,
            maxYoungGenerationSizeMb: 16,
          },
        });
        const timer = setTimeout(() => {
          void worker.terminate();
          reject(
            new HttpException(
              "La vista DOCX excedió el tiempo disponible.",
              422,
            ),
          );
        }, 20000);
        worker.once("message", (result) => {
          clearTimeout(timer);
          void worker.terminate();
          result.error ? reject(invalid()) : resolve(result);
        });
        worker.once("error", () => {
          clearTimeout(timer);
          reject(invalid());
        });
        worker.once("exit", (code) => {
          clearTimeout(timer);
          if (code !== 0) reject(invalid());
        });
      });
    } finally {
      this.busy = false;
    }
  }
}
