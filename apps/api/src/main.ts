import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  INestApplication,
} from "@nestjs/common";
import express, { Request, Response, NextFunction } from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { AppModule, PROJECT_ROOT } from "./app.module";

@Catch()
class PublicErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return res.destroy();
    if (error instanceof HttpException)
      return res
        .status(error.getStatus())
        .json(
          typeof error.getResponse() === "string"
            ? { message: error.getResponse() }
            : error.getResponse(),
        );
    const code = (error as { code?: string }).code;
    if (code?.startsWith("LIMIT_"))
      return res.status(code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        message:
          code === "LIMIT_FILE_SIZE"
            ? "El archivo supera 50 MiB."
            : "Carga inválida: utiliza un único archivo.",
      });
    if ((error as { type?: string }).type === "entity.too.large")
      return res
        .status(413)
        .json({ message: "La solicitud supera el límite permitido." });
    if ((error as { type?: string }).type === "entity.parse.failed")
      return res.status(400).json({ message: "JSON inválido." });
    return res.status(503).json({
      message: "No se pudo completar la operación local. Inténtalo de nuevo.",
    });
  }
}
function localUrl(value: string, origin = false) {
  try {
    const url = new URL(origin ? value : `http://${value}`);
    return (
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      (!origin || url.pathname === "/") &&
      ["3000", "4173", "5173", "8080", process.env.PORT ?? "3000"].includes(
        url.port || "80",
      )
    );
  } catch {
    return false;
  }
}
export async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: process.env.NODE_ENV === "test" ? false : ["error", "warn", "log"],
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!localUrl(req.headers.host ?? ""))
      return res.status(403).json({ message: "Host local requerido." });
    const origin = req.headers.origin;
    if (origin && !localUrl(origin, true))
      return res.status(403).json({ message: "Origen local requerido." });
    if (
      ["POST", "PATCH", "DELETE", "PUT"].includes(req.method) &&
      (req.headers["sec-fetch-site"] === "cross-site" ||
        (!origin && req.headers["sec-fetch-site"] !== undefined))
    )
      return res.status(403).json({ message: "Solicitud local requerida." });
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PATCH,DELETE,OPTIONS",
      );
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: "4kb", strict: true }));
  app.useGlobalFilters(new PublicErrors());
  const web = path.resolve(
    process.env.WEB_DIST_DIR ?? path.join(PROJECT_ROOT, "apps/web/dist"),
  );
  if (existsSync(web)) {
    app.use(express.static(web, { index: false }));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (
        req.method === "GET" &&
        !req.path.startsWith("/api/") &&
        !path.extname(req.path)
      )
        return res.sendFile(path.join(web, "index.html"));
      next();
    });
  }
  await app.init();
  return app;
}
async function main() {
  const app = await createApplication();
  app.enableShutdownHooks();
  await app.listen(
    Number(process.env.PORT ?? 3000),
    process.env.HOST ?? "127.0.0.1",
  );
}
if (require.main === module)
  main().catch(() => {
    console.error(
      "Application startup failed. Check database migrations and local storage.",
    );
    process.exitCode = 1;
  });
