# Desarrollo incremental de DocuExtractoChat

Fecha: 2026-10-09  
Estado: planificación documentada. Ninguna fase de implementación está autorizada todavía.

**Objetivo:** desarrollar y comprobar el sistema en entregas pequeñas, conservando una aplicación utilizable y un historial Git claro después de cada fase.

**Arquitectura:** React y TypeScript para la interfaz; NestJS y TypeScript como única API; un trabajador Python para procesamiento documental; PostgreSQL con pgvector como persistencia y cola. Incorporar componentes solo cuando la fase los necesite.

**Distribución:** Docker Compose desde la primera entrega. Contenerizar cada componente cuando aparece, mantener volúmenes locales y comprobar la ejecución reproducible al cerrar cada fase. La interfaz compilada se integra en NestJS desde la fase 2; no mantener un servidor web adicional en la distribución final.

**Prioridad de recursos:** el perfil económico debe permitir usar el equipo para otras tareas. Verificar memoria, CPU y capacidad de respuesta sin sacrificar integridad de extracción ni cobertura. Los presupuestos se definen en ARQUITEC.md como objetivos de validación, no como garantías ya medidas.

**Documentos de referencia:** [PRD.md](PRD.md) define requisitos; [ARQUITEC.md](ARQUITEC.md) define arquitectura. Este documento define el orden, los límites y las condiciones para avanzar. No sustituye esas especificaciones.

## 1. Reglas de ejecución y revisión

- Ejecutar una fase por vez. No iniciar la siguiente automáticamente.
- Antes de cada fase, concretar su lista de tareas y pruebas, usando la skill `executing-plans` al ejecutar. No introducir funciones de fases futuras para completar una entrega actual.
- Implementar en pequeños cambios verificables, con commits frecuentes que agrupen una intención coherente.
- Cada fase debe entregar una demostración utilizable, verificaciones reproducibles y documentación de cómo ejecutarla.
- Ejecutar las pruebas relevantes y corregir los fallos introducidos antes del cierre. No prometer ausencia de defectos: estos controles reducen el riesgo y permiten localizar y revertir cambios.
- No confundir proveedores simulados con integraciones reales. Explicar qué se comprobó localmente y qué requiere cuentas, cuotas o archivos representativos.
- Al cerrar, informar qué cambió, cómo probarlo, resultados, limitaciones y commits. Detenerse y solicitar la aprobación del usuario para la siguiente fase.
- Una aprobación autoriza únicamente la fase indicada. Una demostración o cierre incompleto no autoriza adelantar tareas posteriores.
- En cada cierre, comprobar Compose, healthchecks de los servicios disponibles, persistencia y exclusión de datos sensibles de las imágenes. Registrar recursos en reposo y durante el recorrido principal.
- Medir la distribución de producción; separar resultados de desarrollo, compilación, navegador y sobrecarga de Docker Desktop/WSL. Si se supera el presupuesto, resolverlo o acordar un cambio explícito antes de declarar validada la fase.

## 2. Git desde el comienzo

Git se inicializará como primera actividad de la fase 1, después de la aprobación del usuario. Esta actualización documental no inicializa Git ni crea commits todavía.

### Política

- Repositorio local con rama principal `main`.
- Primer commit: documentación existente revisada y reglas de exclusión.
- Crear una rama por fase con nombres en inglés, por ejemplo `feat/phase-01-file-preview`.
- Mantener `main` como última entrega validada. Integrar cada fase al superar sus criterios de cierre, conservando los commits individuales.
- La entrega inicial documental se confirma antes de escribir código de la fase 1.
- No crear remotos, publicar código ni hacer push hasta que el usuario indique el destino y lo autorice.
- Verificar la identidad Git existente. No inventar nombre o correo ni modificar configuración global; si falta, resolverla con el usuario al iniciar la fase.
- Revisar el diff y agregar archivos explícitamente antes de confirmar cambios. No incluir cambios ajenos a la fase.
- Excluir claves, `.env` reales, archivos cargados, correspondencias sensibles, datos de PostgreSQL, modelos descargados, dependencias, entornos virtuales y artefactos de construcción. Versionar ejemplos de configuración sin secretos y fixtures sintéticos.
- No reescribir historial compartido ni usar operaciones destructivas para corregir una fase; preferir commits de corrección o reversión explícita.

### Commits semánticos en inglés

Formato: `type(scope): imperative description`.

Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build` y `ci`. Los mensajes y sus cuerpos estarán en inglés; la documentación de producto puede permanecer en español.

Ejemplos previstos:

```text
docs(project): record product requirements and phased roadmap
chore(web): initialize React and TypeScript workspace
feat(upload): add file selection and drag-and-drop preview
test(upload): cover file replacement and invalid selections
fix(preview): release object URLs when replacing files
feat(api): persist uploaded documents locally
feat(privacy): restore approved entity names locally
build(docker): containerize the local preview application
build(api): package the application and database with Compose
```

Estos son ejemplos de hitos, no una obligación de producir un commit por archivo ni mensajes que afirmen verificaciones no realizadas.

## 3. Fase 1 — Inicialización y previsualización local

**Resultado visible:** una página sencilla donde seleccionar un archivo o arrastrarlo a una zona de carga y verlo en pantalla.

### Tareas

- [ ] Inicializar Git, configurar `main`, crear exclusiones y confirmar la documentación inicial.
- [ ] Crear un workspace npm con la aplicación `apps/web` en React, TypeScript y Vite; incluir lockfile, scripts de desarrollo, compilación y comprobación de tipos.
- [ ] Documentar requisitos y comandos de ejecución en el README de la raíz. No inicializar NestJS, Python, PostgreSQL ni proveedores en esta fase.
- [ ] Añadir Dockerfile por etapas y `.dockerignore` para compilar React y servir la previsualización con Nginx; crear Compose solo con ese servicio temporal. Documentar ejecución nativa para desarrollar y Docker para demostrar la entrega.
- [ ] Crear una única página con selección accesible por botón y teclado, zona de drag and drop y estado visual al arrastrar.
- [ ] Aceptar un archivo por selección. Si se arrastran varios, mostrar un error y conservar el archivo actual, sin elegir uno silenciosamente.
- [ ] Mostrar nombre, tamaño y tipo; permitir quitar o reemplazar el archivo. Cancelar el selector conserva la selección anterior.
- [ ] Validar formatos de esta fase y el límite de 50 MB antes de preparar la vista. Una selección rechazada conserva la vista anterior.
- [ ] Mostrar PDF en el visor nativo del navegador mediante una URL local de objeto. Si el navegador no puede mostrarlo, ofrecer abrir el archivo local y explicar la limitación.
- [ ] Mostrar PNG/JPEG como imagen ajustada al espacio disponible y TXT/Markdown como texto literal, sin ejecutar HTML. Para texto, mostrar como máximo el primer 1 MiB y advertir cuando se trate de una vista parcial.
- [ ] Liberar URLs de objeto al reemplazar o quitar el archivo y al desmontar el visor; evitar que lecturas asíncronas anteriores sustituyan una selección más reciente.
- [ ] Mostrar errores legibles ante archivo vacío, formato no admitido, exceso de tamaño o fallo de lectura/renderizado.
- [ ] Verificar selección, reemplazo, eliminación, drag and drop, accesibilidad básica y adaptación a pantallas pequeñas.
- [ ] Comprobar la compilación de producción, tamaño del frontend, respuesta de las acciones y memoria tras reemplazar diez archivos. Leer TXT/Markdown mediante un segmento de hasta 1 MiB, sin cargar antes el archivo completo.
- [ ] Ejecutar compilación, comprobación de tipos y pruebas relevantes; registrar commits y presentar la demostración.

### Límites

- Todo ocurre en el navegador: no subir archivos ni enviar contenido a APIs.
- DOCX se incorpora en la fase 2; en esta fase su selección muestra un mensaje claro de formato todavía no admitido.
- La vista de PDF/imagen no es extracción ni OCR. Markdown se muestra como texto, no como HTML renderizado.
- No aplicar aún el límite de 200 páginas: se verificará cuando exista inspección documental.
- No guardar selecciones tras recargar, ni incluir chat, embeddings o anonimización todavía.

### Cierre y verificación

- Un PDF, una imagen, un TXT y un Markdown sintéticos se previsualizan sin salir del equipo.
- El mismo archivo puede seleccionarse de nuevo después de quitarlo; reemplazarlo cambia correctamente la vista.
- Los errores no destruyen la selección válida anterior ni bloquean la página.
- Una prueba verifica que el flujo no realiza solicitudes de carga o a proveedores externos.
- Compilación y tipos pasan; no hay errores de consola en los recorridos válidos.
- Incluir una demostración manual de PDF en un navegador compatible, porque el visor nativo no tiene una representación uniforme en pruebas automatizadas.
- La imagen se construye desde un checkout limpio, Compose sirve la página y el contenedor no necesita documentos persistentes. Medir por separado memoria del servidor estático y navegador; verificar que no hay crecimiento sostenido después de quitar archivos.

**Commit de entrega orientativo:** `feat(upload): add local file preview`.

## 4. Fase 2 — NestJS, persistencia y biblioteca básica

**Resultado visible:** los archivos aprobados para carga se guardan localmente y aparecen en una biblioteca después de recargar.

- [ ] Inicializar `apps/api` con NestJS y TypeScript; servir la API local y configurar la conexión de desarrollo con React.
- [ ] Incorporar PostgreSQL en Docker, TypeORM y migraciones como única fuente del esquema.
- [ ] Contenerizar NestJS por etapas con la interfaz React compilada; sustituir el servicio temporal Nginx. Compose incorpora `app`, PostgreSQL y la tarea única de migración, healthchecks y volúmenes persistentes.
- [ ] No publicar el puerto de PostgreSQL en la distribución habitual. Configurar exclusiones, permisos locales, configuración sin secretos y los presupuestos iniciales de 512 MiB por servicio `app`/`db`.
- [ ] Implementar carga, listado, metadatos, hash de duplicados, descarga/visualización y eliminación, con archivos en almacenamiento local y rutas internas controladas.
- [ ] Validar formatos y tamaño en el servidor, sin confiar solo en la extensión o en la validación del navegador.
- [ ] Incorporar DOCX: vista local de texto y tablas convertidos, con contenido saneado y advertencia de que no reproduce fielmente la paginación de Word. No afirmar equivalencia visual con el original.
- [ ] Incorporar declaración de sensibilidad; archivos cargados todavía no se consideran aprobados para envío a proveedores.
- [ ] Guardar documentación de inicio/parada y probar migraciones desde una base vacía, duplicados, eliminación y persistencia tras reiniciar.

**Límite:** todavía no OCR, LLM, embeddings ni chat.

**Cierre:** un archivo cargado vuelve a estar disponible tras reiniciar; formatos inválidos y rutas no autorizadas son rechazados; eliminar retira archivo y registro.

**Verificación Docker/rendimiento:** recrear contenedores sin borrar volúmenes conserva la biblioteca; una base nueva aplica migraciones antes del arranque funcional. La conversión DOCX se carga bajo demanda, los listados se paginan y la carga no obliga a copiar un archivo completo varias veces en memoria.

**Commit orientativo:** `feat(library): persist and manage local documents`.

## 5. Fase 3 — Cola y extracción textual con Python

**Resultado visible:** seleccionar un documento de la biblioteca muestra su texto, estructura básica y progreso real de procesamiento.

- [ ] Crear `workers/documents` en Python y contratos JSON versionados entre TypeScript y Python.
- [ ] Crear su imagen CPU-only e incorporar `worker` a Compose con acceso limitado a PostgreSQL y al volumen de artefactos. El trabajador no tiene claves externas ni puerto HTTP publicado.
- [ ] Incorporar caché persistente de modelos, heartbeats y cierre ordenado. Configurar 3 GiB para el contenedor Python y validar el presupuesto agregado de 4 GiB de los tres servicios.
- [ ] Implementar trabajos persistentes PostgreSQL, reclamación exclusiva, leases, checkpoints, cancelación y recuperación tras reinicio.
- [ ] Extraer PDF con texto, DOCX, TXT y Markdown; conservar bloques ordenados, páginas o secciones y tablas disponibles sin añadir OCR todavía.
- [ ] Aplicar el límite de páginas a PDF; DOCX utiliza secciones/bloques, sin inventar páginas que la extracción no puede determinar.
- [ ] Mostrar etapas y texto extraído desde NestJS; errores no convierten documentos incompletos en listos.
- [ ] Probar contratos, documentos ilegibles/protegidos, tareas duplicadas, cancelación y reinicio durante un trabajo.

**Cierre:** el trabajador no llama a proveedores, una tarea no se ejecuta dos veces simultáneamente y los resultados conservan procedencia.

**Verificación Docker/rendimiento:** el pipeline funciona entre contenedores, un reinicio recupera el lease y la cola no mantiene bucles activos. Medir reposo sin modelos pesados residentes y extracción por página.

**Commit orientativo:** `feat(extraction): add resumable local document processing`.

## 6. Fase 4 — OCR, tablas escaneadas y revisión

**Resultado visible:** un escaneo o imagen produce texto y tablas revisables junto a su evidencia.

- [ ] Incorporar Docling/RapidOCR en CPU, por páginas y con un único trabajo pesado simultáneo.
- [ ] Conservar encabezados, unidades, notas, regiones y procedencia; identificar extracciones dudosas para revisión humana.
- [ ] Añadir corrección del texto y aprobación de la extracción; los documentos dudosos no se habilitan automáticamente.
- [ ] Controlar memoria y cancelar el subproceso si supera el presupuesto; conservar avances útiles.
- [ ] Incorporar dependencias OCR a la imagen Python, fijadas y compatibles; limitar a una página por lote, hasta dos hilos y una CPU equivalente inicialmente. Detener preventivamente el subproceso pesado al superar 2,5 GiB.
- [ ] Medir calidad y recursos con escaneos sintéticos, una tabla de varias páginas y páginas con poca legibilidad.

**Límite:** no usar aún APIs visuales; ese apoyo aparece después del control de privacidad y los adaptadores.

**Cierre:** se puede verificar cada cifra contra su página y una extracción fallida no termina marcada como completa. Registrar los resultados reales de memoria, sin prometer velocidad no medida.

**Verificación Docker/rendimiento:** no volver a descargar modelos en cada arranque. La interfaz responde mientras ocurre OCR; registrar memoria de contenedores, navegador y host Windows al usar otra aplicación simultáneamente. Un límite de recursos insuficiente deja un error recuperable, sin publicar un resultado incompleto.

**Commit orientativo:** `feat(ocr): add scanned document extraction and review`.

## 7. Fase 5 — Seudonimización y aprobación de salida

**Resultado visible:** revisar una copia seudonimizada y su correspondencia local antes de habilitar cualquier salida hacia proveedores.

- [ ] Incorporar Presidio, reglas locales y revisión de empresas, personas, identificaciones, correos, teléfonos y direcciones.
- [ ] Mantener identificadores estables entre documentos, confirmando coincidencias ambiguas manualmente.
- [ ] Preparar texto y copias visuales con ocultaciones irreversibles; permitir corregir sustituciones y regiones.
- [ ] Vincular la aprobación a una versión exacta; una modificación exige aprobarla de nuevo.
- [ ] Implementar el control de salida de NestJS y demostrar con un adaptador simulado que originales, correspondencias y copias sin aprobar no pueden salir.
- [ ] Preparar detección de datos en preguntas mediante tareas locales breves, sin que un OCR largo bloquee su ejecución.
- [ ] Actualizar la imagen Python con detección local y comprobar que OCR y detección no cargan conjuntos pesados simultáneamente. Validar prioridad de tareas breves, liberación de modelos y persistencia local de correspondencias.

**Cierre:** pruebas inspeccionan payloads simulados y verifican que solo incluyen contenido autorizado; la correspondencia permite restaurar nombres localmente.

**Commit orientativo:** `feat(privacy): add reversible pseudonymization and approval`.

## 8. Fase 6 — Proveedores y segmentación con LLM

**Resultado visible:** un documento aprobado obtiene secciones y fragmentos identificados por LLM, con consumo y estados visibles.

- [ ] Implementar adaptadores OpenRouter y OpenAI en NestJS, configuración por función y almacenamiento local de claves.
- [ ] Mantener OpenRouter gratuito por defecto y OpenAI desactivado hasta su habilitación expresa.
- [ ] Comprobar compatibilidad y disponibilidad; no ejecutar fallback automático a otro proveedor o modelo de pago.
- [ ] Segmentar bloques numerados, validando referencias, orden y cobertura y conservando el texto aprobado.
- [ ] Añadir apoyo visual opcional exclusivamente sobre copias aprobadas; sus resultados vuelven a revisión y no reutilizan la aprobación de una versión anterior.
- [ ] Probar respuestas malformadas, bloques omitidos y errores 429 con simulaciones; realizar una comprobación real explícita cuando exista configuración autorizada.
- [ ] Validar configuración de proveedores en el contenedor `app`, inyectando claves solo al ejecutar. Limitar concurrencia y reintentos para que esperas de APIs no consuman CPU en bucles ni acumulen solicitudes sin límite.

**Cierre:** la segmentación no inventa evidencia, no publica resultados incompletos y reanuda tras cuotas agotadas sin repetir etapas ya terminadas.

**Commit orientativo:** `feat(ingestion): add configurable providers and LLM segmentation`.

## 9. Fase 7 — Embeddings y recuperación verificable

**Resultado visible:** una pantalla de prueba permite consultar fragmentos y ver su procedencia, antes de añadir generación de respuestas.

- [ ] Activar pgvector mediante migración e incorporar índices versionados con proveedor, modelo y dimensión.
- [ ] Generar embeddings únicamente de versiones aprobadas y segmentadas; guardar checkpoints por lote.
- [ ] Implementar búsqueda vectorial exacta, búsqueda textual y combinación RRF, restringidas a las fuentes seleccionadas.
- [ ] Construir embeddings de consulta con el modelo del índice; bloquear vectores incompatibles.
- [ ] Reindexar por separado al cambiar modelo y activar el nuevo índice solo cuando esté completo.
- [ ] Evaluar recuperación con preguntas en español/inglés, cifras, nombres seudonimizados y fuentes fuera de la selección.
- [ ] Utilizar una imagen PostgreSQL con pgvector disponible y versión fijada; comprobar migración desde la entrega anterior. Medir recuperación y memoria con un corpus sintético de hasta 100 documentos y lotes de embeddings limitados.

**Cierre:** se recupera evidencia esperada sin filtraciones entre fuentes; los cambios de modelo nunca mezclan espacios vectoriales.

**Commit orientativo:** `feat(retrieval): add pgvector embeddings and hybrid search`.

## 10. Fase 8 — Chat documentado y restauración de nombres

**Resultado visible:** conversaciones persistentes que responden con citas y muestran los nombres reales resueltos localmente.

- [ ] Incorporar selección de fuentes, historial, mensajes y estados mediante SSE.
- [ ] Seudonimizar preguntas antes de embeddings o prompts; pedir revisión de datos nuevos o ambiguos.
- [ ] Generar respuestas solo con evidencia recuperada; validar citas y entidades antes de presentar el contenido definitivo.
- [ ] Restaurar nombres conocidos localmente y conservar el historial canónico con seudónimos.
- [ ] Abrir evidencia desde las citas; indicar ausencia de respuesta y discrepancias entre fuentes.
- [ ] Probar preguntas sobre emisor/destinatario de facturas, identificadores inventados e instrucciones maliciosas dentro de documentos.
- [ ] Probar chat y OCR simultáneos en Compose. Paginar historial, moderar actualizaciones SSE y cargar visores secundarios bajo demanda; medir respuesta local con objetivo inicial de hasta 200 ms sin incluir latencia de APIs.

**Cierre:** un usuario puede seguir una conversación, verificar sus citas y ver la empresa real sin que ese nombre salga a los proveedores.

**Commit orientativo:** `feat(chat): add grounded conversations and local name restoration`.

## 11. Fase 9 — Resúmenes completos, comparación y entrega local

**Resultado visible:** resúmenes completos y comparaciones con cobertura explícita, además de un arranque local documentado.

- [ ] Recorrer todas las secciones elegidas, guardar resultados intermedios y sintetizar con citas.
- [ ] Mostrar cobertura y secciones excluidas o pendientes; no tratar una búsqueda de pocos fragmentos como un resumen completo.
- [ ] Reutilizar resultados únicamente cuando coincidan versiones, configuración y fuentes autorizadas.
- [ ] Servir la interfaz compilada desde NestJS y documentar instalación, configuración, ejecución, respaldo local y recuperación.
- [ ] Verificar instalación completa con Compose desde un entorno limpio, imágenes versionadas y configuración de ejemplo. La distribución final conserva tres servicios persistentes; no usa Vite dev server, Nginx separado ni requiere runtimes nativos en el equipo destino.
- [ ] Probar respaldo/restauración conjunta de PostgreSQL y archivos, y actualización sin borrar volúmenes. Validar Windows/Docker Desktop y un equipo Linux compatible cuando exista entorno disponible; registrar destinos no comprobados.
- [ ] Ejecutar evaluación de extremo a extremo, eliminación de archivos/índices y comportamiento de citas históricas.
- [ ] Revisar límites y recursos en el equipo objetivo y documentar lo medido y lo no verificado.

**Cierre:** el sistema recorre el flujo completo y un resumen incluye evidencia del comienzo, medio y final de los documentos, o declara explícitamente su cobertura parcial.

**Verificación Docker/rendimiento:** documentar requisitos de Docker, disco, descarga inicial y conectividad de APIs. Medir los objetivos de hasta 1,5 GiB de reposo y el presupuesto máximo de 4 GiB de contenedores; contabilizar aparte Docker Desktop/WSL y navegador. Si no se alcanzan, registrar optimizaciones o un ajuste acordado, sin anunciar que ya funciona holgadamente en 8 GB.

**Commit orientativo:** `feat(summary): add complete document summaries and comparisons`.

## 12. Registro de avances y aprobación

Todas las fases permanecen pendientes. Las casillas solo se marcarán cuando el trabajo y su verificación hayan ocurrido.

Al cerrar cada fase, añadir aquí un registro con fecha, rama, hashes de commits, pruebas realizadas, limitaciones y decisión de aprobación recibida. No registrar aprobaciones inferidas.

**Siguiente paso propuesto:** tras la aprobación del usuario, ejecutar únicamente la fase 1. Empezar por Git y el commit documental inicial, después crear React/Vite, la página de previsualización local y su imagen Docker/Compose. Detenerse al demostrar ejecución nativa y contenerizada, comunicar comprobaciones y mediciones, y solicitar aprobación antes de la fase 2.
