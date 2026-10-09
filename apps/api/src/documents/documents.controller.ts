import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  Res,
  HttpException,
  HttpCode,
  Body,
} from "@nestjs/common";
import type { Request, Response } from "express";
import multer from "multer";
import { open } from "node:fs/promises";
import { DocumentsService } from "./documents.service";
import { MAX_SIZE } from "./storage";

@Controller("api")
export class DocumentsController {
  private uploads = 0;
  constructor(private readonly service: DocumentsService) {}
  @Get("health") async health() {
    try {
      await this.service.db.query("SELECT 1");
      const probe = this.service.storage.location(crypto.randomUUID(), true);
      const file = await open(probe, "wx");
      await file.close();
      await this.service.storage.remove(
        probe.split(/[\\/]/).pop()!.slice(0, -5),
        true,
      );
      return { status: "ok", database: "ok", storage: "ok" };
    } catch {
      throw new HttpException(
        "La base de datos o el almacenamiento no está disponible.",
        503,
      );
    }
  }
  @Get("documents") list(@Query("page") p = "1", @Query("limit") l = "20") {
    if (
      !/^\d+$/.test(p) ||
      !/^\d+$/.test(l) ||
      Number(p) < 1 ||
      Number(l) < 1 ||
      Number(l) > 50 ||
      !Number.isSafeInteger(Number(p)) ||
      !Number.isSafeInteger((Number(p) - 1) * Number(l))
    )
      throw new HttpException("Paginación inválida.", 400);
    return this.service.list(Number(p), Number(l));
  }
  @Post("documents") async create(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (this.uploads >= 2)
      throw new HttpException(
        "Hay otras cargas en proceso. Inténtalo de nuevo.",
        503,
      );
    this.uploads++;
    try {
      const upload = multer({
        storage: this.service.storage,
        preservePath: true,
        limits: {
          fileSize: MAX_SIZE,
          files: 1,
          fields: 1,
          parts: 2,
          fieldSize: 64,
          fieldNameSize: 32,
        },
      }).single("file");
      await new Promise<void>((resolve, reject) =>
        upload(req, res, (error) => (error ? reject(error) : resolve())),
      );
      if (!req.file) throw new HttpException("Selecciona un archivo.", 400);
      if (Object.keys(req.body ?? {}).some((key) => key !== "sensitivity")) {
        await this.service.storage.remove(req.file.filename, true);
        throw new HttpException("Campo de carga no admitido.", 400);
      }
      return await this.service.create(req.file, req.body?.sensitivity);
    } finally {
      this.uploads--;
    }
  }
  private async send(id: string, res: Response, attachment: boolean) {
    const row = await this.service.get(id);
    let handle;
    try {
      handle = await open(this.service.storage.location(id), "r");
    } catch {
      throw new HttpException("El original no está disponible.", 404);
    }
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("Content-Length", row.size);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader(
      "Content-Disposition",
      `${attachment ? "attachment" : "inline"}; filename="document.${row.extension}"; filename*=UTF-8''${encodeURIComponent(row.name).replace(/'/g, "%27")}`,
    );
    const stream = handle.createReadStream();
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  }
  @Get("documents/:id/file") file(
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.send(id, res, false);
  }
  @Get("documents/:id/download") download(
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.send(id, res, true);
  }
  @Get("documents/:id/preview") async preview(@Param("id") id: string) {
    const row = await this.service.get(id);
    if (row.kind !== "docx")
      throw new HttpException("La vista HTML está disponible para DOCX.", 422);
    return this.service.preview.convert(this.service.storage.location(id));
  }
  @Patch("documents/:id/sensitivity") update(
    @Param("id") id: string,
    @Body() body: { sensitivity?: unknown },
  ) {
    if (!body || Object.keys(body).some((key) => key !== "sensitivity"))
      throw new HttpException("Campo de sensibilidad no admitido.", 400);
    return this.service.update(id, body?.sensitivity);
  }
  @Delete("documents/:id") @HttpCode(204) delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
