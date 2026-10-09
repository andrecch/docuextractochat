---
version: 1
slug: "apps-web-src-app-tsx"
primary_target: "apps/web/src/App.tsx"
related_targets: ["apps/web/index.html","apps/web/src/styles.css","apps/web/src/features/file-preview/Preview.tsx","apps/web/src/features/library/Library.tsx"]
---

# Local file preview and library

Mode: Operate.

## Scope and task

Phases 1–2 let one person on a local Windows computer select or drop one file, inspect it, then explicitly save it in a persistent local library. Spanish labels identify selection, saving and state. PDF, PNG, JPEG, TXT and Markdown preview locally; DOCX text and tables convert locally after saving and render through a sanitized view. DOCX layout can differ from Word; the original remains downloadable. Local NestJS and PostgreSQL store originals and metadata. No external servers, provider transfer, OCR or chat are implemented.

One file is accepted at a time, up to 50 MiB. Text reads are bounded to 1 MiB, displayed in parts of 32,768 UTF-16 code units while preserving surrogate pairs. Plain text and Markdown remain original text. Partial and failed previews are labelled. Invalid replacements and picker cancellation preserve the existing selection.

Selecting does not save. «Guardar en biblioteca» creates the local copy; sensitivity is Sin clasificar, Sensible or No sensible and never authorizes provider transfer. Originals and sensitivity survive reload and service restart. The library supports open, download, sensitivity changes and confirmed deletion, with 20 records per page. Loading, empty, unavailable and mutation feedback are explicit.

## Built direction

Inspection bench, grounded candidate 5, seed f1aa77c4. Code-led and provisional; no approved comp. The pale blue desk, navy text, cobalt controls, Public Sans and ruled panels match the direction contract in apps/web/index.html.

Desktop presents a compact masthead, heading, left file controls and a larger right evidence region. The centered main container is 1264px wide including padding. The workspace starts with a 340px control column, reducing to 300px at 950px. At 720px and below it stacks controls before evidence and reduces outer padding. At 1500px and above the workspace gains height.

The memorable moment is the empty document outline giving way to actual local evidence in the same reading surface. The selected-file row, toolbar link and footer identify what is open. Native PDF controls remain browser-owned; an explicit separate-tab link provides an alternative.

Saving and sensitivity sit below the selected-file row. The library follows the workspace in a white ruled container with filename-led rows and supporting metadata. Desktop actions sit beside each row; at 720px and below they wrap beneath metadata, the library heading stacks and page counts precede navigation buttons. Deletion confirmation expands within its row.

## Evidence and disposition

The phase 2 finish reviewer disposition is ship: persistence, fidelity and ceiling checks pass, with no material UI defects. Metadata now states that no external servers are used. Current evidence: .impeccable/review/phase02-desktop-library.png, phase02-mobile-library.png and phase02-pdf.png. The detector returned []; it was not rerun. Verification supplied: 16 browser tests pass in native and Docker execution, plus 6 API tests against real PostgreSQL.

## Unresolved

Visual identity remains a provisional code-led choice with no approved comp. OCR, privacy processing and chat remain outside this surface's recorded scope.
