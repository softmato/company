# Brand assets

Three master images. Everything else in this folder is generated from them by
`pnpm brand:build` — do not hand-edit a generated file, it will be overwritten.

| File        | What it is                                          | Where it is used                                        |
| ----------- | --------------------------------------------------- | ------------------------------------------------------- |
| `logo.png`  | Horizontal lockup: emblem + "Softmato" + TECHNOLOGY | Organization logo in structured data, social card        |
| `mark.png`  | The standalone S glyph                              | Favicon, Apple touch icon, PWA manifest icons            |
| `stamp.png` | Circular seal, "…PVT LTD · KATHMANDU, NEPAL"        | Receipts and invoices only — never on a marketing page   |

## Requirements for the masters

- **PNG, square-ish canvas for `mark.png` and `stamp.png`**, at least 512×512.
  The generator only ever scales down, so a small master cannot be recovered.
- **`logo.png` at least 1000px wide.** It is drawn into the 1200×630 social
  card at roughly half width, and an upscaled logo there looks like a fake.
- **Transparent background preferred.** A white background still works — the
  social card and the icons are composed on a light ground for exactly that
  reason — but transparency is what lets the mark sit on the dark bands.

## Generated files

- `mark-192.png`, `mark-512.png` — PWA manifest icons
- `logo-og.png` — the lockup with its white canvas keyed out and the border
  trimmed, for the social card
- `../../app/icon.png` — favicon (transparent)
- `../../app/apple-icon.png` — Apple touch icon (opaque white; iOS composites
  transparency onto black, not onto the wallpaper)

Run after replacing any master:

```
pnpm brand:build
```
