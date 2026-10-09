import { useRef, useState } from "react";
import type { LocalPreview } from "./files";
import { Icon } from "../../components/Icon";
import { SafeDocx } from "./SafeDocx";

export function Preview({ preview }: { preview: LocalPreview }) {
  const [failed, setFailed] = useState(false);
  const [part, setPart] = useState(0);
  const textView = useRef<HTMLDivElement>(null);
  const partLength = 32 * 1024;
  const text = preview.text ?? "";
  const parts = Math.ceil(text.length / partLength);
  let start = part * partLength;
  let end = Math.min(start + partLength, text.length);
  // Keep UTF-16 surrogate pairs intact at display boundaries.
  const isHighSurrogate = (index: number) =>
    text.charCodeAt(index) >= 0xd800 && text.charCodeAt(index) <= 0xdbff;
  if (isHighSurrogate(start - 1)) start++;
  if (isHighSurrogate(end - 1)) end++;
  function changePart(next: number) {
    setPart(next);
    textView.current?.scrollTo({ top: 0, left: 0 });
  }
  if (failed)
    return (
      <div className="preview-failure" role="alert">
        <Icon name="document" />
        <h3>No se pudo mostrar este archivo.</h3>
        <p>
          Puedes intentar abrirlo en otra pestaña o elegir un archivo diferente.
        </p>
        <a
          className="button secondary"
          href={preview.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir archivo
          <Icon name="expand" />
        </a>
      </div>
    );
  if (preview.kind === "docx")
    return (
      <div className="text-view">
        <div className="text-view-heading">
          <Icon name="document" />
          <span>DOCX · Texto y tablas</span>
        </div>
        {preview.html !== undefined ? (
          <>
            <p className="partial-note">
              La distribución y la paginación pueden diferir de Word. Descarga
              el original para conservar su formato.
            </p>
            {preview.warnings
              ?.filter(
                (warning) =>
                  warning !==
                  "La paginación y el formato pueden diferir de Word.",
              )
              .map((warning, index) => (
                <p className="partial-note" key={index}>
                  {warning}
                </p>
              ))}
            <SafeDocx html={preview.html} />
          </>
        ) : (
          <p>Guarda en biblioteca para previsualizar texto y tablas.</p>
        )}
      </div>
    );
  if (preview.kind === "text")
    return (
      <div className="text-view" ref={textView}>
        <div className="text-view-heading">
          <Icon name="text" />
          <span>Texto original · UTF-8</span>
        </div>
        {preview.truncated && (
          <p className="partial-note" role="status">
            Vista parcial: se muestra el primer 1 MiB del archivo.
          </p>
        )}
        {parts > 1 && (
          <nav className="text-pagination" aria-label="Partes del texto">
            <button
              type="button"
              disabled={part === 0}
              onClick={() => changePart(part - 1)}
            >
              Anterior
            </button>
            <span role="status">
              Parte {part + 1} de {parts}
            </span>
            <button
              type="button"
              disabled={part === parts - 1}
              onClick={() => changePart(part + 1)}
            >
              Siguiente
            </button>
          </nav>
        )}
        <pre data-testid="text-preview">{text.slice(start, end)}</pre>
      </div>
    );
  if (preview.kind === "image")
    return (
      <div className="image-view">
        <img
          src={preview.url}
          alt={`Vista previa de ${preview.file.name}`}
          onError={() => setFailed(true)}
        />
      </div>
    );
  return (
    <div className="pdf-view">
      <iframe
        src={preview.url}
        title={`Vista previa de ${preview.file.name}`}
        onError={() => setFailed(true)}
      />
      <div className="pdf-note">
        Si tu navegador no muestra el PDF,{" "}
        <a href={preview.url} target="_blank" rel="noopener noreferrer">
          ábrelo en otra pestaña
        </a>
        .
      </div>
    </div>
  );
}
