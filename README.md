# DocuExtractoChat

Fase 1: selecciona o arrastra **un archivo** y previsualízalo localmente. React, TypeScript y Vite. No hay API, OCR, chat, cuentas ni persistencia todavía. Los archivos no se suben ni se envían a proveedores.

## Desarrollo

Requisitos: Node.js 24.20 o posterior de la rama 24, npm y navegador actualizado.

```sh
npm ci
npm run dev
```

Abrir <http://127.0.0.1:5173>. Compilación y vista de producción:

```sh
npm run build
npm run preview
```

Abrir <http://127.0.0.1:4173>. Los servidores quedan ligados al equipo local. Las dependencias y fuentes requieren descarga inicial; las fuentes se sirven después desde la propia aplicación.

## Docker

Requisito: Docker con Compose y contenedores Linux; en Windows, Docker Desktop iniciado. No requiere Node ni Python instalados en el host.

```sh
docker compose up --build -d
docker compose ps
docker compose logs --tail 50
docker compose down
```

Abrir <http://127.0.0.1:8080>. Esta fase usa un servidor estático Nginx temporal, sin volúmenes ni archivos guardados. El contenedor tiene un límite inicial de 64 MiB y 0,5 CPU; no incluye el navegador ni Docker Desktop. NestJS sustituirá este servicio en la fase 2.

Si la instalación mantiene otro contexto Docker, seleccionar el correspondiente a contenedores Linux o usar `docker --context desktop-linux compose ...` en Windows. No ejecutar dos copias en el mismo puerto.

### Compose antiguo en Windows

Compose 2.24.3 puede fallar al construir con `changes out of order`, un [problema registrado en Docker Compose](https://github.com/docker/compose/issues/11421). Actualizar Compose corrige ese problema; sin actualizar el equipo, se puede construir directamente con Docker y luego ejecutar con Compose:

```sh
docker build -t docuextractochat-preview:0.1.0 -f apps/web/Dockerfile .
docker compose up --no-build -d
```

## Pruebas

```sh
npx playwright install chromium
npm run check
```

`check` comprueba tipos, construye producción y ejecuta recorridos de navegador. Playwright abre un servidor temporal de producción y lo cierra al terminar. Las pruebas crean archivos sintéticos, nunca usan documentos del usuario. El informe HTML se guarda en `playwright-report/`.

Para repetir los recorridos sobre Docker, primero iniciar el contenedor y configurar `PREVIEW_BASE_URL`:

```powershell
$env:PREVIEW_BASE_URL = 'http://127.0.0.1:8080'
npm test
Remove-Item Env:PREVIEW_BASE_URL
```

## Alcance y límites

- PDF: visor nativo y enlace de apertura alternativa. La disponibilidad del visor depende del navegador; un iframe cargado no demuestra por sí solo que todas las páginas se vean correctamente.
- PNG/JPEG: vista de imagen. Máximo 40 megapíxeles para limitar memoria de decodificación; reducir una imagen mayor antes de abrirla.
- TXT/Markdown: texto literal UTF-8; lectura de hasta 1 MiB, con aviso de vista parcial. Los textos grandes se recorren en partes de hasta 32.768 caracteres para evitar dibujar todo de golpe. Las líneas sin espacios pueden desplazarse horizontalmente dentro del visor. El enlace de apertura utiliza también la copia limitada a 1 MiB. No se ejecuta HTML.
- Hasta 50 MiB por archivo; la interfaz usa la etiqueta habitual «50 MB».
- DOCX, extracción y persistencia pertenecen a fases posteriores. No se inspecciona todavía el número de páginas.
- Un error conserva el archivo actual. Quitar/reemplazar revoca las URLs temporales. Recargar borra la selección.
- «Probar con un ejemplo» genera un TXT sintético en el navegador; no descarga contenido remoto.

## Documentación y Git

[Requisitos](doc/PRD.md), [arquitectura](doc/ARQUITEC.md), [fases](doc/FASES.md) y [tareas de fase 1](doc/FASE-01-TAREAS.md).

Commits semánticos en inglés y una rama por fase. No se han configurado remotos. Secretos, documentos del usuario, modelos y artefactos de prueba/construcción están excluidos del repositorio. No introducir muestras privadas en `public/` o `src/`, que forman parte de la distribución.

La fase 2 requiere nueva aprobación del usuario.
