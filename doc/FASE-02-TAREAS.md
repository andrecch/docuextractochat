# Biblioteca local — Plan de implementación de fase 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** guardar documentos localmente y recuperarlos después de recargar o reiniciar, con NestJS, PostgreSQL y una biblioteca operativa.

**Architecture:** NestJS sirve React compilado y una API `/api`. TypeORM administra exclusivamente migraciones y registros; originales permanecen en un volumen local, con nombres internos UUID. Las cargas se escriben en disco sin buffers completos, y las conversiones DOCX se ejecutan bajo demanda, con límites y sin acceso externo.

**Tech Stack:** Node 24, NestJS 12, TypeScript, React/Vite existentes, TypeORM 0.3.31, PostgreSQL 17.11, Mammoth, saneamiento HTML, Jest/Supertest y Playwright. Versiones exactas y lockfile en cada paquete.

Estado: autorizada el 2026-10-09. Rama: `feat/phase-02-document-library`. Esta fase no autoriza extracción, OCR, modelos, chat ni pgvector; esos subsistemas se incorporan después.

## Contrato de biblioteca

```ts
type Sensitivity = 'unknown' | 'sensitive' | 'non-sensitive';
type DocumentRecord = {
  id: string; name: string; size: number; mimeType: string;
  kind: 'pdf' | 'image' | 'text' | 'docx'; extension: string;
  hash: string; sensitivity: Sensitivity; createdAt: string;
};
// GET /api/documents?page=1&limit=20 => {items, total, page, limit}
// POST /api/documents multipart: file, sensitivity => 201 DocumentRecord
// Duplicate => 409 {message, documentId}, no replacement or sensitivity change
// GET /api/documents/:id/file => original, inline safe MIME
// GET /api/documents/:id/download => attachment
// GET /api/documents/:id/preview => DOCX {html, warnings}
// PATCH /api/documents/:id/sensitivity JSON {sensitivity} => DocumentRecord
// DELETE /api/documents/:id => 204; record and local original removed
// GET /api/health => 200 only when database and storage work
```

La sensibilidad es una declaración del usuario; nunca representa aprobación para envío a proveedores. Los identificadores se validan como UUID y las rutas nunca se construyen con nombres originales.

## Tarea 1 — API, migración y almacenamiento

Archivos: `apps/api/package.json`, `tsconfig.json`, `src/main.ts`, `src/app.module.ts`, `src/database/*`, `src/documents/*`, `test/*`, configuración Jest; modificar scripts de la raíz y lockfile.

- [ ] Crear paquete NestJS y configuración TypeScript con decoradores; instalar versiones fijadas. `npm run build --workspace @docuextractochat/api` debe compilar.
- [ ] Definir el esquema por migración TypeORM: UUID, hash único, metadatos, sensibilidad y estado interno de escritura/eliminación. `synchronize: false`; ejecutar migración en tarea separada. Probar tabla nueva y segunda ejecución sin cambios.
- [ ] Escribir pruebas Supertest de carga/listado/descarga/duplicado/eliminación con PostgreSQL real de pruebas y archivos sintéticos. La carga debe escribir a disco, calcular SHA-256 por stream, validar 50 MiB/archivo vacío/formato/firmas y texto UTF-8, y limpiar archivos temporales al rechazar.
- [ ] Implementar nombres UUID, límite de concurrencia de cargas y recuperación local al reiniciar para no publicar filas incompletas ni conservar originales huérfanos de operaciones fallidas. Probar cargas concurrentes idénticas y eliminación concurrente con lectura.
- [ ] Restringir API al equipo: origen/Host permitidos, rutas UUID, límite de cuerpo/partes, errores legibles sin rutas internas. Probar peticiones de origen ajeno, identificador inválido y archivo inválido.
- [ ] Confirmar: `feat(api): add persistent local document library`.

Prueba mínima de contrato que debe fallar antes de implementar:

```ts
const created = await request(app).post('/api/documents')
  .field('sensitivity', 'sensitive')
  .attach('file', Buffer.from('Factura sintética'), 'factura.txt').expect(201);
const listing = await request(app).get('/api/documents?page=1&limit=20').expect(200);
expect(listing.body.items.some((item: {id: string}) => item.id === created.body.id)).toBe(true);
await request(app).get(`/api/documents/${created.body.id}/download`).expect(200);
await request(app).delete(`/api/documents/${created.body.id}`).expect(204);
await request(app).get(`/api/documents/${created.body.id}/file`).expect(404);
```

## Tarea 2 — DOCX local y saneado

Archivos: `apps/api/src/documents/docx*`, validación ZIP, controlador/servicio y pruebas; `apps/web/src/features/file-preview/*`.

- [ ] Probar DOCX sintético con párrafos, tabla y vínculos peligrosos. Rechazar ZIP que no sea DOCX, cifrado, expansiones excesivas y archivos dañados.
- [ ] Validar estructura y presupuesto de archivo expandido antes de conversión. Convertir en trabajador aislado, bajo demanda, con concurrencia única y timeout; no descargar relaciones externas ni incluir imágenes incrustadas en la vista.
- [ ] Sanear salida con etiquetas de texto/tablas admitidas, sin scripts, eventos, iframes, imágenes o estilos externos. Mostrar advertencia de paginación diferente de Word. El original sigue disponible para descarga.
- [ ] Confirmar: `feat(docx): add bounded local document preview`.

## Tarea 3 — Interfaz de biblioteca

Archivos: `apps/web/src/features/library/*`, `App.tsx`, `styles.css`, configuración proxy Vite; pruebas `tests/library.spec.ts`, fixtures sintéticos.

- [ ] Conservar selección y vista previa de fase 1; añadir botón explícito «Guardar en biblioteca», declaración de sensibilidad y estado de guardado. Cancelar y errores mantienen el documento actual.
- [ ] Añadir listado paginado con abrir, descargar y eliminar mediante confirmación en la interfaz. Reutilizar componentes/colores actuales; mostrar carga, biblioteca vacía, error recuperable y duplicado con acción de abrir el existente.
- [ ] Abrir originales desde API local, liberar URLs y descartar respuestas antiguas; DOCX utiliza vista saneada bajo demanda después de guardar. No enviar archivos automáticamente a proveedores ni confundir almacenamiento con aprobación de salida.
- [ ] Probar recarga conserva biblioteca, sensibilidad, duplicados, eliminación, ausencia de solicitudes externas, errores y móvil.
- [ ] Confirmar: `feat(library): add document management interface`.

## Tarea 4 — Docker reproducible

Archivos: `apps/api/Dockerfile`, `compose.yaml`, `compose.dev.yaml`, `.env.example`, `.dockerignore`, README y scripts.

- [ ] Sustituir Nginx por servicio `app` con React compilado y NestJS; añadir PostgreSQL sin puerto publicado, volúmenes separados de archivos y base, migración de una sola ejecución y healthchecks.
- [ ] Limitar `app` y `db` a 512 MiB cada uno. Usar imagen Node de producción sin dependencias de desarrollo; archivos fuera de la imagen, configuración sin secretos reales y usuario de aplicación con permisos mínimos disponibles.
- [ ] Construir desde fuente versionada, instalar por lockfile, iniciar migración antes de servir. Probar reiniciar/recrear sin borrar volúmenes: listado y bytes del original se conservan.
- [ ] Documentar desarrollo nativo con PostgreSQL de Docker, comandos de migración y parada sin borrar datos. Probar configuración vacía y migración idempotente.
- [ ] Confirmar: `build(docker): deploy application and persistent database`.

## Tarea 5 — Cierre verificable

Archivos: `doc/FASE-02-RESULTADOS.md`, PRD, arquitectura, fases, README y registro de diseño de superficie.

- [ ] Ejecutar tipos, compilación, Jest/Supertest con PostgreSQL real y Playwright sobre distribución. Corregir fallos antes de integrar.
- [ ] Revisar escritorio/móvil y registrar recursos de contenedores en reposo y carga/conversión, separados de navegador/host. Documentar límites y entornos no comprobados.
- [ ] Revisar exclusiones de archivos privados, datos, configuración real y compilaciones; confirmar documentación con `docs(phase-02): record validation and operating instructions`.
- [ ] Integrar rama validada en `main` conservando commits y mostrar demostración; detenerse para revisión sin iniciar fase 3.

## Referencias verificadas

Documentación oficial de [carga/streaming NestJS](https://docs.nestjs.com/techniques/file-upload), [migraciones TypeORM](https://typeorm.io/docs/advanced-topics/migrations/) y [Mammoth](https://github.com/mwilliamson/mammoth.js). Context7 consultado para la API de carga. Las pruebas deben acreditar funcionamiento real, no adaptadores simulados de PostgreSQL.
