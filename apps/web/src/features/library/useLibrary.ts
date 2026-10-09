import { useCallback, useEffect, useRef, useState } from "react";
import { api, LibraryError } from "./api";
import type { DocumentPage, DocumentRecord, Sensitivity } from "./api";

export function useLibrary() {
  const [listing, setListing] = useState<DocumentPage>({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [version, setVersion] = useState(0);
  const [known, setKnown] = useState<Record<string, DocumentRecord>>({});
  const savedFiles = useRef(new WeakMap<File, string>());
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api<DocumentPage>(`/api/documents?page=${page}&limit=20`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (!result.items.length && page > 1) {
          setPage(page - 1);
          return;
        }
        setListing(result);
        setKnown((current) => ({
          ...current,
          ...Object.fromEntries(result.items.map((item) => [item.id, item])),
        }));
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Biblioteca no disponible.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, version]);
  async function save(file: File, sensitivity: Sensitivity) {
    setWorking(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("sensitivity", sensitivity);
      const record = await api<DocumentRecord>("/api/documents", {
        method: "POST",
        body,
      });
      savedFiles.current.set(file, record.id);
      setKnown((current) => ({ ...current, [record.id]: record }));
      setPage(1);
      reload();
      return record;
    } finally {
      setWorking(false);
    }
  }
  async function update(record: DocumentRecord, sensitivity: Sensitivity) {
    setWorking(true);
    try {
      const next = await api<DocumentRecord>(
        `/api/documents/${record.id}/sensitivity`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sensitivity }),
        },
      );
      setKnown((current) => ({ ...current, [next.id]: next }));
      setListing((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === next.id ? next : item)),
      }));
    } finally {
      setWorking(false);
    }
  }
  async function remove(id: string) {
    setWorking(true);
    try {
      await api<void>(`/api/documents/${id}`, { method: "DELETE" });
      setKnown((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      reload();
    } finally {
      setWorking(false);
    }
  }
  async function find(id: string) {
    // Duplicate IDs can be outside the current page. Resolve through the paginated contract.
    if (known[id]) return known[id];
    let index = 1;
    while (true) {
      const result = await api<DocumentPage>(
        `/api/documents?page=${index}&limit=20`,
      );
      const record = result.items.find((item) => item.id === id);
      if (record) {
        setKnown((current) => ({ ...current, [id]: record }));
        return record;
      }
      if (index * result.limit >= result.total)
        throw new LibraryError(
          "El documento ya no está en la biblioteca. Actualiza el listado.",
        );
      index++;
    }
  }
  return {
    listing,
    loading,
    error,
    working,
    page,
    setPage,
    reload,
    save,
    update,
    remove,
    find,
    recordFor: (file: File, documentId?: string) =>
      known[documentId ?? savedFiles.current.get(file) ?? ""],
  };
}
export type LibraryState = ReturnType<typeof useLibrary>;
