# Fase 1 — Tareas de implementación

Estado: autorizada, implementada y verificada el 2026-10-09. Rama: `feat/phase-01-file-preview`. Evidencia en [FASE-01-RESULTADOS.md](FASE-01-RESULTADOS.md).

## Entregas

1. Documentación inicial e identidad Git local confirmadas por el usuario.
2. Workspace npm, React/TypeScript/Vite y comandos reproducibles.
3. Selección, validación y previsualización local, con liberación de recursos.
4. Pruebas de navegador sobre formato, errores, reemplazo, privacidad y límites.
5. Docker multietapa con estáticos Nginx, Compose y healthcheck.
6. Compilación, pruebas y revisión visual en escritorio y móvil; mediciones separadas de aplicación, navegador y contenedor.

## Organización

- `apps/web/src/features/file-preview/`: validación, preparación de previews, ciclo de vida y vista.
- `apps/web/src/App.tsx` y `styles.css`: superficie de selección, estado y presentación.
- `tests/preview.spec.ts`: recorridos reales de navegador con archivos sintéticos.
- `apps/web/Dockerfile`, `nginx.conf`, `compose.yaml`: distribución de la fase.

## Controles

- No solicitudes de carga ni llamadas externas desde el flujo de archivos.
- Preservar selección válida ante cancelación/error; descartar resultados obsoletos.
- Leer como máximo 1 MiB de texto y liberar URLs al cambiar/quitar el archivo.
- Verificar PDF manualmente; no equiparar un iframe cargado con renderizado visual del visor nativo.
- No comenzar la fase 2. Reportar cualquier comprobación bloqueada por el entorno.

## Dirección de interfaz provisional

Página operativa de inspección documental: fondo claro, tinta azul profunda, acento azul, controles legibles y dos zonas funcionales. El usuario eligió construir directamente y evaluar en el navegador. No hay una maqueta de imagen aprobada ni una identidad visual de marca fijada por el usuario.
