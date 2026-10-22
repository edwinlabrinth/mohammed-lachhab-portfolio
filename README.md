# Portfolio — Mohammed Lachhab (starting point)

Static site, no build step. Three.js r160 loaded from jsDelivr via importmap.

Run locally (ES modules need http): `npx serve .` or `python3 -m http.server`.
Deploy: drag the folder to Netlify.

## Concept
Scroll = altitude. Background is a Three.js scene of procedural cloud sprites; the camera climbs
from day sky -> sunset -> night with stars. Altimeter HUD bottom-right. Glass cards hold content.

## Files
- index.html — content (French), sections: hero, profil, projets, compétences, contact
- style.css — tokens at :root, glass cards, responsive
- main.js — scene, palette stops, clouds, stars, scroll/mouse parallax, reduced-motion + WebGL fallback

## Not done yet (ideas for next agent)
- Not tested in a browser; check performance on mobile (306 sprites; reduce count if needed)
- Project detail views, screenshots/links per project, CV PDF download
- Per-section scene events (e.g. padlock/shield object floating by the Sécurité project)
- EN/FR toggle, SEO/OG image, favicon, self-host Three.js and fonts
