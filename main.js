import * as THREE from 'three';
import { createWorld } from './world.js';

// Concept: scroll = altitude. Ground (day) -> sunset layer -> night sky with stars.
const canvas = document.getElementById('sky');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch { /* CSS gradient fallback stays */ }
if (renderer) init();

// Cards lean toward the cursor: cheap CSS 3D on top of the WebGL world.
if (matchMedia('(pointer:fine)').matches) {
  let tiltFrame = 0, tilting = null;
  addEventListener('pointermove', e => {
    if (tiltFrame) return;
    tiltFrame = requestAnimationFrame(() => {
      tiltFrame = 0;
      const el = e.target instanceof Element ? e.target.closest('.glass') : null;
      if (tilting && tilting !== el) {
        tilting.style.removeProperty('--rx');
        tilting.style.removeProperty('--ry');
        tilting.classList.remove('tilting');
        tilting = null;
      }
      if (!el) return;
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - .5;
      const ny = (e.clientY - r.top) / r.height - .5;
      el.style.setProperty('--rx', (ny * 3).toFixed(2) + 'deg');
      el.style.setProperty('--ry', (-nx * 3).toFixed(2) + 'deg');
      el.classList.add('tilting');
      tilting = el;
    });
  });
}

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x8ec5ff, 0.008);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  camera.position.z = 30;

  // --- Hero object: a faceted paper plane, the only "craft" in the scene ---
  // Procedural environment map (sky gradient + sun) so the metal reflects the climb.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  {
    const envCanvas = document.createElement('canvas'); envCanvas.width = 8; envCanvas.height = 256;
    const ectx = envCanvas.getContext('2d');
    const eg = ectx.createLinearGradient(0, 0, 0, 256);
    eg.addColorStop(0, '#3f86e0'); eg.addColorStop(.55, '#cfe6ff'); eg.addColorStop(1, '#ffd3a6');
    ectx.fillStyle = eg; ectx.fillRect(0, 0, 8, 256);
    const envTex = new THREE.CanvasTexture(envCanvas); envTex.colorSpace = THREE.SRGBColorSpace;
    envScene.add(new THREE.Mesh(
      new THREE.SphereGeometry(60, 32, 16),
      new THREE.MeshBasicMaterial({ map: envTex, side: THREE.BackSide })
    ));
    const envSun = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff6e8 })
    );
    envSun.position.set(-18, 16, -34);
    envScene.add(envSun);
  }
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  envScene.traverse(o => {
    if (o.isMesh) {
      if (o.material.map) o.material.map.dispose();
      o.geometry.dispose(); o.material.dispose();
    }
  });
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xcfe4ff, 0xffd0a8, 1.1));
  const sunLight = new THREE.DirectionalLight(0xfff3e0, 2.2);
  sunLight.position.set(-8, 12, 8);
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(0x9fc6ff, 1.4);
  rimLight.position.set(6, -4, -8);
  scene.add(rimLight);

  // Paper-plane hull: two wings + a keel, flat-shaded for a faceted metal look.
  const plane = new THREE.Group();
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0.15, 2.2,  -1.9, 0.35, -1.6,  0, -0.35, -1.2,  // left wing
    0, 0.15, 2.2,   0, -0.35, -1.2,   1.9, 0.35, -1.6,  // right wing
    0, 0.15, 2.2,   0, -1.05, -0.9,   0, -0.35, -1.2,   // keel
  ]), 3));
  hull.computeVertexNormals();
  const hullMat = new THREE.MeshPhysicalMaterial({
    color: 0x38445c, metalness: 0.15, roughness: 0.5, flatShading: true,
    side: THREE.DoubleSide, envMapIntensity: 0.35, transparent: true, opacity: 1,
  });
  plane.add(new THREE.Mesh(hull, hullMat));
  plane.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(hull),
    new THREE.LineBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: .6 })
  ));

  // Warm halo so the craft separates from the sky.
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 128;
  const glowCtx = glowCanvas.getContext('2d');
  const glowGradient = glowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  glowGradient.addColorStop(0, 'rgba(255,246,228,.9)');
  glowGradient.addColorStop(.35, 'rgba(255,228,190,.28)');
  glowGradient.addColorStop(1, 'rgba(255,228,190,0)');
  glowCtx.fillStyle = glowGradient; glowCtx.fillRect(0, 0, 128, 128);
  const glowMat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(glowCanvas), transparent: true,
    opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(5.5, 5.5, 1); glow.position.z = -2.2;
  plane.add(glow);
  scene.add(plane);

  const BASE_YAW = -0.7, BASE_PITCH = 0.55, BASE_ROLL = 0.12;
  let hero = { x: 5.1, y: 1.25, z: 18, scale: 1 };
  const placeHero = () => {
    hero = innerWidth / innerHeight > 1
      ? { x: 5.1, y: 1.25, z: 18, scale: 1 }
      : { x: 1.55, y: 4.35, z: 19.5, scale: .72 };
    plane.position.set(hero.x, hero.y, hero.z);
    plane.scale.setScalar(hero.scale);
  };
  placeHero();

  // Palette by altitude: day -> sunset -> night
  const stops = [
    { sky: new THREE.Color('#8ec5ff'), cloud: new THREE.Color('#ffffff') },
    { sky: new THREE.Color('#ff9a6b'), cloud: new THREE.Color('#ffd6c2') },
    { sky: new THREE.Color('#070b1f'), cloud: new THREE.Color('#8a96c9') },
  ];
  const sky = new THREE.Color(), tint = new THREE.Color();
  scene.background = sky;

  // Soft cloud puff texture (procedural, no assets)
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d').createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  const cx = c.getContext('2d'); cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
  const puffTex = new THREE.CanvasTexture(c);

  const DEPTH = 160; // total vertical world height scrolled through

  // --- 3D waypoint world, anchored to the actual DOM sections ---
  const world = createWorld(camera);
  scene.add(world.group);
  world.setLang(document.documentElement.lang === 'en' ? 'en' : 'fr');
  const projectCards = document.querySelectorAll('.project');
  const anchorEls = {
    profile: document.getElementById('profil'),
    security: projectCards[0],
    booktinder: projectCards[1],
    sezart: projectCards[2],
    skills: document.getElementById('skills'),
    contact: document.getElementById('contact'),
  };
  const layoutWorld = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const anchors = {};
    for (const [key, el] of Object.entries(anchorEls)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const center = r.top + scrollY + r.height / 2;
      anchors[key] = Math.min(1, Math.max(0, (center - innerHeight / 2) / max));
    }
    world.layout(anchors, DEPTH);
  };
  layoutWorld();
  addEventListener('load', layoutWorld);
  document.addEventListener('langchange', e => {
    world.setLang(e.detail.lang);
    requestAnimationFrame(layoutWorld);
  });
  if (new URLSearchParams(location.search).has('debug')) window.__world = { world, camera, scene, renderer, layoutWorld, plane };

  const puffs = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  // Clusters of puffs = clouds, spread over the full altitude range
  const clusterCount = innerWidth < 700 ? 18 : 30;
  for (let k = 0; k < clusterCount; k++) {
    const cxp = rnd(-60, 60), cyp = -rnd(0, DEPTH), czp = rnd(-70, -6);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: rnd(.35, .75), depthWrite: false });
      const s = new THREE.Sprite(m);
      const size = rnd(14, 30);
      s.scale.set(size, size * .7, 1);
      s.position.set(cxp + rnd(-12, 12), cyp + rnd(-3, 3), czp + rnd(-4, 4));
      s.userData.speed = rnd(.4, 1.2) * (k % 2 ? 1 : -1);
      scene.add(s); puffs.push(s);
    }
  }

  // Stars fade in toward the top of the climb
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) { sp[i*3] = rnd(-150,150); sp[i*3+1] = -rnd(DEPTH*.55, DEPTH+40); sp[i*3+2] = rnd(-120,-30); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0, depthWrite: false, fog: false });
  scene.add(new THREE.Points(sg, starMat));

  let target = 0, prog = 0, mx = 0, my = 0;
  const altEl = document.getElementById('alt'), barEl = document.getElementById('altbar');
  const onScroll = () => { target = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });

  // Drag the paper plane with the mouse while you are still on the hero.
  let dragSpinX = 0, dragSpinY = 0, dragVX = 0, dragVY = 0, dragging = false, lastPX = 0, lastPY = 0;
  if (matchMedia('(pointer:fine)').matches) {
    addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      if (e.target instanceof Element && e.target.closest('a,button')) return;
      if (scrollY > innerHeight * .25) return;
      dragging = true; lastPX = e.clientX; lastPY = e.clientY;
    });
    addEventListener('pointermove', e => {
      if (!dragging) return;
      dragVX += (e.clientX - lastPX) * .0011;
      dragVY += (e.clientY - lastPY) * .0011;
      lastPX = e.clientX; lastPY = e.clientY;
    });
    const stopDrag = () => { dragging = false; };
    addEventListener('pointerup', stopDrag);
    addEventListener('pointercancel', stopDrag);
    addEventListener('blur', stopDrag);
  }

  let locale = document.documentElement.lang === 'en' ? 'en-US' : 'fr-FR';
  document.addEventListener('langchange', e => { locale = e.detail.lang === 'en' ? 'en-US' : 'fr-FR'; });
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); placeHero(); layoutWorld(); };
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  (function loop() {
    const dt = Math.min(clock.getDelta(), .05);
    prog += (target - prog) * (reduce ? 1 : Math.min(1, dt * 4));

    // Interpolate 3-stop palette
    const t = prog * 2, i = Math.min(1, Math.floor(t)), f = t - i;
    sky.copy(stops[i].sky).lerp(stops[i+1].sky, f);
    tint.copy(stops[i].cloud).lerp(stops[i+1].cloud, f);
    for (const p of puffs) {
      p.material.color.copy(tint);
      if (!reduce) { p.position.x += p.userData.speed * dt; if (Math.abs(p.position.x) > 90) p.position.x *= -.95; }
    }
    starMat.opacity = Math.max(0, (prog - .6) / .4);

    // The world artifacts ride the same altitude as their DOM sections.
    scene.fog.color.copy(sky);
    world.update(prog, clock.elapsedTime, reduce);

    // Hero craft: idle float + pointer tilt, then it spins away as you climb.
    const time = clock.elapsedTime, osc = reduce ? 0 : 1;
    dragVX *= .94; dragVY *= .94;
    dragSpinY = Math.max(-1.1, Math.min(1.1, dragSpinY + dragVX));
    dragSpinX = Math.max(-.7, Math.min(.7, dragSpinX + dragVY));
    plane.position.x = hero.x + Math.sin(time * .55) * .12 * osc;
    plane.position.y = hero.y + Math.sin(time * .85) * .14 * osc;
    plane.rotation.x = BASE_PITCH + my * .3 + Math.sin(time * .6) * .05 * osc + dragSpinX;
    plane.rotation.y = BASE_YAW + mx * .55 + Math.sin(time * .45) * .09 * osc + dragSpinY;
    plane.rotation.z = BASE_ROLL + prog * 1.6 + Math.sin(time * .7) * .04 * osc;
    const heroFade = Math.max(0, 1 - prog * 4.5);
    plane.visible = heroFade > .01;
    hullMat.opacity = heroFade;
    glowMat.opacity = .22 * heroFade;

    camera.position.y = -prog * DEPTH;
    const camX = Math.sin(prog * Math.PI * 3.1) * 2.2 + mx * 3;
    camera.position.x += (camX - camera.position.x) * .05;
    camera.position.z = 30 + Math.sin(prog * Math.PI * 2) * 2.5;
    camera.rotation.x = -my * .06;
    camera.rotation.y = Math.cos(prog * Math.PI * 3.1) * .035 + mx * .04;
    camera.rotation.z = Math.sin(prog * Math.PI * 3.1) * .045;

    altEl.textContent = Math.round(prog * 12000).toLocaleString(locale);
    barEl.style.width = (prog * 100) + '%';
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
}
