# DocuExtractoChat

Fase 2: biblioteca personal local con React, TypeScript, Vite, NestJS y PostgreSQL. Puedes seleccionar un archivo, revisarlo y **guardarlo explícitamente** para recuperarlo tras recargar o reiniciar. No hay OCR, chat, embeddings, anonimización ni llamadas a proveedores todavía.

## Docker: distribución local

Requisitos: Docker con BuildKit, Compose y contenedores Linux. En Windows, iniciar Docker Desktop. Node y PostgreSQL no necesitan instalarse en el equipo destino.

1. Copiar `.env.example` a `.env` y reemplazar ambos valores con contraseñas aleatorias distintas. Usar letras/números para evitar problemas de codificación en las URLs. `.env` está excluido de Git y de la imagen. La instalación preparada en este proyecto ya tiene contraseñas generadas aleatoriamente.
2. Construir e iniciar:

```sh
docker compose up --build -d --remove-orphans
docker compose ps
```

Abrir <http://127.0.0.1:8080>. NestJS sirve la interfaz compilada y la API. PostgreSQL no publica un puerto en la distribución habitual. `migrate` se ejecuta una vez antes de iniciar la aplicación; es normal que termine con código 0.

Los originales y PostgreSQL usan volúmenes locales separados. La aplicación corre como usuario sin privilegios de sistema y con un rol de base que puede operar registros, sin permisos de administrador ni creación de tablas. Cada servicio persistente tiene un límite de 512 MiB; la migración temporal tiene 256 MiB. Estos límites excluyen navegador y Docker Desktop/WSL.

```sh
docker compose logs --tail 40 app migrate
docker compose stop
docker compose up --no-build -d
docker compose down
```

`stop` y `down` conservan los volúmenes. Para conservar la biblioteca, **no añadir `-v`**. Cambiar las contraseñas del archivo de configuración no cambia automáticamente las de una base existente: debe hacerse una rotación deliberada, conservando los datos.

### Compose antiguo en Windows

Compose 2.24.3 puede fallar al construir con `changes out of order`, un [problema registrado en Docker Compose](https://github.com/docker/compose/issues/11421). En este equipo se comprobó la alternativa:

```sh
docker --context desktop-linux build -t docuextractochat-app:0.2.0 -f apps/api/Dockerfile .
docker --context desktop-linux compose up --no-build -d --remove-orphans
```

En otros equipos, utilizar el contexto de Docker correspondiente. El servicio Nginx temporal de fase 1 ha sido sustituido por NestJS.

## Desarrollo nativo en Windows

Requisitos: Node 24.20 o posterior de la rama 24, npm y Docker para PostgreSQL. La configuración de desarrollo publica PostgreSQL **solo en 127.0.0.1:5433**.

```powershell
npm ci
docker --context desktop-linux compose -f compose.yaml -f compose.dev.yaml up -d db
. ./scripts/local-env.ps1
npm run build
# La migración usa el rol propietario, no el rol de la aplicación.
$appDatabaseUrl = $env:DATABASE_URL
$env:DATABASE_URL = $env:DATABASE_TEST_URL
npm run migrate
$env:DATABASE_URL = $appDatabaseUrl
npm run dev:api
```

En otra terminal, `npm run dev` abre Vite en <http://127.0.0.1:5173>, con `/api` conectado al servicio local de NestJS en el puerto 3000. `npm run preview` sirve la interfaz compilada en el puerto 4173 y utiliza el mismo proxy.

El comando de API compila al iniciar y observa la salida compilada. Después de editar TypeScript, ejecutar `npm run build --workspace @docuextractochat/api` en otra terminal para recompilar y activar el reinicio. La ejecución nativa guarda originales en `data/documents`; Docker utiliza su propio volumen y no comparte esos archivos de desarrollo.

Para volver a distribución sin puerto de base publicado, detener primero la API nativa y ejecutar Compose usando solo `compose.yaml`.

## Pruebas

Con PostgreSQL de desarrollo y API nativa disponibles según las instrucciones anteriores:

```powershell
. ./scripts/local-env.ps1
npx playwright install chromium
npm run check
```

`check` verifica tipos, compila React/NestJS, ejecuta Jest/Supertest contra PostgreSQL real y prueba la interfaz con Playwright. La API de pruebas usa un esquema desechable único y archivos sintéticos; nunca trunca la biblioteca. Playwright abre y cierra su servidor Vite de producción. Las pruebas de biblioteca guardan documentos sintéticos únicos y eliminan únicamente sus propios identificadores.

Sobre la aplicación Docker iniciada:

```powershell
$env:PREVIEW_BASE_URL = 'http://127.0.0.1:8080'
npm test
Remove-Item Env:PREVIEW_BASE_URL
```

La prueba explícita de persistencia recrea solo app y db de este proyecto, conserva sus volúmenes y elimina su propio archivo sintético:

```powershell
node scripts/verify-persistence.mjs
```

Informes generados: `playwright-report/` y `test-results/report.json`. Capturas en `.impeccable/review/`. Todo está excluido de Git. Los errores de red de biblioteca conservan la previsualización local y permiten reintentar.

## Formatos y recursos

- PDF: visor nativo y apertura alternativa; su funcionamiento depende del navegador.
- PNG/JPEG: vista de imagen. La vista local limita a 40 megapíxeles; el renderizado de originales guardados pertenece al navegador.
- TXT/Markdown: texto literal UTF-8, sin HTML ejecutable. Lectura y vista limitada al primer 1 MiB; textos grandes se recorren en partes de 32.768 caracteres. Descargar un documento guardado recupera el original completo.
- DOCX: guardar primero, luego convertir localmente texto y tablas bajo demanda. La vista no reproduce la paginación de Word ni muestra sus imágenes. ZIP expandido limitado a 20 MiB y 1.000 entradas; conversión única con timeout de 20 s y heap de trabajador de 64 MiB. Vista limitada a 5.000 nodos, profundidad 50, 1 MiB de caracteres totales y 32.768 por nodo de texto, con aviso explícito si es parcial. Descargar conserva el original completo.
- Hasta 50 MiB por archivo, sin copiar toda la carga a un buffer del servidor. Dos cargas simultáneas como máximo; una conversión DOCX a la vez. Un exceso produce un error recuperable.
- SHA-256 identifica duplicados; una segunda carga no sobrescribe el documento ni su sensibilidad. El nombre original es metadato, nunca una ruta de almacenamiento.
- «Sin clasificar», «Sensible» y «No sensible» son declaraciones locales; **ninguna autoriza salida a proveedores**. No se ha implementado todavía revisión de privacidad.

La extensión y MIME enviados por el navegador no se consideran suficientes: el servidor verifica firmas, estructura DOCX y texto UTF-8. Esto no sustituye un antivirus ni garantiza que cualquier PDF/imagen se pueda representar. El número de páginas se inspeccionará en una fase posterior.

## Documentación e historial

[Requisitos](doc/PRD.md), [arquitectura](doc/ARQUITEC.md), [fases](doc/FASES.md), [plan de fase 2](doc/FASE-02-TAREAS.md) y [resultados de fase 2](doc/FASE-02-RESULTADOS.md).

Commits semánticos en inglés, una rama por fase y ninguna publicación remota. Secretos, documentos reales, datos de PostgreSQL, modelos y artefactos de construcción/prueba están excluidos. No incluir muestras privadas en `public/`, `src/` ni fixtures: esos archivos forman parte del código distribuido.

La fase 3 necesita nueva aprobación del usuario.
