# Portfolio — Mohammed Lachhab

**Live:** https://mohammed-lachhab-portfolio.netlify.app

Static site, no build step. Three.js r160 loaded from jsDelivr via importmap.

Run locally (ES modules need http): `npx serve .` or `python3 -m http.server`.
Deploy: `netlify deploy --prod --dir .`

## Concept
Scroll = altitude, but the site is now a small 3D world rather than a moving wallpaper. The camera
climbs from day sky -> sunset -> night, banking through flight-gate rings while passing six floating
islands anchored to the real sections: crystal (profil), shield (sécurité), book stack (BookTinder),
crate (Sezart), gyroscope (compétences) and beacon (contact). The faceted paper plane floats in the
hero, can be dragged to spin, and peels away as you climb. Altimeter HUD bottom-right.

## Files
- index.html — content (French by default), sections: hero, profil, projets, compétences, contact
- i18n.js — FR/EN dictionary + toggle, remembers choice in localStorage
- style.css — tokens at :root, glass cards (cursor tilt on fine pointers), responsive
- main.js — renderer, palette, clouds, stars, paper plane + drag, camera flight path, section anchoring
- world.js — procedural 3D set pieces, floating islands, flight gates, moon, 3D labels

## Not done yet (ideas for next agent)
- Project detail views, screenshots/links per project
- More 3D interactions inside the artifacts (e.g. click a shield to open a security note)
- OG image (social preview card)
- Self-host Three.js and fonts
