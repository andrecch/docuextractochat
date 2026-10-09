import { useCallback, useEffect, useRef, useState } from "react";
import { preparePreview } from "./files";
import type { LocalPreview } from "./files";

export function useLocalPreview() {
  const [preview, setPreview] = useState<LocalPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const liveUrl = useRef<string | null>(null);

  const release = useCallback(() => {
    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    liveUrl.current = null;
  }, []);

  useEffect(
    () => () => {
      generation.current++;
      release();
    },
    [release],
  );

  const select = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const token = ++generation.current;
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
    release();
    setPreview(null);
    setError(null);
    setBusy(false);
  }, [release]);

  return {
    preview,
    error,
    busy,
    select,
    clear,
    dismissError: () => setError(null),
  };
}
