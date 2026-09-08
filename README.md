# DunaTerp — SCU-China 2026 Wiki

Source-built React/Vite Wiki for the SCU-China 2026 iGEM project on a modular *Dunaliella salina* carotenoid-derivative platform.

## Local development

Requires Node.js 20.19 or newer.

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run art:check   # render the pixel world to tools/art-check/shots/
```

The local URL includes the official team slug: `http://localhost:5173/scu-china/`.

## GitHub preview

This folder is an independent Git repository. It can be pushed to a public GitHub repository so teammates and friends can open a live preview without affecting the official iGEM repository.

After the first push, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. Every push to `main` will then rebuild and publish the site at:

```text
https://<github-username>.github.io/<repository-name>/
```

The GitHub workflow supplies its own base path and creates an SPA fallback for direct links. The regular iGEM build keeps using `/scu-china/`, so the two deployments can be maintained from the same source.

## Structure

- `src/App.tsx` — routes and reusable page layouts
- `src/PixelWorld.tsx` — the pixel-art homepage: scroll journey, free roam, chapter overlays
- `src/pixel/` — the pixel engine: palette, drawing helper, bitmap font, tiles, sprites, world, renderer
- `tools/art-check/` — renders the world to PNG without a browser (`npm run art:check`)
- `src/site-data.ts` — all current page copy and review states
- `src/styles.css` — responsive visual system and reduced-motion fallback
- `public/figures` — local development copies of team-generated figures
- `ATTRIBUTION.md` — asset, inspiration and AI-assistance register
- `.gitlab-ci.yml` — source build and iGEM Pages deployment
- `.github/workflows/pages.yml` — GitHub Pages preview deployment

## Before publishing

1. Confirm `VITE_TEAM_NAME` and the GitLab footer URL match the official team slug.
2. Upload images and other static assets through the iGEM Uploads tool, replace local development paths with the resulting `static.igem.wiki` URLs, and add inline source/licence credits.
3. Replace every `Team input required` section with team-authored, human-reviewed work.
4. Verify all scientific claims, parameters, citations, figures and quotations against primary records.
5. Keep the official `LICENSE` file and visible CC BY 4.0 footer link.
6. Update `/responsible-ai` with every model, use and named human reviewer.

See `PIXEL-WORLD.md` for the homepage design, the rules the pixel art depends on, and what still needs browser acceptance.

The immersive homepage is optional navigation. All judging-relevant pages remain directly reachable at predictable routes such as `/contribution`, `/engineering`, `/human-practices`, `/model`, `/alternative-platform`, and `/safety-and-security`.
