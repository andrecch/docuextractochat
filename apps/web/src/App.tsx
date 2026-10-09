import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { Icon } from "./components/Icon";
import { ACCEPTED_FILES, formatBytes } from "./features/file-preview/files";
import { useLocalPreview } from "./features/file-preview/useLocalPreview";
import { Preview } from "./features/file-preview/Preview";
import { Library, SaveDocument } from "./features/library/Library";
import { useLibrary } from "./features/library/useLibrary";

export function App() {
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const library = useLibrary();
  const { preview, busy, error, select, open, clear, dismissError } =
    useLocalPreview();
  const choose = () => input.current?.click();

  useEffect(() => {
    // Dropping outside the target must not navigate away from this local app.
    const preventFileNavigation = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", preventFileNavigation);
    window.addEventListener("drop", preventFileNavigation);
    return () => {
      window.removeEventListener("dragover", preventFileNavigation);
      window.removeEventListener("drop", preventFileNavigation);
    };
  }, []);

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (event.dataTransfer.files.length)
      void select(Array.from(event.dataTransfer.files));
    else if (event.dataTransfer.types.includes("Files"))
      void select([new File([], "carpeta")]);
  }

  function example() {
    void select([
      new File(
        [
          "Un documento de ejemplo\n\nEste archivo se creó en tu navegador para que pruebes la vista previa.\n\nPuedes seleccionar PDF, PNG, JPEG, TXT, Markdown o DOCX. Para reemplazarlo, arrastra un archivo o usa el botón de selección.\n\nSolo se guarda una copia en el servicio local al pulsar Guardar en biblioteca. El contenido no se envía a proveedores. Todavía no hay OCR ni conversación con modelos.",
        ],
        "ejemplo.txt",
        { type: "text/plain" },
      ),
    ]);
  }

  return (
    <>
      <a className="skip-link" href="#workspace">
        Ir a seleccionar archivo
      </a>
      <header className="masthead">
        <a className="wordmark" href="./" aria-label="DocuExtractoChat, inicio">
          <span className="brand-mark">
            <Icon name="document" />
          </span>
          <span>
            DocuExtracto<span className="brand-last">Chat</span>
          </span>
        </a>
        <span className="local-badge">
          <span className="status-dot" />
          En tu equipo
        </span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <h1>Abre un documento.</h1>
            <p>
              Un espacio para revisar tus archivos, antes de conversar con
              ellos.
            </p>
          </div>
          <span className="phase-label">Fase 2 · Biblioteca local</span>
        </div>
        <div id="workspace" className="workspace">
          <section className="file-panel" aria-labelledby="file-heading">
            <div className="panel-title">
              <h2 id="file-heading">Tu archivo</h2>
              <span className="file-count">
                {preview ? "1 seleccionado" : "Sin seleccionar"}
              </span>
            </div>
            <input
              ref={input}
              type="file"
              accept={ACCEPTED_FILES}
              aria-label="Seleccionar archivo local"
              hidden
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = "";
                void select(files);
              }}
            />
            <section
              className={`drop-zone${dragging ? " is-dragging" : ""}`}
              aria-label="Zona para arrastrar un archivo"
              data-testid="drop-zone"
              onDragEnter={(event) => {
                event.preventDefault();
                if (event.dataTransfer.types.includes("Files")) {
                  dragDepth.current++;
                  setDragging(true);
                }
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (!dragDepth.current) setDragging(false);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={drop}
            >
              <span className="upload-symbol">
                <Icon name="upload" width="30" height="30" />
              </span>
              <h3>{dragging ? "Suéltalo aquí" : "Arrastra tu archivo aquí"}</h3>
              <p>O búscalo en tu equipo.</p>
              <button className="button primary" onClick={choose}>
                Seleccionar archivo
                <Icon name="arrow" />
              </button>
              <span className="size-hint">
                Un archivo a la vez · Hasta 50 MB
              </span>
            </section>
            <div className="supported">
              <h3>Formatos disponibles</h3>
              <p>
                PDF <span>·</span> PNG <span>·</span> JPEG <span>·</span> TXT{" "}
                <span>·</span> Markdown <span>·</span> DOCX
              </p>
              <small>DOCX: texto y tablas después de guardar.</small>
            </div>
            {error && (
              <div className="error-message" role="alert">
                <div>
                  <strong>No pudimos abrir ese archivo</strong>
                  <p>{error}</p>
                </div>
                <button
                  className="icon-button"
                  aria-label="Cerrar mensaje de error"
                  onClick={dismissError}
                >
                  <Icon name="close" />
                </button>
              </div>
            )}
            <div className="selection-status" role="status" aria-live="polite">
              {busy
                ? "Preparando la vista previa…"
                : preview
                  ? `${preview.file.name} está listo para revisar.`
                  : ""}
            </div>
            {preview && (
              <div className="selected-file">
                <span className="file-symbol">
                  <Icon
                    name={preview.kind === "image" ? "image" : "document"}
                  />
                </span>
                <div className="file-description">
                  <strong title={preview.file.name}>{preview.file.name}</strong>
                  <span>
                    {preview.label} ·{" "}
                    {formatBytes(preview.originalSize ?? preview.file.size)}
                  </span>
                </div>
                <button
                  className="icon-button"
                  aria-label="Quitar archivo"
                  onClick={clear}
                >
                  <Icon name="close" />
                </button>
              </div>
            )}
            {preview && (
              <SaveDocument
                key={preview.url}
                preview={preview}
                library={library}
                onOpen={open}
              />
            )}
            <div className="privacy-note">
              <Icon name="shield" />
              <div>
                <strong>Tu contenido se queda contigo.</strong>
                <p>
                  Seleccionar no guarda el archivo. Solo «Guardar en biblioteca»
                  crea una copia en el servicio local de tu equipo. No se envía
                  contenido a proveedores externos.
                </p>
              </div>
            </div>
          </section>
          <section
            className={`viewer-panel${preview ? " has-preview" : ""}`}
            aria-labelledby="preview-heading"
            aria-busy={busy}
          >
            <div className="viewer-toolbar">
              <div>
                <span className="viewer-dot" />
                <h2 id="preview-heading">Vista previa</h2>
              </div>
              {preview && (preview.kind !== "docx" || preview.documentId) ? (
                <a
                  className="open-link"
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {preview.kind === "docx"
                    ? "Descargar original"
                    : `Abrir ${preview.truncated ? "vista parcial" : "archivo"}`}
                  <Icon name="expand" width="16" height="16" />
                </a>
              ) : (
                <span className="viewer-hint">Sin archivo</span>
              )}
            </div>
            {preview ? (
              <Preview key={preview.url} preview={preview} />
            ) : (
              <div className="empty-preview">
                <div className="empty-file-mark">
                  <Icon name="document" width="44" height="44" />
                </div>
                <h3>Aquí empieza tu documento.</h3>
                <p>
                  Selecciona un archivo y revísalo
                  <br />
                  sin salir de este espacio.
                </p>
                <button className="example-button" onClick={example}>
                  Probar con un ejemplo
                  <Icon name="arrow" width="16" height="16" />
                </button>
              </div>
            )}
            <div className="viewer-footer">
              <span>
                {preview
                  ? preview.truncated
                    ? "Vista parcial"
                    : "Vista local"
                  : "Esperando tu archivo"}
              </span>
              <span>
                {preview ? preview.label : "Guardado solo por decisión tuya"}
              </span>
            </div>
          </section>
        </div>
        <Library
          library={library}
          onOpen={open}
          onDeleted={(id) => {
            if (preview?.documentId === id) clear();
          }}
        />
        <footer className="page-footer">
          <span>Un primer paso, antes del chat.</span>
          <p>
            Previsualización local. El análisis y las conversaciones llegarán en
            próximas fases.
          </p>
        </footer>
      </main>
    </>
  );
}
