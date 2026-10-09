import "reflect-metadata";
import { DataSource, MigrationInterface, QueryRunner } from "typeorm";

export class Library1791547200000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE documents (
      id uuid PRIMARY KEY, name text NOT NULL, size bigint NOT NULL CHECK(size > 0),
      "mimeType" text NOT NULL, kind text NOT NULL CHECK(kind IN ('pdf','image','text','docx')),
      extension text NOT NULL, hash char(64) NOT NULL UNIQUE,
      sensitivity text NOT NULL DEFAULT 'unknown' CHECK(sensitivity IN ('unknown','sensitive','non-sensitive')),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      state text NOT NULL CHECK(state IN ('pending','ready','deleting'))
    )`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query("DROP TABLE documents");
  }
}
export function createDataSource(
  url = process.env.DATABASE_URL,
  schema = process.env.DATABASE_SCHEMA,
): DataSource {
  if (!url) throw new Error("DATABASE_URL is required");
  if (schema && !/^[a-z][a-z0-9_]*$/.test(schema))
    throw new Error("Invalid database schema");
  return new DataSource({
    type: "postgres",
    url,
    schema,
    extra: {
      max: 5,
      ...(schema ? { options: `-c search_path=${schema}` } : {}),
    },
    synchronize: false,
    migrations: [Library1791547200000],
    migrationsRun: false,
  });
}
