import { useCallback, useEffect, useRef, useState } from "react";
import { preparePreview } from "./files";
import type { LocalPreview } from "./files";
import { storedPreview } from "../library/api";
import type { DocumentRecord } from "../library/api";

export function useLocalPreview() {
  const [preview, setPreview] = useState<LocalPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const liveUrl = useRef<string | null>(null);
  const openController = useRef<AbortController | null>(null);

  const release = useCallback(() => {
    if (liveUrl.current?.startsWith("blob:"))
      URL.revokeObjectURL(liveUrl.current);
    liveUrl.current = null;
  }, []);

  useEffect(
    () => () => {
      generation.current++;
      openController.current?.abort();
      release();
    },
    [release],
  );

  const select = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const token = ++generation.current;
      openController.current?.abort();
      setError(null);
      if (files.length !== 1) {
        setBusy(false);
        setError(
          "Selecciona un solo archivo a la vez. Tu vista actual se conserva.",
        );
        return;
      }
      setBusy(true);
      try {
        const next = await preparePreview(files[0]);
        if (generation.current !== token) {
          URL.revokeObjectURL(next.url);
          return;
        }
        release();
        liveUrl.current = next.url;
        setPreview(next);
      } catch (reason) {
        if (generation.current === token)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo leer el archivo. Intenta seleccionarlo otra vez.",
          );
      } finally {
        if (generation.current === token) setBusy(false);
      }
    },
    [release],
  );

  const clear = useCallback(() => {
    generation.current++;
    openController.current?.abort();
    release();
    setPreview(null);
    setError(null);
    setBusy(false);
  }, [release]);

  const open = useCallback(
    async (record: DocumentRecord) => {
      const token = ++generation.current;
      openController.current?.abort();
      const controller = new AbortController();
      openController.current = controller;
      setBusy(true);
      setError(null);
      try {
        const next = await storedPreview(record, controller.signal);
        if (generation.current !== token) {
          if (next.url.startsWith("blob:")) URL.revokeObjectURL(next.url);
          return;
        }
        release();
        liveUrl.current = next.url;
        setPreview(next);
      } catch (reason) {
        if (generation.current === token)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo abrir el documento guardado.",
          );
      } finally {
        if (generation.current === token) setBusy(false);
      }
    },
    [release],
  );

  return {
    preview,
    error,
    busy,
    select,
    open,
    clear,
    dismissError: () => setError(null),
  };
}
