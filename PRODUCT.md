# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed by the user: React, TypeScript and Vite; NestJS for the future API; Python for future OCR/privacy jobs; PostgreSQL with pgvector. Docker Compose packages each component when its phase introduces it.

## Users

One person working locally on Windows with 8 GB RAM and 2 GB VRAM, while using other applications. Documents are in Spanish and English, often with tables and invoice figures.

## Product Purpose

Inspect documents, then eventually ask questions grounded in selected sources with verifiable citations. Phase 1 only selects and previews one local file.

## Operating Context

Files are selected by button or dragged onto the page. PDF, PNG, JPEG, TXT and Markdown are previewed locally. DOCX arrives in phase 2. No network upload, account, database, OCR or chat in phase 1.

## Capabilities and Constraints

50 MB per file; plain-text previews read at most 1 MiB. Invalid replacements preserve the previous selection. Canceling the picker preserves the current file. Replacing/removing a preview releases its object URL. Do not retain files after reload. Docker and native execution both need verification.

## Evidence on Hand

Product requirements in doc/PRD.md, architecture in doc/ARQUITEC.md, and approved phase 1 scope in doc/FASES.md. No brand assets or visual references have been supplied. No production performance has been measured.

## Product Principles

- Keep the first task small, obvious and reversible.
- Keep file contents on the device during phase 1.
- Prefer bounded memory and direct interaction over decorative complexity.
- Show unsupported formats and partial previews honestly.
- Stop for review after each phase.

## Accessibility & Inclusion

Keyboard-operable picker and controls, visible focus, readable Spanish labels, responsive layout and reduced-motion support.

## Open Decisions

Visual styling has not been specified by the user; implementation choices are provisional. The app's display name follows the workspace name, DocuExtractoChat.
