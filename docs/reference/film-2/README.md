# Visual reference — the second film (layout grammar)

Stills from the second film the founder supplied, on 2026-08-29. Where the
first film (`docs/reference/film/`) supplies the **light-form language** — one
enormous luminous object per section, lit from behind — this one supplies the
**layout grammar**: how a page is divided into chapters, how one chapter hands
over to the next, and what each chapter is allowed to be shaped like.

Source video: `~/Downloads/original-020e5afec3b51c1ef21a46463054bcbe.mp4`
(not committed — 24s, 1600×1200, 30fps). Re-extract densely with:

```bash
ffmpeg -i "$VIDEO" -vf "fps=4,scale=860:-1" -q:v 4 out/f_%03d.jpg
```

**Extract densely, at 4fps or more.** At one frame a second every transition in
this film reads as a cut, and the transitions are the most transferable thing in
it — the sheet sliding up behind a radius, the panel cross-fading mid-swap, the
tags falling before they settle. All three were invisible at 1fps and obvious at
4fps.

---

## Read these two warnings first

**1. It is a competitor's finished brand, not ours.** Eduwerks. The glossy
multi-colour blobs, the magenta and yellow annotation scribbles, the doodled
smiley, the name and the copy are all theirs. None of it is in our build.
Softmato keeps its own emerald on near-white (`globals.css`) and its own marks
(`components/public/marks/`), which take `currentColor` and appear at most once
per section.

**2. Take the structure, leave the subject.** Its "Benefits" chapter drops
fifteen adjectives about teaching. Ours drops fourteen things a client can check
after handover. The _shape_ — a heap rather than a list — is what transfers;
what is in the heap has to come from what is true about us. Same rule as the
first film. See `docs/reference/README.md`, warning 3.

---

## The frames, and what each one is for

| Frame                               | t      | What it shows                                                                                 | What we took                                                                 |
| ----------------------------------- | ------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `01-hero-orbiting-objects.jpg`      | 1.0s   | Objects drifting continuously around a fixed headline                                         | Nothing. **Our hero is done and stays as built.** Here for the pacing only   |
| `02-sheet-rising-over-hero.jpg`     | 2.75s  | The light section sliding up over the dark hero behind a large top radius                     | `.band-dark` — the join that lets a page carry more than one dark chapter    |
| `03-two-tone-heading-and-discs.jpg` | 4.0s   | A four-line heading alternating full-contrast and washed-out words, over scattered soft discs | `ToneReveal` and `.disc` — the opening statement                             |
| `04-held-panel-first-step.jpg`      | 6.25s  | A panel held still on the left while copy scrolls on the right                                | The services chapter's whole shape                                           |
| `05-held-panel-mid-swap.jpg`        | 8.5s   | The two panel states cross-fading as the active step changes                                  | Opacity only, 500ms — `services-chapter.tsx`                                 |
| `06-tags-falling.jpg`               | 12.25s | Pills falling from above under gravity, mid-tumble                                            | `PillPile`, Matter.js — the principles chapter                               |
| `07-tags-settled.jpg`               | 13.75s | The same pills at rest in a heap                                                              | The resting layout in `lib/home/qualities.ts`, which is also the no-JS state |
| `08-photo-masonry.jpg`              | 15.75s | Photographs at slight rotations, hand-drawn doodles between them                              | The tilted, drifting photograph in the place section                         |
| `09-closing-annotated.jpg`          | 20.5s  | Dark close, heading with a drawn underline and a circled word, one link                       | `ClosingCta` and `MarkCircle`                                                |

## The five rules the film actually teaches

1. **A dark section joins with a radius, never a straight edge.** This is the
   whole reason our page can now open on night and close on night with the
   products band between. A hard edge at those positions reads as stripes.
2. **Two tones in one sentence.** The dim words are the connective tissue and
   the full ones carry the claim; read the full ones alone and the headline
   should still say something.
3. **One shape per chapter, never repeated.** The film uses six shapes in six
   chapters. Ours uses eight in eight. A card grid twice is one shape used
   twice.
4. **The section that demonstrates beats the section that describes.** Its best
   minute is the held panel, because for that minute the page is showing rather
   than telling. We have exactly one of those and it is the services chapter.
5. **Marks are drawn, not faded.** A mark that fades on is a graphic; a mark
   that draws on is somebody's hand. `DrawIn`, `stroke-dashoffset`.

## The closing form, which is ours

The film closes on a 3D object of its own — a glossy blob, its brand. Ours is a
carousel of four surfaces: a website, an app, a product dashboard, a design
artboard, turning slowly inside the bowl of the closing arc.

Three things about it are worth keeping if it is ever rebuilt:

1. **It shows the work, not a metaphor.** Every other section on the page carries
   a light-form that stands for something — an orb, a globe of points. One screen
   above a contact button that is the wrong instrument, and all four things this
   company sells happen to have a shape a reader recognises before reading it.
2. **The panels are canvas textures, not geometry.** Each drawing is 2D canvas
   painted once (`components/three/forms/surfaces/`) and mapped onto one plane.
   Built from meshes it would be fifty per panel.
3. **It is bounded by the arc, not by the band.** Sized to sit inside the bowl.
   The first pass filled the whole section and ran over the copy, because the
   front panel of a carousel is nearer the camera than the group's centre and is
   magnified accordingly — the radius and the panel size have to be tuned
   together, never one at a time.

## What we deliberately did not take

- **The blobs.** Fifteen glossy multi-colour 3D objects are that brand. Our
  light-forms are one per section and emerald.
- **The stat bubbles' contents.** "800 schools", "15K educators". Every one is a
  claim about a business. The discs kept the composition and carry craft names.
- **The testimonial masonry.** Photographs of named people saying things about
  the product. We have none that are real, and the rule is that they wait until
  we do. `docs/reference/README.md` and the standing note about figures.
- **The pricing link in the nav.** No figure appears on this site; the tier
  ladder and three questions in the contact form do that work instead.
