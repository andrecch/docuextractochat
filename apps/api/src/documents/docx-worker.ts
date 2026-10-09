import { parentPort, workerData } from "node:worker_threads";
import mammoth from "mammoth";
import sanitize from "sanitize-html";

// No links or images survive sanitation. Mammoth external file access is disabled.
async function run() {
  const result = await mammoth.convertToHtml(
    { path: workerData.file },
    {
      externalFileAccess: false,
      convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
    },
  );
  const html = sanitize(result.value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "sup",
      "sub",
    ],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });
  parentPort?.postMessage({
    html,
    warnings: [
      "La paginación y el formato pueden diferir de Word.",
      ...result.messages.map((m) => m.message),
    ],
  });
}
run().catch(() => parentPort?.postMessage({ error: true }));
