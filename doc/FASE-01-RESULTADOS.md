# Fase 1 — Resultado y verificación

Fecha: 2026-10-09. Implementación autorizada expresamente por el usuario. Las fases siguientes no están autorizadas.

## Entrega

React, TypeScript y Vite en un workspace npm. Una página en español permite elegir o arrastrar un archivo PDF, PNG/JPEG, TXT o Markdown, inspeccionarlo, reemplazarlo y quitarlo. Cancelaciones y errores conservan la selección válida. Incluye un ejemplo sintético generado localmente y adaptación a escritorio/móvil.

No hay carga de documentos, API, persistencia, chat, OCR, anonimización ni proveedores. Los archivos permanecen en el navegador. Las fuentes se sirven localmente.

## Verificaciones realizadas

- `npm run check`: tipos y compilación de producción correctos; **12 pruebas de navegador aprobadas**, en 17,2 s en esta ejecución nativa.
- Las mismas **12 pruebas aprobadas sobre Docker**, en 14,3 s: selección, reemplazo, eliminación, cancelación, drag and drop, varios archivos, formatos inválidos, límite de tamaño, texto literal/parcial, imagen, iframe PDF y enlace alternativo, lecturas obsoletas, URLs temporales, ausencia de cargas/solicitudes externas durante el flujo, teclado y ancho móvil.
- PDF sintético comprobado visualmente en el visor nativo de Chromium completo. Esta comprobación acredita el documento de prueba, no todos los PDF ni todos los navegadores.
- Revisión visual independiente: `ship`, sin correcciones materiales para el prototipo solicitado. Capturas de escritorio, archivo seleccionado, móvil y PDF. El sistema visual construido queda registrado en `DESIGN.md`.
- Diez reemplazos de texto de 1 MiB y eliminación: prueba de memoria retenida aprobada. Diez reemplazos con instrumentación de URLs: una URL activa durante la selección y ninguna después de quitar el archivo.
- Docker multietapa construido **sin caché** desde una exportación limpia de Git, con instalación por lockfile y sin dependencias ni compilación del host. Compose funciona y el healthcheck responde correctamente. Imagen de producción con Nginx, sin runtimes de desarrollo ni documentos persistentes.

## Recursos medidos

Mediciones puntuales en este entorno Windows, con Chromium de pruebas. Son observaciones de esta entrega y no garantías para otros equipos o documentos.

| Medición | Resultado |
|---|---:|
| Servidor estático Docker en reposo | 9,59 MiB; CPU 0,00 % en la muestra |
| Límites del contenedor | 64 MiB; 0,5 CPU; 32 procesos |
| Selección del ejemplo a vista disponible | 15,2 ms |
| Heap JavaScript tras GC, antes de diez reemplazos grandes | 1.537.552 bytes |
| Heap tras reemplazos y eliminación, después de GC | 2.972.424 bytes |
| Diferencia retenida | 1.434.872 bytes; por debajo del umbral de prueba de 5 MiB |
| Suma de working sets de procesos Chromium, página vacía | 224.686.080 bytes, aproximadamente 214 MiB |
| Misma suma con el ejemplo seleccionado | 232.210.432 bytes, aproximadamente 221 MiB |
| JavaScript compilado | 231,88 kB; estimación gzip de Vite: 72,94 kB |
| CSS compilado | 10,66 kB; estimación gzip: 3,10 kB |
| Fuentes WOFF2 generadas, todos los subconjuntos | 53,01 kB |

La suma de working sets incluye páginas compartidas y procesos auxiliares del navegador; no equivale a memoria privada ni incluye Docker Desktop/WSL. La lectura de `performance.memory` está redondeada por Chromium y no se utiliza como medida precisa. El heap se midió por CDP con recolección forzada, separado del consumo completo del navegador. No se ha validado todavía el sistema RAG completo ni su funcionamiento simultáneo con otras aplicaciones en un equipo de 8 GB.

## Límites y corrección de rendimiento

- Máximo 50 MiB por archivo, mostrado como «50 MB». TXT/Markdown: lectura de hasta 1 MiB, no del archivo completo; el enlace alternativo usa esa misma copia limitada.
- Una prueba con líneas enormes detectó lentitud de renderizado. Se corrigió mostrando textos grandes en partes de hasta 32.768 caracteres, manteniendo pares Unicode y permitiendo desplazamiento horizontal de líneas sin espacios dentro del visor. Todos los fragmentos del texto leído son accesibles con Anterior/Siguiente.
- Las imágenes se rechazan por encima de 40 megapíxeles; su decodificación y el visor PDF pertenecen al navegador. No se promete un límite exacto de memoria para esos visores.
- DOCX, límite de páginas, biblioteca persistente y procesamiento documental corresponden a fases posteriores. Recargar elimina la selección.
- Docker Compose 2.24.3 instalado en Windows falló al construir con `changes out of order`. Se verificó la alternativa documentada: construcción directa con Docker y arranque con Compose `--no-build`. No se actualizó la instalación del usuario.

## Git y ejecución

Identidad configurada exclusivamente en este repositorio: `andrecmorach`, `andrescmrch@gmail.com`. Rama de trabajo: `feat/phase-01-file-preview`; historial conservado sin reescrituras ni remotos.

| Commit | Contenido |
|---|---|
| `4c4e17f` | `docs(project): record requirements and phased roadmap` |
| `b5506c1` | `feat(upload): add accessible local document preview` |
| `92a53de` | `test(upload): verify local preview flows and memory cleanup` |
| `21c6083` | `build(docker): package the local preview with resource limits` |

Los comandos de desarrollo, Docker, pruebas y parada están en [README.md](../README.md). Demostración local: <http://127.0.0.1:8080>. Los informes y capturas generados están excluidos de Git y pueden reproducirse con las pruebas.

Entrega detenida para revisión. La siguiente fase requiere aprobación independiente.
