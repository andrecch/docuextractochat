import { expect, test } from "@playwright/test";
import { ZipFile } from "yazl";

async function syntheticDocx(text: string) {
  const archive = new ZipFile();
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    archive.outputStream.on("data", (chunk) => chunks.push(chunk));
    archive.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    archive.outputStream.on("error", reject);
  });
  const entries = {
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    "_rels/.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    "word/document.xml": `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p><w:p><w:hyperlink r:id="outside"><w:r><w:t>Vínculo original</w:t></w:r></w:hyperlink></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Celda de prueba</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`,
    "word/_rels/document.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="outside" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.invalid/private" TargetMode="External"/></Relationships>',
  };
  for (const [name, contents] of Object.entries(entries))
    archive.addBuffer(Buffer.from(contents), name);
  archive.end();
  return done;
}

test("saves explicitly, keeps sensitivity after reload, opens duplicates and deletes with inline confirmation", async ({
  page,
  request,
  baseURL,
}) => {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const name = `biblioteca-${nonce}.txt`;
  const content = `Documento sintético de biblioteca ${nonce}`;
  let savedId: string | undefined;
  const external: string[] = [];
  const allowedOrigin = new URL(baseURL ?? "http://127.0.0.1:4173").origin;
  page.on("request", (event) => {
    if (
      /^https?:/.test(event.url()) &&
      new URL(event.url()).origin !== allowedOrigin
    )
      external.push(event.url());
  });
  try {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Biblioteca local" }),
    ).toBeVisible();
    const file = { name, mimeType: "text/plain", buffer: Buffer.from(content) };
    await page.getByLabel("Seleccionar archivo local").setInputFiles(file);
    await expect(page.getByTestId("text-preview")).toHaveText(content);
    await expect(
      page.getByTestId("library-document").filter({ hasText: name }),
    ).toHaveCount(0);
    await page
      .getByLabel("Sensibilidad del documento")
      .selectOption("sensitive");
    const created = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/documents") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Guardar en biblioteca", exact: true })
      .click();
    const response = await created;
    expect(response.status()).toBe(201);
    savedId = (await response.json()).id;
    let row = page.getByTestId("library-document").filter({ hasText: name });
    await expect(row).toContainText("Sensible");
    await page.reload();
    row = page.getByTestId("library-document").filter({ hasText: name });
    await expect(row).toContainText("Sensible");
    await row.getByRole("button", { name: "Abrir", exact: true }).click();
    await expect(page.getByTestId("text-preview")).toHaveText(content);
    await expect(page.getByLabel("Sensibilidad del documento")).toHaveValue(
      "sensitive",
    );
    await page
      .getByLabel("Sensibilidad del documento")
      .selectOption("non-sensitive");
    await expect(row).toContainText("No sensible");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      row.getByRole("link", { name: "Descargar" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(name);
    await page.getByLabel("Seleccionar archivo local").setInputFiles(file);
    await page
      .getByRole("button", { name: "Guardar en biblioteca", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Abrir documento existente" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Abrir documento existente" })
      .click();
    await expect(page.getByLabel("Sensibilidad del documento")).toHaveValue(
      "non-sensitive",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    page.on("dialog", () => {
      throw new Error("Deletion must use inline confirmation");
    });
    await row.getByRole("button", { name: "Eliminar", exact: true }).click();
    await row.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Eliminar", exact: true }).click();
    await row.getByRole("button", { name: "Eliminar definitivamente" }).click();
    await expect(row).toHaveCount(0);
    savedId = undefined;
    expect(external).toEqual([]);
  } finally {
    if (savedId) await request.delete(`/api/documents/${savedId}`);
  }
});

test("unavailable library can retry without blocking local preview", async ({
  page,
}) => {
  await page.route("**/api/documents?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Servicio local detenido." }),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Biblioteca no disponible", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Seleccionar archivo local").setInputFiles({
    name: "sin-servicio.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Vista local disponible"),
  });
  await expect(page.getByTestId("text-preview")).toHaveText(
    "Vista local disponible",
  );
  await page.unroute("**/api/documents?*");
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(
    page.getByText("Biblioteca no disponible", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId("text-preview")).toHaveText(
    "Vista local disponible",
  );
});

test("DOCX converts saved text and tables without external links or active HTML", async ({
  page,
  request,
}) => {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const name = `documento-${nonce}.docx`;
  let savedId: string | undefined;
  const external: string[] = [];
  page.on("request", (event) => {
    if (event.url().includes("example.invalid")) external.push(event.url());
  });
  try {
    await page.goto("/");
    await page.getByLabel("Seleccionar archivo local").setInputFiles({
      name,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: await syntheticDocx(`Documento sintético ${nonce}`),
    });
    await expect(
      page.getByText("Guarda en biblioteca para previsualizar texto y tablas."),
    ).toBeVisible();
    const created = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/documents") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Guardar en biblioteca", exact: true })
      .click();
    const response = await created;
    expect(response.status()).toBe(201);
    savedId = (await response.json()).id;
    const preview = page.getByTestId("docx-preview");
    await expect(preview).toContainText(`Documento sintético ${nonce}`);
    await expect(preview.locator("table")).toContainText("Celda de prueba");
    await expect(
      preview.locator("a, img, iframe, script, [style], [onclick]"),
    ).toHaveCount(0);
    await expect(page.getByText(/pueden diferir de Word/)).toBeVisible();
    // Defense in depth: even a compromised preview response must be inert in the client.
    await page.route(`**/api/documents/${savedId}/preview`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          html: '<p onclick="alert(1)">Texto permitido</p><img src="https://example.invalid/leak"><script>alert(1)</script><a href="https://example.invalid">Etiqueta de vínculo</a><table><tr><td style="background:url(https://example.invalid)">Tabla segura</td></tr></table><p>' + 'x'.repeat(40000) + '</p>',
          warnings: [],
        }),
      }),
    );
    await page
      .getByTestId("library-document")
      .filter({ hasText: name })
      .getByRole("button", { name: "Abrir", exact: true })
      .click();
    await expect(preview).toContainText("Texto permitido");
    await expect(preview).toContainText("Tabla segura");
    await expect(preview.getByText(/Vista parcial: este documento supera/)).toBeVisible();
    await expect(
      preview.locator("a, img, iframe, script, [style], [onclick]"),
    ).toHaveCount(0);
    expect(external).toEqual([]);
  } finally {
    if (savedId) await request.delete(`/api/documents/${savedId}`);
  }
});

test("paginates the real library and bounds a saved text preview to one MiB", async ({
  page,
  request,
}) => {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ids: string[] = [];
  try {
    for (let index = 0; index < 21; index++) {
      const content =
        index === 20
          ? `${nonce}\n${"x".repeat(1024 * 1024)}NOT_IN_PREVIEW`
          : `Texto sintético ${nonce} ${index}`;
      const response = await request.post("/api/documents", {
        multipart: {
          sensitivity: "unknown",
          file: {
            name: `pagina-${nonce}-${index}.txt`,
            mimeType: "text/plain",
            buffer: Buffer.from(content),
          },
        },
      });
      expect(response.status()).toBe(201);
      ids.push((await response.json()).id);
    }
    await page.goto("/");
    await expect(page.getByTestId("library-document")).toHaveCount(20);
    await page
      .getByTestId("library-document")
      .filter({ hasText: `pagina-${nonce}-20.txt` })
      .getByRole("button", { name: "Abrir", exact: true })
      .click();
    await expect(
      page.getByText("Vista parcial: se muestra el primer 1 MiB del archivo."),
    ).toBeVisible();
    await expect(page.getByTestId("text-preview")).not.toContainText(
      "NOT_IN_PREVIEW",
    );
    await expect(page.getByTestId("text-preview")).toContainText(nonce);
    await page
      .getByRole("button", { name: "Página siguiente", exact: true })
      .click();
    await expect(
      page.getByRole("navigation", { name: "Páginas de la biblioteca" }),
    ).toContainText("Página 2");
    await expect(
      page
        .getByTestId("library-document")
        .filter({ hasText: `pagina-${nonce}-0.txt` }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Página anterior", exact: true })
      .click();
    await expect(
      page.getByRole("navigation", { name: "Páginas de la biblioteca" }),
    ).toContainText("Página 1");
  } finally {
    for (const id of ids) await request.delete(`/api/documents/${id}`);
  }
});
