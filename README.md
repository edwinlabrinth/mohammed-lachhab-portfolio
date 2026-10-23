# Portfolio — Mohammed Lachhab

**Space-journey edition** — a 3D solar system you fly through.

- Production (current portfolio): https://mohammed-lachhab-portfolio.netlify.app
- Space journey branch deploy: https://space-journey--mohammed-lachhab-portfolio.netlify.app
- Repository: https://github.com/edwinlabrinth/mohammed-lachhab-portfolio

Static site, no build step. Three.js r160 is loaded from jsDelivr through an import map; fonts come
from Google Fonts. The only generated assets are procedural textures and geometry inside the app.

## The journey

Scroll is **distance travelled along a flight lane**, not altitude. The camera banks through faint
flight-gate rings, passes asteroid belts and a distant sun, while a rocket companion floats beside
the viewport (drag it on the hero to spin it). The HUD shows the distance in AU and the current
destination.

Six planets anchor the real sections:

| Planet | Section | Orbiting artefact |
| --- | --- | --- |
| Terra Nova | Profil | crystal |
| Aegis | Projet 01 — portfolio platform | shield |
| Biblio | Projet 02 — BookTinder | books |
| Sezart | Projet 03 — Sezart | crate |
| Orbital Forge | Compétences | gyroscope |
| Beacon | Contact | beacon |

The contact planet fires a visible signal into the contact card: sideways on desktop, straight down
on phones. A soft inset bloom on the card glass makes the beam readable where it enters.

**Mobile:** every glass card opens a transparent, pinned 3D stage at its top; the matching planet is
fitted inside the stage, so the set piece is never hidden behind the frosted card. Stages stay
transparent and the content remains normal scrollable HTML.

**Desktop:** planets flank their cards. 3D labels are desktop-only, appear at 1360px and wider, and
are clamped to the frame so they never clip at the edges. The layout switches at 1200px.

**Readability and motion:** FR/EN toggle (remembered in localStorage), reduced-motion support,
fluid typography, and no horizontal overflow down to 320px. Planet materials keep a faint self-lit
pass so their pigments survive in deep space, while a camera-following fill light keeps the visible
hemisphere readable.

## Files

- `index.html` — content (French by default): hero, profil, projets, compétences, contact, HUD
- `i18n.js` — FR/EN dictionary, toggle, `langchange` event, localStorage persistence
- `style.css` — space theme tokens, glass cards, HUD, mobile transparent stages, responsive rules
- `main.js` — renderer, camera flight lane, rocket, stars/nebulae, hero Earth placement, HUD, pinning
- `world.js` — procedural planets, rings, atmospheres, moons, artefacts, gates, belts, sun, labels,
  contact beam
- `.github/workflows/deploy.yml` — push-triggered Netlify build hooks
- `netlify.toml` — publish directory, cache headers, security headers

Asset URLs carry a cache-busting query (`?v=7` in `index.html` and the `world.js` import). Bump it
when changing CSS/JS so returning visitors receive the new files.

## Branches and deployment

- `main` — the current portfolio; Netlify production branch.
- `space-journey` — this planets version; kept separate for review and comparison.

Every push to either branch runs `.github/workflows/deploy.yml`, which calls the matching Netlify
build hook (`NETLIFY_HOOK_MAIN` for `main`, `NETLIFY_HOOK_SPACE` for `space-journey`). The site is
linked to the GitHub repository so Netlify knows both branches; native GitHub webhooks are not used
because the repository token does not have `admin:repo_hook`.

To promote this version, merge `space-journey` into `main`; the `main` hook then redeploys
production.

## Run locally

ES modules need HTTP:

```sh
python -m http.server 8099
# or: npx serve .
```

Open `http://127.0.0.1:8099/`. Add `?debug` to expose `window.__world` (world, camera, scene,
renderer, rocket, hero Earth) for layout probes.

## Ideas for next

- Project detail views with screenshots and live links
- Clickable artefacts that open a short case-study note
- OG image / social preview card for the space edition
- Self-host Three.js and fonts to remove CDN dependencies
