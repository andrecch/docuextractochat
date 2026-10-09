---
name: DocuExtractoChat
description: A local document inspection desk with cobalt actions and ruled pale-blue surfaces.
colors:
  accent: "#273fc8"
  ink: "#202b4b"
  muted: "#596581"
  ground: "#eef1f8"
  surface: "#fff"
  line: "#dce1ed"
  accent-soft: "#e8edff"
  focus: "#2740ca"
typography:
  headline:
    fontFamily: '"Public Sans Variable", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(29px, 3vw, 38px)"
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"Public Sans Variable", ui-sans-serif, system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 650
  body:
    fontFamily: '"Public Sans Variable", sans-serif'
    fontSize: "13px"
    lineHeight: 1.85
  label:
    fontFamily: '"Public Sans Variable", ui-sans-serif, system-ui, sans-serif'
    fontSize: "11px"
rounded:
  compact: "5px"
  icon: "6px"
  control: "7px"
spacing:
  tight: "8px"
  compact: "12px"
  regular: "16px"
  roomy: "20px"
  panel: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "#1d30a2"
  button-secondary:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  button-icon:
    rounded: "{rounded.icon}"
    size: "36px"
  phase-label:
    textColor: "{colors.muted}"
    rounded: "{rounded.compact}"
    padding: "8px 12px"
---

# Design System: DocuExtractoChat

## Overview

**Creative North Star: "The Local Inspection Desk"**

A pale blue work surface, deep navy ink and cobalt actions make a small, practical document tool. Public Sans provides the same readable voice for controls and document text. Ruled white panels distinguish tools from evidence without ornamental depth.

This record derives from the current implementation and its desktop, selected-file, mobile and native-PDF renders. The code-led visual direction is provisional: no user-approved comp or established brand assets exist. This describes the built world; future capabilities must not be inferred from it.

**Key Characteristics:**

- A cool, lightly tinted ground surrounding white working surfaces.
- Cobalt for actions and active evidence state.
- One readable sans-serif family with a restrained hierarchy.
- Fine dividers and softened corners instead of shadows.

## Colors

The palette pairs navy text with cool neutral surfaces and one cobalt action family.

### Primary

- **Cobalt Action** (`accent`): selection buttons, action links, file symbols and the active preview indicator.
- **Cobalt Focus** (`focus`): visible keyboard outlines.
- **Pale Cobalt** (`accent-soft`): supporting action and symbol backgrounds.

### Neutral

- **Navy Ink** (`ink`): primary headings and interface text.
- **Slate Text** (`muted`): supporting explanation, metadata and status.
- **Blue Work Surface** (`ground`): page background.
- **White Paper** (`surface`): working panels, toolbar and reading surface.
- **Cool Rule** (`line`): panel divisions and metadata boundaries.

### Named Rules

**The Action Color Rule.** Cobalt identifies an action or active state; reading surfaces remain neutral.

## Typography

**Display Font:** Public Sans Variable, with UI sans-serif and system fallbacks.
**Body Font:** Public Sans Variable.
No separate decorative display or monospaced label face is used.

**Character:** Compact, matter-of-fact lettering gives controls a clear voice while leaving the document readable. Weight and spacing establish hierarchy within one family.

### Hierarchy

- **Headline:** fluid page heading, with moderate weight and slightly tightened tracking.
- **Title:** compact, stronger panel headings.
- **Body:** original text preview with generous line spacing and a maximum measure of 75ch. Introductory copy uses a slightly larger size and tighter leading.
- **Label:** supporting descriptions and links. Metadata ranges from 10px to 12px; these small values describe the current build, not a mandate to shrink future content.
- Empty-state messages use an intermediate 21px size, reducing to 20px on mobile.

### Named Rules

**The Single Voice Rule.** Use Public Sans for interface and plain-text evidence; establish hierarchy through size, weight and spacing.

## Layout

Use constrained, centered working surfaces with compact controls and enough space for evidence. Repeated gaps and padding draw from the recorded spacing steps. Panels use fine internal dividers; content can scroll independently when its height is bounded.

Responsive layouts reduce outer padding and move side-by-side regions into reading order. The current surface's column widths, masthead and first-viewport composition are recorded in its surface brief rather than made global requirements.

## Elevation & Depth

No box shadows are used. White paper, pale tinted backgrounds and thin cool rules communicate structure. Hover changes fill or text decoration; focus uses a visible cobalt outline (3px, with 5px offset).

**The Ruled Surface Rule.** Distinguish adjacent working regions with tonal surfaces and fine dividers before adding depth.

## Shapes

Controls have gently softened corners. Compact metadata uses the small corner step, icon actions the icon step and filled buttons the control step. Larger work containers have broader corners without becoming pill-shaped. Line icons are inline SVG with rounded caps and joins; status dots are circular.

## Components

### Buttons

Compact and direct. Filled actions use cobalt and white, a minimum height of 44px and the recorded control padding. Primary hover darkens the fill. Supporting actions use pale cobalt with cobalt text. Text actions use cobalt, underlining on hover. Icon buttons are transparent at rest and gain a soft neutral fill on hover. All interactive controls retain the visible focus outline.

### Chips

The phase label is quiet outlined metadata, with muted text and compact corners. It is informational rather than an interactive filter.

### Cards / Containers

Working containers use white surfaces, fine borders and no shadows. Larger container corners are softer than control corners. Interior padding commonly uses the panel step. Avoid treating every line of supporting copy as a separate card.

### File Drop Target

A pale tinted region with a dashed cool border, a line upload symbol and a filled selection action. Drag-over changes the border to solid cobalt and strengthens the background tint. It always retains a button alternative.

### Selected File Row

A compact symbol, single-line ellipsized filename, secondary format/size metadata and a remove action. Preserve the filename's full value through its title and retain a readable remove label for assistive technology.

### Preview and Feedback

Toolbar, content and footer remain distinct through fine rules. Text is shown as original text; image content fits its viewport; PDF chrome belongs to the browser and is not part of this design system. Errors use pale red with dark red text, and partial previews use a pale blue notice. Feedback appears in context and remains explicit.

### Navigation

There is no global navigation menu in the current build. Text-part navigation is a bordered, sticky control row with clear previous/next buttons and disabled end states.

## Do's and Don'ts

### Do:

- **Do** use cobalt for actions and active state, with neutral reading surfaces.
- **Do** preserve visible keyboard focus and reduced-motion behavior.
- **Do** use fine dividers and tone to distinguish working regions.
- **Do** keep original document content readable and show partial or failed previews explicitly.

### Don't:

- **Don't** substitute glyph characters for the implemented SVG icons.
- **Don't** inherit browser PDF toolbar colors, icons or typography as application tokens.
- **Don't** turn this surface's first viewport or future product phases into global visual requirements.
