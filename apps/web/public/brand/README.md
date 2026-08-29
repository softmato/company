# Brand assets

Three master images. Everything else in this folder is generated from them by
`pnpm brand:build` — do not hand-edit a generated file, it will be overwritten.

| File        | What it is                                          | Where it is used                                       |
| ----------- | --------------------------------------------------- | ------------------------------------------------------ |
| `logo.png`  | Horizontal lockup: emblem + "Softmato" + TECHNOLOGY | Organization logo in structured data, social card      |
| `mark.png`  | The standalone S glyph                              | Favicon, Apple touch icon, PWA manifest icons          |
| `stamp.png` | Circular seal, "…PVT LTD · KATHMANDU, NEPAL"        | Receipts and invoices only — never on a marketing page |

## Requirements for the masters

- **Any flat background works.** Transparent, solid white, or solid black — the
  build detects which and keys it out (`keyFlatBackground`). It cannot rescue a
  master exported on a gradient, a photo, or an off-white; those come through
  as a visible box on the social card, and the build warns when it sees one.
- **`mark.png` and `stamp.png`: at least 512px on the short side.** The
  generator only ever scales down, so detail not in the master is gone.
- **`logo.png`: at least 1000px wide.** It is drawn into the 1200×630 social
  card at roughly half width, and an upscaled logo there looks fake.

## Palette

The brand is **green**, matching `--primary` (`#047857`) in globals.css.

`mark.png` and `logo.png` were replaced with green versions on 2026-08-29,
which covers every public surface: favicon, touch icon, manifest icons, the
social card and `Organization.logo`.

`stamp.png` is deliberately still the navy/teal seal. It is not a public brand
surface — it appears only on receipts and invoices, where navy reads as stamped
ink rather than as the brand's accent. Replace it only if you want it to
match.

Nothing in code refers to a colour — every surface reads these files. To
rebrand again, replace the masters and re-run `pnpm brand:build`.

## Generated files

- `mark-192.png`, `mark-512.png` — PWA manifest icons
- `logo-og.png` — the lockup with its white canvas keyed out and the border
  trimmed, for the social card
- `../../app/favicon.ico` — 16/32/48 in one container, for `/favicon.ico`,
  which Chrome requests by path before it reads the `<link rel="icon">` tag.
  **Do not delete this and rely on `icon.png`** — Next serves whatever sits
  here, and the framework's boilerplate triangle was showing in the tab of a
  fully branded site until this was generated.
- `../../app/icon.png` — the `<link rel="icon">` PNG (transparent)
- `../../app/apple-icon.png` — Apple touch icon (opaque white; iOS composites
  transparency onto black, not onto the wallpaper)

Run after replacing any master:

```
pnpm brand:build
```
