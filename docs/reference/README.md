# Visual reference — the founder's reference film

> **There are two films now.** This file covers the first one (ArgusVPN), which
> supplies the _light-form language_ — one enormous luminous object per section.
> The second (Eduwerks, supplied 2026-08-29) supplies the _layout grammar_ — how
> chapters divide, join and vary — and lives at
> [`film-2/README.md`](./film-2/README.md). Read that one before changing the
> shape of a section; read this one before changing what is lit inside it.
>
> Two things below are now out of date and are corrected there: warning 4 says
> the page has two dark exceptions, and it has three (hero, products, close);
> and the note that `Statement` and `RecentPosts` "have no counterpart in the
> film" was true of the first film only.

Stills pulled from the reference film the founder supplied (an ArgusVPN concept
piece, 18s, 1600×1200). They live here so a session working on the marketing
surface can look at the thing directly instead of re-extracting frames from a
video that lives outside the repo.

Source video: `~/Downloads/original-8d07903495d53d058b2306651422c640.mp4`
(not committed — 14 MB, and the stills are what anyone actually needs).

Re-extract more with the `watch` skill, or directly:

```bash
ffmpeg -ss 9.4 -i "$VIDEO" -frames:v 1 -vf "scale=1100:-1" -q:v 4 out.jpg
```

---

## Read these two warnings first

**1. Every frame is perspective-warped.** The film is a rotating camera over a
tablet on a desk, so nothing in it is square to the viewer and the camera moves
between every frame. Proportions measured straight off a still are wrong —
sometimes by a lot. Read everything as a _ratio_ (this curve spans about
two-fifths of that one; this apex rises about a sixth of its own chord) and
solve for real coordinates. Measuring absolute pixels off these frames is the
single biggest time sink there is on this material; it cost most of a session on
the hero before the lesson took.

**2. This is a competitor's finished brand, not ours.** It is here for its
_visual language_ — the light-forms, the layering, the pacing, the way type sits
in the composition. The name, the wordmark, the violet-blue palette and the copy
are ArgusVPN's and none of it goes into our build. Softmato keeps its own name
and its own green (`--glow`, `--glow-core`, `--glow-deep` in `globals.css`).
When in doubt: take the _structure_, leave the _identity_.

**3. Take the treatment, replace the subject.** This is the most important line
in this file. Every form in the film is a _VPN_ metaphor — a globe because they
sell server locations, an eclipse because they sell anonymity, a comet through a
sphere because they sell data in transit. Softmato builds software, websites and
apps. Lifting the globe into our "where we are" section produces a page that
looks expensive and says nothing true about us. What transfers is the _craft_:
one enormous luminous object per section, lit from behind, held on a quiet
ground, with the type kept small and calm beside it. What the object _is_ has to
come from our own work. See "What the forms should be about" below.

**4. Our surface is light; the film's is black throughout.** The public site is
a near-white ground with two dark exceptions (the hero band and
`ProductsSection`). A form that reads as a glowing object on black becomes a
pale stain on white — this is already documented at the top of `marketing.css`
and it is why the 3D forms are lit from _behind_ into a silhouette with a
burning limb rather than lit from the front. Judge every new form on the ground
it will actually sit on, not on a black canvas.

---

## The frames, and what to take from each

The last column is the **composition** worth stealing. The subject inside it is
not — see warning 3.

| Frame                          | Time  | What it shows                                                                 | Treatment to take                                                                                                           |
| ------------------------------ | ----- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `01-hero-settled.jpg`          | 2.9s  | The bowl of light, wide-tracked wordmark, dome with a crescent on its rim     | **Hero — already built.** Here as the language everything below should agree with                                           |
| `02-fast-reliable-safe.jpg`    | 5.4s  | Split: huge left headline, device mockup right, CTA, violet perspective floor | Asymmetric split with a real product surface on one side. Fits `ProductsSection`, the one section that inverts to dark      |
| `03-grid-floor-planet.jpg`     | 7.4s  | Perspective grid floor at full strength, an object rising behind it           | The `.grid-floor` treatment (already in `marketing.css`) as a horizon something sits on                                     |
| `04-data-protection-comet.jpg` | 9.4s  | Large sphere, a comet streaking across it, headline below, two small cards    | One hero object dead centre with a single moving highlight, type _below_ it, small cards under that. Fits `ServicesSection` |
| `05-eclipse-flare-peak.jpg`    | 11.4s | The eclipse at its hottest: dark body, hot rim flare on one side              | A form defined by its lit edge rather than its surface — the strongest idea in the film. Fits `PrinciplesSection`           |
| `06-completely-anonymous.jpg`  | 13.4s | Same form settled, headline, a row of five feature icons                      | The settle-to-quiet state, and a clean icon row under a big form                                                            |
| `07-many-locations-globe.jpg`  | 15.4s | Dot-matrix globe, two stats flanking it, headline below                       | Object built from _many small elements_, with figures set either side of it. Fits `PlaceSection`                            |
| `08-closing-cta.jpg`           | 17.4s | Centred question, one button, device mockup below                             | Quiet centred close — one question, one action                                                                              |

`Statement` and `RecentPosts` have no counterpart in the film. They are ours to
invent, and they should be the quiet moments — the film earns its big forms by
not having one in every scene.

---

## What the forms should be about

Softmato builds software, websites and apps. The forms should say that, and the
brief from the founder is **positive, clean, professional** — not the film's
moody surveillance mood. Directions worth exploring, roughly one per section:

- **Something being assembled** — planes, panels or blocks converging into one
  solid, or a wireframe resolving into a surface. Reads as _building software_
  without a single literal icon.
- **Layers / stacked glass** — parallel translucent planes seen at an angle, the
  way an architecture diagram wants to look. Natural fit for a services section
  that lists distinct offerings.
- **A lattice of nodes and links** — the dot-globe's _technique_ (many small
  elements making one form) applied to a network, a graph, a dependency mesh.
- **A device surface, honestly rendered** — a real screen showing real product
  UI, floating on the grid floor. The most direct thing an agency can show is
  the work, and frame 02 is the composition for it.
- **A quiet solid** — torus, knot, or a single soft-edged geometric mass, slowly
  turning. The right answer for a section whose job is to be calm.

Two things to hold to across all of them: **one form per section, never two**,
and the light does the work — the object is mostly silhouette with a bright edge,
not a fully-lit grey model. Variety should come from the _forms_, not from
turning up the effects.

---

## What already exists, so it does not get rebuilt

The 3D layer is scaffolded and working. `components/three/` has react-three-fiber
behind a `LightForm` component with three forms in `components/three/forms/`:
`orb`, `eclipse`, `point-globe`. Adding a fourth means adding a section, not a
variant.

Two constraints on that layer that are load-bearing and were paid for:

- **`LightForm` mounts on approach, not on load.** Three canvases booting during
  first paint put a 454ms task straight through the hero's entrance. See
  `components/three/use-near-viewport.ts`. Anything new added here keeps that
  gate.
- **Every section paints its own bloom in CSS underneath the canvas**, so it
  reads as finished whether the scene arrives, arrives late, or never arrives.
  That is what makes deferring the scenes safe, and it should stay true of any
  new section.

For the hero's own conventions — why the ground is black, why glow is built from
gradients rather than `filter: blur()`, why the blurred half of a form may only
ever change opacity — read the header comment in `apps/web/app/marketing.css`
and the notes in `components/public/home/hero-arc.tsx`.
