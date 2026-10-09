---
version: 1
slug: "apps-web-src-app-tsx"
primary_target: "apps/web/src/App.tsx"
related_targets: ["apps/web/index.html","apps/web/src/styles.css","apps/web/src/features/file-preview/Preview.tsx"]
---

# Local file preview

Mode: Operate.

## Scope and task

Phase 1 lets one person on a local Windows computer select or drop one file, inspect it, then replace or remove it. Spanish interface text identifies the action and state. PDF, PNG, JPEG, TXT and Markdown preview locally. No API, upload, account, storage, OCR or chat is present.

One file is accepted at a time, up to 50 MiB. Text reads are bounded to 1 MiB, displayed in parts of 32,768 UTF-16 code units while preserving surrogate pairs. Plain text and Markdown remain original text. Partial and failed previews are labelled. Invalid replacements and picker cancellation preserve the existing selection.

## Built direction

Inspection bench, grounded candidate 5, seed f1aa77c4. Code-led and provisional; no approved comp. The pale blue desk, navy text, cobalt controls, Public Sans and ruled panels match the direction contract in apps/web/index.html.

Desktop presents a compact masthead, heading, left file controls and a larger right evidence region. The centered main container is 1264px wide including padding. The workspace starts with a 340px control column, reducing to 300px at 950px. At 720px and below it stacks controls before evidence and reduces outer padding. At 1500px and above the workspace gains height.

The memorable moment is the empty document outline giving way to actual local evidence in the same reading surface. The selected-file row, toolbar link and footer identify what is open. Native PDF controls remain browser-owned; an explicit separate-tab link provides an alternative.

## Evidence and disposition

The finish reviewer disposition supplied for documentation is ship, with no material fix. Required current screenshots: .impeccable/review/desktop.png, desktop-selected.png, mobile.png and pdf-native.png. These evidence the empty desktop, selected text, stacked mobile and native PDF states.

## Unresolved

Visual identity remains a provisional implementation choice. Future product phases are outside this surface's recorded scope.
