import {
  Inject,
  Injectable,
  HttpException,
  OnModuleInit,
  OnApplicationShutdown,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { open } from "node:fs/promises";
import { DiskStorage, UUID } from "./storage";
import { DocxPreview } from "./docx";
export const SENSITIVITIES = ["unknown", "sensitive", "non-sensitive"];
export interface DocumentRow {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: string;
  extension: string;
  hash: string;
  sensitivity: string;
  createdAt: Date;
  state: string;
}
export function publicRecord(row: DocumentRow) {
  const { state: _, ...record } = row;
  return {
    ...record,
    size: Number(row.size),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}
export function sensitivity(value: unknown) {
  if (typeof value !== "string" || !SENSITIVITIES.includes(value))
    throw new HttpException("Sensibilidad inválida.", 400);
  return value;
}
@Injectable()
export class DocumentsService implements OnModuleInit, OnApplicationShutdown {
  readonly preview = new DocxPreview();
  constructor(
    @Inject(DataSource) readonly db: DataSource,
    @Inject(DiskStorage) readonly storage: DiskStorage,
  ) {}
  async onApplicationShutdown() {
    if (this.db.isInitialized) await this.db.destroy();
  }
  async onModuleInit() {
    await this.storage.initialize();
    const rows: DocumentRow[] = await this.db.query(
      "SELECT * FROM documents WHERE state != $1",
      ["ready"],
    );
    for (const row of rows) {
      if (row.state === "deleting") {
        await this.storage.remove(row.id);
        await this.storage.remove(row.id, true);
        await this.db.query("DELETE FROM documents WHERE id=$1", [row.id]);
        continue;
      }
      let exists = false;
      try {
        const handle = await open(this.storage.location(row.id), "r");
        await handle.close();
        exists = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (exists)
        await this.db.query("UPDATE documents SET state=$2 WHERE id=$1", [
          row.id,
          "ready",
        ]);
      else {
        await this.storage.remove(row.id, true);
        await this.db.query("DELETE FROM documents WHERE id=$1", [row.id]);
      }
    }
    for (const id of await this.storage.stagedIds())
      await this.storage.remove(id, true);
  }
  async get(id: string) {
    if (!UUID.test(id)) throw new HttpException("Identificador inválido.", 400);
    const [row] = await this.db.query(
      "SELECT * FROM documents WHERE id=$1 AND state=$2",
      [id, "ready"],
    );
    if (!row) throw new HttpException("Documento no encontrado.", 404);
    return row as DocumentRow;
  }
  async list(page: number, limit: number) {
    const items = await this.db.query(
      'SELECT * FROM documents WHERE state=$1 ORDER BY "createdAt" DESC,id DESC LIMIT $2 OFFSET $3',
      ["ready", limit, (page - 1) * limit],
    );
    const [{ total }] = await this.db.query(
      "SELECT count(*) AS total FROM documents WHERE state=$1",
      ["ready"],
    );
    return {
      items: items.map(publicRecord),
      total: Number(total),
      page,
      limit,
    };
  }
  async create(file: Express.Multer.File, value: unknown) {
    let inserted = false;
    try {
      const level = sensitivity(value ?? "unknown");
      const metadata = await this.storage.validate(file);
      const hash = (file as Express.Multer.File & { hash: string }).hash;
      let rows: DocumentRow[];
      try {
        rows = await this.db.query(
          'INSERT INTO documents(id,name,size,"mimeType",kind,extension,hash,sensitivity,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
          [
            file.filename,
            file.originalname,
            file.size,
            metadata.mimeType,
            metadata.kind,
            metadata.extension,
            hash,
            level,
            "pending",
          ],
        );
        inserted = true;
      } catch (error) {
        if ((error as { code?: string }).code === "23505") {
          const [existing] = await this.db.query(
            "SELECT id FROM documents WHERE hash=$1",
            [hash],
          );
          throw new HttpException(
            {
              message: "El documento ya está en la biblioteca.",
              documentId: existing?.id,
            },
            409,
          );
        }
        throw error;
      }
      await this.storage.publish(file.filename);
      await this.db.query("UPDATE documents SET state=$2 WHERE id=$1", [
        file.filename,
        "ready",
      ]);
      return publicRecord(rows[0]);
    } catch (error) {
      await this.storage.remove(file.filename, true);
      // Once inserted, keep the recoverable pending row and original together.
      if (!inserted) await this.storage.remove(file.filename);
      throw error;
    }
  }
  async update(id: string, value: unknown) {
    await this.get(id);
    const [rows] = await this.db.query(
      "UPDATE documents SET sensitivity=$2 WHERE id=$1 AND state=$3 RETURNING *",
      [id, sensitivity(value), "ready"],
    );
    const row = rows[0];
    if (!row) throw new HttpException("Documento no encontrado.", 404);
    return publicRecord(row);
  }
  async delete(id: string) {
    await this.get(id);
    await this.db.query("UPDATE documents SET state=$2 WHERE id=$1", [
      id,
      "deleting",
    ]);
    await this.storage.remove(id);
    await this.db.query("DELETE FROM documents WHERE id=$1", [id]);
  }
}
