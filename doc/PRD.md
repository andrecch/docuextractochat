# PRD — DocuExtractoChat

Fecha: 2026-10-09  
Estado: definición inicial; pendiente de aclaraciones del usuario.  
La fase 1 fue autorizada y se implementó el 2026-10-09. Las fases siguientes requieren aprobación independiente, según [FASES.md](FASES.md). Esta entrega solo permite previsualización local; los requisitos RAG siguientes siguen pendientes.

## 1. Objetivo

Crear un sistema RAG personal con una experiencia de conversación inspirada en NotebookLM. El usuario carga documentos, selecciona las fuentes de una conversación y recibe respuestas respaldadas exclusivamente por su contenido, con citas verificables.

El flujo requerido es extracción del archivo → análisis y segmentación con LLM → embeddings → almacenamiento en PostgreSQL con pgvector → recuperación de evidencia → respuesta documentada.

## 2. Usuario y contexto

- Un usuario, trabajando desde su navegador en el equipo local Windows.
- Equipo declarado: 8 GB de RAM y 2 GB de VRAM. No depender de la GPU.
- Biblioteca única de aproximadamente 100 documentos; fuentes seleccionables por conversación.
- Documentos y consultas en español e inglés; interfaz y respuestas en español por defecto.
- Contenido con predominio de tablas y cifras.
- Equilibrio entre calidad y consumo; preferencia por servicios gratuitos.
- Priorizar una aplicación ágil y consumo moderado para poder usar otras aplicaciones simultáneamente en el mismo equipo.

### Decisión tecnológica acordada

- Backend principal en NestJS con TypeScript, responsable de la API, conversaciones, integración de proveedores y coordinación del RAG.
- Interfaz en React con TypeScript.
- Trabajador local Python para extracción, OCR, detección de datos sensibles y preparación de copias seudonimizadas.
- PostgreSQL con pgvector como almacenamiento y cola de trabajos; sin Redis inicialmente.
- NestJS será la única API de la aplicación. Python no expondrá una segunda API HTTP.
- Distribución con Docker Compose: NestJS con React compilado, trabajador Python y PostgreSQL con pgvector. Incorporar y verificar cada contenedor en su fase, no solo al final.

El cambio a NestJS no modifica los requisitos de privacidad, citas, proveedores ni procesamiento en el equipo local.

### Portabilidad y rendimiento

- En el equipo destino, la distribución debe funcionar con Docker/Compose y configuración local, sin instalar Node.js, Python o PostgreSQL por separado. El primer montaje puede necesitar internet para imágenes y modelos; las APIs externas requieren conectividad.
- Guardar documentos, correspondencias y base de datos en volúmenes persistentes. Instalar en otro equipo no traslada automáticamente los datos: documentar respaldo y restauración conjunta.
- React y Vite son la base de la interfaz, pero su elección no garantiza rendimiento. Validar la compilación de producción, carga diferida, listas paginadas, limpieza de vistas y respuesta durante el procesamiento.
- Utilizar por defecto un perfil de recursos económico, configurable, con un trabajo documental pesado a la vez y opciones de pausar/reanudar procesamiento.
- No reducir silenciosamente la calidad del OCR, omitir páginas ni saltar revisión o segmentación para cumplir un presupuesto. Si un trabajo no cabe, informar, conservar avances y ofrecer reintento o cambio explícito de configuración.
- Medir memoria y CPU en reposo y con OCR, uso del navegador y consumo adicional de Docker Desktop/WSL. El objetivo es dejar margen al sistema operativo y a otras aplicaciones, sin prometerlo solo mediante límites de contenedor.
- Objetivos iniciales a validar: servicios en reposo hasta 1,5 GiB y presupuesto agregado máximo de 4 GiB para contenedores en procesamiento. No incluyen navegador, máquina virtual de Docker ni compilaciones.
- La interfaz debe seguir respondiendo durante OCR. Evaluar selección, navegación y estado local con objetivo de respuesta de hasta 200 ms; el tiempo del LLM externo se mide por separado y no se incluye en ese objetivo.

## 3. Alcance funcional

### Biblioteca e ingesta

- Cargar PDF con texto, PDF escaneados, DOCX, TXT, Markdown, PNG y JPEG.
- Conservar originales localmente y detectar duplicados por contenido.
- Mostrar etapas, progreso, errores, revisión pendiente y espera por cuota.
- Permitir cancelar, reintentar y continuar trabajos interrumpidos.
- Revisar extracción dudosa antes de habilitar el documento para el chat.
- Conservar páginas, secciones, tablas, encabezados, unidades y notas necesarias para interpretar cifras.
- Cada documento debe pasar por segmentación con LLM antes de generar sus embeddings. No indexar provisionalmente mediante fragmentación por reglas.

### Conversaciones

- Crear y conservar conversaciones con historial.
- Seleccionar documentos de la biblioteca para cada conversación.
- Responder preguntas puntuales, consultar cifras explícitas y comparar lo escrito.
- Elaborar resúmenes completos y comparaciones entre documentos, recorriendo todas las secciones seleccionadas.
- Mostrar citas que abran la página o sección de origen.
- Declarar cuando la evidencia sea insuficiente, existan contradicciones o la cobertura esté incompleta.
- No completar respuestas con conocimiento externo.
- Distinguir quién emitió, recibió o entregó una factura: responder solo cuando ese rol conste en las fuentes.

### Proveedores

- OpenRouter como proveedor predeterminado con modelos gratuitos.
- OpenAI como proveedor adicional, opcional y de pago.
- Elegir proveedor y modelo por función: segmentación, embeddings, chat y apoyo visual.
- Permitir chat y embeddings con proveedores diferentes, manteniendo compatibilidad entre los embeddings de consulta y del índice.
- OpenAI desactivado inicialmente; requiere clave, modelos seleccionados y habilitación expresa del uso de pago.
- No cambiar automáticamente de proveedor ni recurrir a un servicio de pago al agotarse una cuota gratuita.
- Ante límites o indisponibilidad, conservar avances y esperar, con opciones de reintento o cambio explícito de configuración.
- Mostrar consumo y coste estimado cuando haya precios conocidos; no prometer un límite de facturación garantizado.

## 4. Privacidad y nombres reales

Se acuerda seudonimización reversible, con restauración local de nombres en pantalla. Los documentos sensibles no se envían completos a los proveedores.

Ejemplo: una factura local indica «Emitida por Distribuidora Acme». El modelo recibe «Emitida por EMPRESA_001», responde con ese identificador y una cita, y la aplicación muestra «La emitió Distribuidora Acme» utilizando una correspondencia guardada únicamente en el equipo.

- Declarar la sensibilidad al cargar cada archivo.
- Detectar y sustituir empresas, personas, identificaciones, correos, teléfonos y direcciones.
- Mantener identificadores consistentes entre documentos para relacionar facturas de una misma empresa.
- Revisar y aprobar manualmente la copia antes de enviarla a cualquier proveedor, incluido OpenAI.
- Permitir corregir sustituciones y ocultar regiones de imágenes.
- Sustituir también nombres reales en preguntas e historial antes de llamadas externas.
- Datos nuevos o ambiguos detectados en una pregunta requieren revisión antes del envío.
- Conservar originales y correspondencias exclusivamente localmente.
- Las búsquedas, embeddings y respuestas del modelo utilizan copias seudonimizadas; la presentación local restaura nombres conocidos.
- No fusionar automáticamente identidades ambiguas ni restaurar identificadores inventados por el modelo.
- Los importes y contenido técnico se conservan salvo que el usuario decida ocultarlos durante la revisión.

La detección automática no garantiza encontrar todos los datos sensibles. La seudonimización tampoco elimina necesariamente identificadores indirectos; por ello la revisión humana es obligatoria.

## 5. Fuera del alcance inicial

- Multiusuario, organizaciones, permisos compartidos y despliegue público.
- Cálculos nuevos, agregaciones y análisis de tablas como base de datos.
- CSV, XLSX, audio y navegación web.
- Modelos generativos ejecutados localmente como respaldo.
- Cambio automático entre proveedores o hacia servicios de pago.

## 6. Criterios de aceptación

1. Un PDF textual, un escaneo y un DOCX pueden completar extracción, revisión, segmentación, indexación y consulta.
2. Las cifras recuperadas mantienen unidades, encabezados y citas correctas.
3. El chat consulta exclusivamente las fuentes seleccionadas y reconoce preguntas sin respuesta documental.
4. Se pueden consultar documentos en inglés mediante preguntas en español.
5. Los resúmenes completos incluyen evidencia del principio, medio y final de cada documento; informan secciones excluidas o pendientes.
6. Se muestra la empresa real emisora de una factura mediante restauración local, sin enviarla al proveedor.
7. Seudónimos estables permiten relacionar documentos de una empresa; coincidencias ambiguas requieren revisión.
8. Ningún original sensible, correspondencia o imagen sin aprobar se incluye en solicitudes externas.
9. OpenAI está desactivado por defecto y ningún fallo activa un servicio de pago.
10. Cambiar el modelo de embeddings exige reindexación; nunca se comparan vectores de modelos incompatibles.
11. Un error de cuota o reinicio no pierde avances ni duplica fragmentos.
12. Las citas y entidades inexistentes son rechazadas; instrucciones dentro de los archivos no alteran las reglas del chat.
13. Cada componente se puede construir y ejecutar con Docker al incorporarse; la entrega completa arranca en un entorno limpio con Compose y conserva datos después de recrear contenedores.
14. Se verifica respaldo/restauración de PostgreSQL, documentos y correspondencias para mantener consistencia al trasladar la aplicación.
15. Se documentan mediciones de reposo, extracción y uso simultáneo del chat; si los objetivos no se cumplen, la fase registra y resuelve la desviación antes de presentarla como validada.

## 7. Defaults propuestos y aclaraciones pendientes

Los siguientes valores proceden del plan y no de una exigencia explícita del usuario: 50 MB y 200 páginas por archivo, hasta dos hilos de CPU, límite de 3 GiB para el contenedor documental y umbral preventivo de 2,5 GiB para su subproceso pesado. Los presupuestos de memoria/latencia se detallan en ARQUITEC.md y deben validarse con documentos representativos antes de considerarlos compromisos de rendimiento. La configuración de CPU debe considerar los núcleos realmente disponibles.

Los modelos concretos son candidatos configurables, sujetos a disponibilidad, condiciones de uso y evaluación. No se han ejecutado comprobaciones con cuentas reales.

Este PRD es una base editable. El usuario eligió NestJS como backend principal y autorizó después la fase 1. Su resultado se registra en [FASE-01-RESULTADOS.md](FASE-01-RESULTADOS.md). No interpretar la entrega de previsualización como autorización para desarrollar las fases siguientes.
