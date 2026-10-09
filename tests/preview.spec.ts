import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { png, samplePdf } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
});

test("selects, replaces, clears and reselects a local text file", async ({
  page,
}) => {
  const picker = page.getByLabel("Seleccionar archivo local");
  await picker.setInputFiles({
    name: "notas.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Primera nota"),
  });
  await expect(page.getByTestId("text-preview")).toHaveText("Primera nota");
  await expect(
    page.getByRole("button", { name: "Quitar archivo" }),
  ).toBeVisible();
  await picker.setInputFiles({
    name: "notas.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Otra nota"),
  });
  await expect(page.getByTestId("text-preview")).toHaveText("Otra nota");
  await page.getByRole("button", { name: "Quitar archivo" }).click();
  await expect(page.getByText("Aquí empieza tu documento.")).toBeVisible();
  await picker.setInputFiles({
    name: "notas.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Primera nota"),
  });
  await expect(page.getByTestId("text-preview")).toHaveText("Primera nota");
});

test("accepts a real dropped file and rejects multiple files without losing the preview", async ({
  page,
}) => {
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(
      new File(["Documento arrastrado"], "arrastrado.md", {
        type: "text/markdown",
      }),
    );
    return data;
  });
  await page
    .getByTestId("drop-zone")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await expect(page.getByTestId("text-preview")).toHaveText(
    "Documento arrastrado",
  );
  const several = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(["Uno"], "uno.txt"));
    data.items.add(new File(["Dos"], "dos.txt"));
    return data;
  });
  await page
    .getByTestId("drop-zone")
    .dispatchEvent("drop", { dataTransfer: several });
  await expect(page.getByRole("alert")).toContainText("un solo archivo");
  await expect(page.getByTestId("text-preview")).toHaveText(
    "Documento arrastrado",
  );
});

test("handles cancellation and unsupported, empty and mismatched files", async ({
  page,
}) => {
  const picker = page.getByLabel("Seleccionar archivo local");
  await picker.setInputFiles({
    name: "válido.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Contenido válido"),
  });
  await picker.setInputFiles([]);
  await expect(page.getByTestId("text-preview")).toHaveText("Contenido válido");
  for (const [name, data, message] of [
    ["informe.docx", "word", "no corresponde"],
    ["datos.csv", "a,b", "Formato no admitido"],
    ["vacío.txt", "", "vacío"],
    ["falso.pdf", "No es PDF", "no corresponde"],
    ["falso.png", "No es imagen", "no corresponde"],
    ["binario.txt", "\0contenido", "datos binarios"],
  ]) {
    await picker.setInputFiles({
      name,
      mimeType: "application/octet-stream",
      buffer: Buffer.from(data),
    });
    await expect(page.getByRole("alert")).toContainText(message);
    await expect(page.getByTestId("text-preview")).toHaveText(
      "Contenido válido",
    );
  }
  await page.getByRole("button", { name: "Cerrar mensaje de error" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("rejects files over 50 MiB while preserving the current selection", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
  await expect(page.getByTestId("text-preview")).toBeVisible();
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
    const data = new DataTransfer();
    data.items.add(
      new File([new Uint8Array(50 * 1024 * 1024 + 1)], "grande.txt"),
    );
    input.files = data.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByRole("alert")).toContainText("supera los 50 MB");
  await expect(page.getByTestId("text-preview")).toContainText(
    "Un documento de ejemplo",
  );
});

test("only reads the first MiB of text and never renders embedded HTML", async ({
  page,
}) => {
  const content =
    '<img src="https://example.invalid/private" onerror="alert(1)">\n' +
    "a".repeat(1024 * 1024) +
    "NOT_READ";
  await page.getByLabel("Seleccionar archivo local").setInputFiles({
    name: "largo.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(content),
  });
  await expect(
    page.getByText("Vista parcial: se muestra el primer 1 MiB del archivo."),
  ).toBeVisible();
  expect((await page.getByTestId("text-preview").textContent())?.length).toBe(
    32 * 1024,
  );
  await expect(page.getByText("Parte 1 de 32", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText("Parte 2 de 32", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(page.getByTestId("text-preview")).toContainText(
    '<img src="https://example.invalid/private"',
  );
  await expect(page.getByTestId("text-preview").locator("img")).toHaveCount(0);
  await expect(page.getByTestId("text-preview")).not.toContainText("NOT_READ");
  const opened = await page
    .getByRole("link", { name: "Abrir vista parcial" })
    .getAttribute("href");
  expect(opened).toMatch(/^blob:/);
});

test("previews an image and prepares a PDF for the native viewer", async ({
  page,
}) => {
  await page
    .getByLabel("Seleccionar archivo local")
    .setInputFiles({ name: "imagen.png", mimeType: "image/png", buffer: png });
  const image = page.getByRole("img", { name: "Vista previa de imagen.png" });
  await expect(image).toBeVisible();
  expect(
    await image.evaluate(
      (element: HTMLImageElement) =>
        element.complete && element.naturalWidth > 0,
    ),
  ).toBeTruthy();
  await page.getByLabel("Seleccionar archivo local").setInputFiles({
    name: "documento.pdf",
    mimeType: "application/pdf",
    buffer: samplePdf(),
  });
  await expect(
    page.locator('iframe[title="Vista previa de documento.pdf"]'),
  ).toBeVisible();
  await expect(
    page.getByText("Si tu navegador no muestra el PDF,"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Abrir archivo", exact: true }),
  ).toHaveAttribute("href", /^blob:/);
});

test("discards an obsolete asynchronous read after a faster replacement", async ({
  page,
}) => {
  await page.evaluate(() => {
    const original = File.prototype.slice;
    File.prototype.slice = function (...args) {
      const blob = original.apply(this, args);
      if (this.name === "lento.txt") {
        const read = blob.arrayBuffer.bind(blob);
        blob.arrayBuffer = () =>
          new Promise((resolve) =>
            setTimeout(() => void read().then(resolve), 350),
          );
      }
      return blob;
    };
  });
  const picker = page.getByLabel("Seleccionar archivo local");
  await picker.setInputFiles({
    name: "lento.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Viejo"),
  });
  await picker.setInputFiles({
    name: "rápido.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Actual"),
  });
  await expect(page.getByTestId("text-preview")).toHaveText("Actual");
  await page.waitForTimeout(450);
  await expect(page.getByTestId("text-preview")).toHaveText("Actual");
});

test("releases object URLs after ten replacements and removal", async ({
  page,
}) => {
  await page.evaluate(() => {
    const active = new Set<string>();
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      active.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      active.delete(url);
      revoke(url);
    };
    (
      window as unknown as { activePreviewUrls: Set<string> }
    ).activePreviewUrls = active;
  });
  for (let index = 0; index < 10; index++) {
    await page.getByLabel("Seleccionar archivo local").setInputFiles({
      name: `nota-${index}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from(`Contenido ${index}`),
    });
    await expect(page.getByTestId("text-preview")).toHaveText(
      `Contenido ${index}`,
    );
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { activePreviewUrls: Set<string> })
            .activePreviewUrls.size,
      ),
    ).toBe(1);
  }
  await page.getByRole("button", { name: "Quitar archivo" }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { activePreviewUrls: Set<string> })
          .activePreviewUrls.size,
    ),
  ).toBe(0);
});

test("does not upload or make external requests and clears selection on reload", async ({
  page,
}) => {
  const unexpected: string[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      (/^https?:/.test(request.url()) &&
        new URL(request.url()).origin !== new URL(page.url()).origin)
    )
      unexpected.push(request.url());
  });
  await page.getByLabel("Seleccionar archivo local").setInputFiles({
    name: "privado.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Empresa privada de prueba"),
  });
  await expect(page.getByTestId("text-preview")).toContainText(
    "Empresa privada",
  );
  expect(unexpected).toEqual([]);
  expect(pageErrors).toEqual([]);
  await page.reload();
  await expect(page.getByText("Aquí empieza tu documento.")).toBeVisible();
});

test("the selector works with keyboard and the mobile layout does not overflow", async ({
  page,
}) => {
  const button = page.getByRole("button", {
    name: "Seleccionar archivo",
    exact: true,
  });
  await button.focus();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.keyboard.press("Enter"),
  ]);
  await chooser.setFiles({
    name: "teclado.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Selección por teclado"),
  });
  await expect(page.getByTestId("text-preview")).toHaveText(
    "Selección por teclado",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Seleccionar archivo", exact: true }),
  ).toBeVisible();
});

test("captures desktop and mobile evidence and measures interaction and heap", async ({
  page,
}, testInfo) => {
  await mkdir(".impeccable/review", { recursive: true });
  await page.screenshot({
    path: ".impeccable/review/desktop.png",
    fullPage: true,
  });
  const measurements = await page.evaluate(async () => {
    const start = performance.now();
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Probar con un ejemplo"))!
      .click();
    while (!document.querySelector('[data-testid="text-preview"]'))
      await new Promise((resolve) => setTimeout(resolve, 10));
    const memory = (
      performance as Performance & { memory?: { usedJSHeapSize: number } }
    ).memory;
    return {
      exampleInteractionMs: performance.now() - start,
      jsHeapBytes: memory?.usedJSHeapSize ?? null,
    };
  });
  await testInfo.attach("browser-measurements", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  await page.screenshot({
    path: ".impeccable/review/desktop-selected.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Quitar archivo" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".impeccable/review/mobile.png",
    fullPage: true,
  });
});

test("bounds retained JavaScript heap after ten large text replacements", async ({
  page,
}, testInfo) => {
  const session = await page.context().newCDPSession(page);
  await session.send("HeapProfiler.collectGarbage");
  const before = await session.send("Runtime.getHeapUsage");
  for (let index = 0; index < 10; index++) {
    await page.getByLabel("Seleccionar archivo local").setInputFiles({
      name: `large-${index}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.alloc(1024 * 1024, String(index)),
    });
    await expect(page.getByTestId("text-preview")).toBeVisible();
    await expect(
      page.getByText(`large-${index}.txt`, { exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Quitar archivo" }).click();
  await expect(page.getByTestId("text-preview")).toHaveCount(0);
  await session.send("HeapProfiler.collectGarbage");
  const after = await session.send("Runtime.getHeapUsage");
  await testInfo.attach("retained-heap", {
    body: JSON.stringify(
      {
        beforeBytes: before.usedSize,
        afterBytes: after.usedSize,
        increaseBytes: after.usedSize - before.usedSize,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  // A leaked 1 MiB copy per replacement would exceed this deliberately broad bound.
  expect(after.usedSize - before.usedSize).toBeLessThan(5 * 1024 * 1024);
});
