# Fase 2 — Biblioteca local: resultados

Fecha: 2026-10-09. Implementada tras autorización expresa del usuario. La fase 3 permanece pendiente de aprobación.

## Entrega

React permite seleccionar o arrastrar un documento, previsualizarlo y guardarlo mediante una acción explícita. NestJS conserva originales en almacenamiento local y metadatos en PostgreSQL. La biblioteca permite abrir, descargar, clasificar sensibilidad y eliminar con confirmación; SHA-256 evita duplicados. La selección sin guardar sigue siendo temporal.

PDF, PNG, JPEG, TXT y Markdown mantienen su vista previa. DOCX incorpora una conversión local de texto y tablas después de guardar, con saneamiento en servidor y cliente. No reproduce páginas ni imágenes de Word. Los límites parciales se avisan y la descarga recupera el original.

La sensibilidad es una declaración local, nunca permiso para enviar información. No se implementaron Python, cola, extracción documental, OCR, anonimización, proveedores, embeddings, pgvector ni chat.

## Verificación realizada

- Tipos y compilaciones de ambos paquetes correctos.
- Seis pruebas Jest/Supertest pasan con PostgreSQL real en un esquema desechable: ciclo de documentos, nombres UTF-8, concurrencia y duplicados, cargas y rutas inválidas, límite de tamaño, DOCX saneado/ZIP excesivo y recuperación tras interrupciones.
- Dieciséis pruebas Playwright pasan en producción nativa (26,2 s) y sobre Docker (21,3 s): doce de previsualización y cuatro de biblioteca, incluyendo móvil, persistencia tras recarga, sensibilidad, descarga, duplicado, eliminación, fallos recuperables, paginación, texto limitado y defensa DOCX.
- `scripts/verify-persistence.mjs` crea un TXT sintético, recrea app y base sin borrar volúmenes, verifica identificador/hash/sensibilidad/bytes y elimina su documento. Resultado correcto. La migración vuelve a ejecutarse sin alterar el esquema ya aplicado.
- La imagen se construyó desde una exportación limpia del código versionado usando lockfile. Se reutilizó caché Docker; no fue una construcción sin caché. La corrección final del metadato HTML también se compiló y reconstruyó.
- Auditoría npm completa y de producción: cero vulnerabilidades reportadas en esta comprobación. Versiones fijadas y lockfile conservados.
- Revisión visual de escritorio, móvil y PDF nativo: disposición `ship`, sin defectos materiales. Se conserva el escritorio azul de inspección, Public Sans y acciones cobalto. Detector mecánico sin hallazgos. Las capturas sintéticas e informes permanecen en carpetas ignoradas, no contienen documentos reales.

## Recursos medidos

Distribución de producción en Windows con Docker Desktop, contenedores Linux. Cada servicio persistente tiene límite de 512 MiB; la migración termina y no queda ejecutándose. CPU limitada a 0,75 para app y 0,5 para base.

| Muestra | App | PostgreSQL | Total aproximado |
| --- | ---: | ---: | ---: |
| Reposo antes del recorrido | 72,11 MiB | 25,23 MiB | 97,34 MiB |
| Durante carga TXT de 8 MiB | 72,11 MiB | 25,23 MiB | 97,34 MiB |
| Conversión DOCX de 4.000 párrafos | 74,59 MiB | 27,01 MiB | 101,60 MiB |
| Después de la conversión | 119,60 MiB | 22,36 MiB | 141,96 MiB |

Son muestras de `docker stats`, no máximos continuos: una operación breve puede terminar entre muestras. Otra medición en reposo tras recrear servicios dio aproximadamente 90 MiB. La CPU reportada depende del intervalo y no caracteriza por sí sola el pico de conversión.

En Chromium, la interacción de ejemplo fue de 13,9 ms. El heap JavaScript tras GC pasó de 1.657.044 a 3.094.148 bytes después de diez reemplazos grandes y eliminación; la URL de objeto activa volvió de una a cero. Este heap no representa la memoria total del navegador. No se midió el conjunto completo de procesos Chromium ni la sobrecarga Docker Desktop/WSL; no se garantiza todavía el desempeño global con otras aplicaciones en un equipo de 8 GB.

Bundle JavaScript: 243,04 kB (estimación gzip de Vite: 76,20 kB), CSS 13,92 kB (3,70 kB gzip), fuentes 53,01 kB. La estimación gzip no significa que NestJS comprima actualmente esas respuestas.

## Distribución y límites

Compose sirve la app en `http://127.0.0.1:8080`, con PostgreSQL sin puerto publicado en producción. Un rol de aplicación separado del dueño usa permisos limitados. Los volúmenes de originales y base persisten; secretos reales quedan en `.env` ignorado. El contenedor app usa usuario no privilegiado, filesystem de imagen de solo lectura y almacenamiento separado.

Cargas en stream: 50 MiB máximo, dos simultáneas. Biblioteca paginada de 20 filas. Texto: primer 1 MiB, bloques visuales de 32.768 caracteres. DOCX: 20 MiB expandidos, 1.000 entradas ZIP, una conversión, 20 segundos y heap del trabajador de 64 MiB; vista con límites de nodos/profundidad/caracteres y aviso parcial. No hay inspección del número de páginas todavía.

Las pruebas usan documentos sintéticos. No se validaron archivos representativos del usuario ni otro equipo Linux. Las firmas PDF/imagen no equivalen a validación integral o antivirus. El visor PDF depende del navegador. El almacenamiento de esta entrega es local y no aplica todavía cifrado o seudonimización.

Docker Compose antiguo en este equipo mostró un problema al construir: se usó la construcción directa de Docker y luego Compose para iniciar. README incluye ese procedimiento alternativo. No se modificó la configuración global de Docker.

## Historial y siguiente fase

Rama `feat/phase-02-document-library`, integrada conservando commits en `main` al cierre:

- `e1953bf docs(phase-02): define persistent library implementation plan`
- `a3bac9d feat(api): add persistent library and bounded DOCX previews`
- `b36bc78 feat(library): add local document management interface`
- `a59a7c9 build(docker): deploy application and persistent database`
- Cierre documental: `docs(phase-02): record validation and operating instructions`.

No hay remoto ni publicación. La próxima fase será la cola persistente y extracción textual con Python, sin OCR todavía. Requiere nueva aprobación; esta entrega se detiene aquí.
