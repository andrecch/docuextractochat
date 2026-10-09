import { Module } from "@nestjs/common";
import { DataSource } from "typeorm";
import path from "node:path";
import { createDataSource } from "./database/data-source";
import { DiskStorage } from "./documents/storage";
import { DocumentsService } from "./documents/documents.service";
import { DocumentsController } from "./documents/documents.controller";
export const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
@Module({
  controllers: [DocumentsController],
  providers: [
    {
      provide: DataSource,
      useFactory: async () => {
        const db = createDataSource();
        return db.initialize();
      },
    },
    {
      provide: DiskStorage,
      useFactory: () =>
        new DiskStorage(
          path.resolve(
            process.env.STORAGE_DIR ??
              path.join(PROJECT_ROOT, "data/documents"),
          ),
        ),
    },
    DocumentsService,
  ],
})
export class AppModule {}
