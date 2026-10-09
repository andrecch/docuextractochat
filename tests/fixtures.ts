export const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPuoAAAAASUVORK5CYII=",
  "base64",
);

// A minimal, synthetic one-page PDF with a real cross-reference table.
export function samplePdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const text =
    "BT /F1 24 Tf 50 760 Td (Documento de prueba local) Tj 0 -40 Td /F1 12 Tf (PDF sintetico - Fase 1) Tj ET";
  objects.push(
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
  );
  let document = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(document));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const crossReference = Buffer.byteLength(document);
  document += `xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${crossReference}\n%%EOF`;
  return Buffer.from(document);
}
