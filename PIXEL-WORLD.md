# DunaTerp pixel world — design and handover

2026-09-08. Replaces the Three.js/Rapier homepage with a 2D pixel-art salt lake.
Written against the previous source; no scientific page content was touched.

## Why 2D and not pixelated 3D

*Stardew Valley*'s register is orthographic top-down 2D at a fixed tile size.
Rendering 3D and pixelating it (the *Fez* / *Crossy Road* route) lands between
the two and reads as neither. Going to a real 2D canvas also removed `three`
(629 KB) and `@dimforge/rapier3d-compat` (2.40 MB) from the homepage, which was
the largest outstanding item in `UI-REVIEW.md`.

| | before | after |
| --- | --- | --- |
| homepage chunk | 31 KB + three 629 KB + rapier 2.40 MB | 49 KB |
| homepage gzip | ~1.15 MB | 18 KB |

## Two travel modes, one world

The page is still a long scroll document with a `position: sticky` canvas.

- **Guided.** Scroll position drives the hero along the boardwalk through a
  damped spring (stiffness 70, damping 15, speed cap 0.48 — carried over from
  the 3D version, because the momentum was the good part). Six stations fire a
  chapter card as the hero reaches them. The camera drifts toward the station
  that is coming up, so a landmark is always framed rather than sitting just
  past the edge of the viewport.
- **Free.** Any movement key, or the on-screen button, hands the same hero to
  the keyboard. The page scroll is pinned while free roam is active, and on
  exit the scroll position is restored to wherever the hero actually is, so
  wandering never loses the reader's place in the document. `Esc` returns; the
  hero eases back onto the route over 0.7 s.

Both modes share one collision grid, one camera and one sprite. Interaction is
proximity-based: standing near a station shows a prompt, `E` / `Enter` / click
navigates to that judging page.

## Art is code, not assets

Everything is drawn at runtime. This is a licensing decision as much as a
technical one — iGEM requires every asset to be attributable, and code the team
owns is unambiguously team-generated.

| file | what it holds |
| --- | --- |
| `palette.ts` | the locked palette; every colour is looked up by a single-character key |
| `paint.ts` | the drawing helper — rects, ellipses, lines, dither screens, grid decoding |
| `font.ts` | a 5×7 bitmap typeface, authored glyph by glyph, for in-world signage |
| `tiles.ts` | per-tile painters, the salt-plate Voronoi field, shoreline resolution |
| `sprites.ts` | the hero grids and every prop and station, painted procedurally |
| `world-map.ts` | terrain generation, the route spline, station placement, prop scatter |
| `renderer.ts` | ground pre-render, camera, y-sorted sprite pass, daylight wash |
| `engine.ts` | input, the two modes, collision, the frame loop |
| `station-copy.ts` | the six chapters and the archive — read by both canvas and DOM |

Four rules the art depends on, worth keeping if anyone edits it:

1. **Dither screens must be grid-aligned patterns.** An `(x + y) % 4` test
   produces diagonal stripes, not a screen, and reads as hatching at every
   zoom. `density: 1` is a 50% checkerboard, `2` is a 25% ordered grid, `3` is
   hash-based scatter.
2. **A salt plate is one flat tone.** The polygons plus their cracks carry the
   texture. Only a minority of plates get any surface noise at all; blanket
   speckle turns the crust into film grain.
3. **Nothing curved gets stamped into the tile grid.** The boardwalk is a
   ribbon of rotated plank quads baked into the ground layer once. Stamping it
   into 16px cells produced very visible staircases.
4. **The four product colours are reserved.** `s` amber (β-ionone), `t` coral
   (astaxanthin), `u` saffron (crocetin), `v` orange (β-citraurin) identify the
   four strains everywhere on the wiki and are never used as decoration.

## Reviewing art changes without a browser

```bash
npm run art:check   # renders ten frames to tools/art-check/shots/
```

`tools/art-check/` contains a minimal Canvas2D rasteriser and PNG encoder, so
the world can be rendered to images on any machine — no browser, no display, no
screenshot tooling. It imports the same modules the site ships, so what it draws
is what the site draws. It is a development tool and is not bundled.

## Verified, and not verified

Verified: `tsc`, ESLint (`--max-warnings 0`) and the production build pass. Ten
frames rendered through the offline check and reviewed as images. Terrain,
route, station framing, collision grid and prop scatter are generated
deterministically from a fixed seed, so every visitor gets the same world.

**Not verified: nothing has been run in a browser.** In particular these need
real-device acceptance before anyone treats them as done:

- Frame rate on a mid-range laptop and on a phone. The ground pre-render is a
  3072×1728 offscreen canvas (~21 MB); it is built in bands with yields, but
  the memory cost on low-end mobile is untested and may need a smaller world or
  chunked terrain.
- Whether the free-roam scroll pin behaves on iOS Safari.
- Keyboard-only travel, focus order, and the interaction prompt with a screen
  reader.
- Touch drag as a virtual stick on a phone.
- `prefers-reduced-motion`: the opening is skipped, but the world still
  animates. A static fallback frame is probably the right answer.

## Known art work still open

- Pond edges step at 16px. Acceptable in this register, but the strongest
  colours (the brine bloom) show it most.
- Crystals and reeds repeat visibly in wide open stretches; the scatter needs
  clustering rather than uniform random placement.
- No weather, no time-of-day beyond the single daylight wash tied to journey
  progress, no ambient life (birds, ripples, drifting salt).
- The DOM UI uses a monospace system stack. A self-hosted pixel display face
  would finish the look; it must be uploaded through the iGEM Uploads tool and
  credited.

## Left in place, for the team to decide

`src/DunaWorld.tsx` and the `three` / `@dimforge/rapier3d-compat` dependencies
are still in the repository but no longer imported, so they add nothing to the
shipped bundle. Deleting the file and those two dependencies is a clean removal
whenever the team is happy to let the 3D version go.
