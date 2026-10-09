import { useEffect, useRef, useState } from "react";
import type { LocalPreview } from "../file-preview/files";
import { formatBytes } from "../file-preview/files";
import { documentUrl, LibraryError } from "./api";
import type { DocumentRecord, Sensitivity } from "./api";
import type { LibraryState } from "./useLibrary";

export const sensitivityLabels = {
  unknown: "Sin clasificar",
  sensitive: "Sensible",
  "non-sensitive": "No sensible",
};
function SensitivityField({
  value,
  onChange,
  disabled,
  id,
}: {
  value: Sensitivity;
  onChange: (value: Sensitivity) => void;
  disabled: boolean;
  id: string;
}) {
  return (
    <div className="sensitivity-field">
      <label htmlFor={id}>Sensibilidad del documento</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Sensitivity)}
      >
        {Object.entries(sensitivityLabels).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
export function SaveDocument({
  preview,
  library,
  onOpen,
}: {
  preview: LocalPreview;
  library: LibraryState;
  onOpen: (record: DocumentRecord) => Promise<void>;
}) {
  const [sensitivity, setSensitivity] = useState<Sensitivity>("unknown");
  const [message, setMessage] = useState("");
  const [duplicate, setDuplicate] = useState<string>();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const record = library.recordFor(preview.file, preview.documentId);
  async function save() {
    setMessage("");
    setDuplicate(undefined);
    try {
      const saved = await library.save(preview.file, sensitivity);
      if (!active.current) return;
      setMessage("Guardado en tu biblioteca local.");
      if (saved.kind === "docx") await onOpen(saved);
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "No se pudo guardar. Intenta otra vez.",
      );
      if (reason instanceof LibraryError) setDuplicate(reason.documentId);
    }
  }
  async function change(value: Sensitivity) {
    if (!record) {
      setSensitivity(value);
      return;
    }
    setMessage("");
    try {
      await library.update(record, value);
      setMessage("Sensibilidad actualizada.");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "No se pudo actualizar.",
      );
    }
  }
  return (
    <div className="save-document">
      <SensitivityField
        id="selected-sensitivity"
        value={record?.sensitivity ?? sensitivity}
        onChange={(value) => void change(value)}
        disabled={library.working}
      />
      <p className="sensitivity-hint">
        Tu clasificación no autoriza envíos a proveedores.
      </p>
      {record || preview.documentId ? (
        <p className="saved-label">Guardado en biblioteca</p>
      ) : (
        <button
          className="button secondary"
          disabled={library.working}
          onClick={() => void save()}
        >
          {library.working ? "Guardando…" : "Guardar en biblioteca"}
        </button>
      )}
      {message && (
        <p className="library-feedback" role="status">
          {message}
        </p>
      )}
      {duplicate && (
        <button
          className="text-action"
          onClick={() =>
            void library
              .find(duplicate)
              .then((record) => {
                if (active.current) return onOpen(record);
              })
              .catch((reason) => setMessage(reason.message))
          }
        >
          Abrir documento existente
        </button>
      )}
    </div>
  );
}
export function Library({
  library,
  onOpen,
  onDeleted,
}: {
  library: LibraryState;
  onOpen: (record: DocumentRecord) => Promise<void>;
  onDeleted: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState<string>();
  const [message, setMessage] = useState("");
  async function remove(id: string) {
    setMessage("");
    try {
      await library.remove(id);
      setConfirm(undefined);
      onDeleted(id);
      setMessage("Documento eliminado de la biblioteca.");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "No se pudo eliminar. Intenta otra vez.",
      );
    }
  }
  return (
    <section
      className="library-panel"
      aria-labelledby="library-heading"
      aria-busy={library.loading}
    >
      <div className="library-heading">
        <div>
          <h2 id="library-heading">Biblioteca local</h2>
          <p>Los originales que guardas aquí permanecen después de recargar.</p>
        </div>
        <button
          className="text-action"
          disabled={library.loading}
          onClick={library.reload}
        >
          Actualizar biblioteca
        </button>
      </div>
      {library.loading ? (
        <p className="library-empty" role="status">
          Cargando biblioteca…
        </p>
      ) : library.error ? (
        <div className="library-empty">
          <strong>Biblioteca no disponible</strong>
          <p>{library.error}</p>
          <button className="button secondary" onClick={library.reload}>
            Reintentar
          </button>
        </div>
      ) : !library.listing.total ? (
        <p className="library-empty">
          Todavía no hay documentos guardados. Selecciona uno y pulsa «Guardar
          en biblioteca».
        </p>
      ) : (
        <>
          <ul className="library-list">
            {library.listing.items.map((record) => (
              <li key={record.id} data-testid="library-document">
                <div className="library-document-info">
                  <button
                    className="document-name"
                    title={record.name}
                    onClick={() => void onOpen(record)}
                  >
                    {record.name}
                  </button>
                  <p>
                    {record.extension.toUpperCase()} ·{" "}
                    {formatBytes(record.size)} ·{" "}
                    {sensitivityLabels[record.sensitivity]} ·{" "}
                    {new Intl.DateTimeFormat("es", {
                      dateStyle: "medium",
                    }).format(new Date(record.createdAt))}
                  </p>
                </div>
                <div className="library-actions">
                  <button
                    className="text-action"
                    onClick={() => void onOpen(record)}
                  >
                    Abrir
                  </button>
                  <a
                    className="text-action"
                    href={documentUrl(record.id, "download")}
                    download
                  >
                    Descargar
                  </a>
                  <button
                    className="text-action danger-action"
                    disabled={library.working}
                    onClick={() => setConfirm(record.id)}
                  >
                    Eliminar
                  </button>
                </div>
                {confirm === record.id && (
                  <div className="delete-confirm">
                    <p>
                      ¿Eliminar «{record.name}» y su original guardado? Esta
                      acción no se puede deshacer.
                    </p>
                    <button
                      className="button secondary"
                      disabled={library.working}
                      onClick={() => setConfirm(undefined)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="button delete-button"
                      disabled={library.working}
                      onClick={() => void remove(record.id)}
                    >
                      {library.working
                        ? "Eliminando…"
                        : "Eliminar definitivamente"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <nav
            className="library-pagination"
            aria-label="Páginas de la biblioteca"
          >
            <button
              className="text-action"
              disabled={library.page === 1}
              onClick={() => library.setPage(library.page - 1)}
            >
              Página anterior
            </button>
            <span>
              Página {library.page} de{" "}
              {Math.ceil(library.listing.total / library.listing.limit)} ·{" "}
              {library.listing.total} documentos
            </span>
            <button
              className="text-action"
              disabled={
                library.page * library.listing.limit >= library.listing.total
              }
              onClick={() => library.setPage(library.page + 1)}
            >
              Página siguiente
            </button>
          </nav>
        </>
      )}
      {message && (
        <p className="library-feedback" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
