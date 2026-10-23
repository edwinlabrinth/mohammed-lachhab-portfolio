import * as THREE from 'three';
import { createWorld, createHeroEarth } from './world.js?v=7';

// Concept: scroll = distance travelled. The camera flies a curved lane through
// a small solar system; every section owns a planet, and a rocket keeps you
// company the whole way. All surfaces and glows are generated at runtime.

const canvas = document.getElementById('sky');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch { /* CSS gradient fallback stays */ }
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
      el.style.setProperty('--rx', (ny * 2.4).toFixed(2) + 'deg');
      el.style.setProperty('--ry', (-nx * 2.4).toFixed(2) + 'deg');
      el.classList.add('tilting');
      tilting = el;
    });
  });
}

function spriteTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(.22, 'rgba(255,255,255,.8)');
  g.addColorStop(.55, 'rgba(190,225,255,.18)');
  g.addColorStop(1, 'rgba(190,225,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05070f');
  scene.fog = new THREE.FogExp2(0x05070f, .0016);

  const camera = new THREE.PerspectiveCamera(58, 1, .1, 500);
  camera.position.set(0, 0, 34);

  // --- Environment map: deep space with a warm sun, so metals have something
  // to reflect. Generated once, then disposed. ---
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  {
    const envCanvas = document.createElement('canvas'); envCanvas.width = 8; envCanvas.height = 256;
    const ectx = envCanvas.getContext('2d');
    const eg = ectx.createLinearGradient(0, 0, 0, 256);
    eg.addColorStop(0, '#0a1030'); eg.addColorStop(.42, '#132a5a'); eg.addColorStop(.7, '#24173b'); eg.addColorStop(1, '#04050c');
    ectx.fillStyle = eg; ectx.fillRect(0, 0, 8, 256);
    const envTex = new THREE.CanvasTexture(envCanvas); envTex.colorSpace = THREE.SRGBColorSpace;
    envScene.add(new THREE.Mesh(
      new THREE.SphereGeometry(60, 32, 16),
      new THREE.MeshBasicMaterial({ map: envTex, side: THREE.BackSide })
    ));
    const envSun = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff2d8 })
    );
    envSun.position.set(-20, 18, -34);
    envScene.add(envSun);
  }
  scene.environment = pmrem.fromScene(envScene, .02).texture;
  envScene.traverse(o => {
    if (o.isMesh) {
      if (o.material.map) o.material.map.dispose();
      o.geometry.dispose(); o.material.dispose();
    }
  });
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0x7fa8ff, 0x24102f, .9));
  const sunLight = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sunLight.position.set(-12, 16, 10);
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(0x7fd8ff, 1.15);
  rimLight.position.set(12, -8, -10);
  scene.add(rimLight);
  // A soft key that travels with the camera: every planet is seen from the
  // front, so its visible hemisphere never falls into total shadow.
  const fillLight = new THREE.DirectionalLight(0xdfefff, 1.9);
  const fillTarget = new THREE.Object3D();
  scene.add(fillLight, fillTarget);
  fillLight.target = fillTarget;

  // --- Hero Earth ---
  const heroEarth = createHeroEarth();
  scene.add(heroEarth);
  let heroBase = { x: 13.8, y: -1.2, z: 3.5, scale: 1.1 };

  // --- Rocket ---
  const rocket = buildRocket();
  scene.add(rocket);
  let rocketBase = { x: -7.2, y: -3.2, z: 23.5, scale: .82 };

  // --- Stars, in three parallax layers ---
  const starTex = spriteTexture();
  const starLayers = [
    makeStars(scene, 1150, .8, .72, -150, -45, 210, 30, -210, starTex),
    makeStars(scene, 620, 1.45, .8, -70, -20, 130, 26, -200, starTex),
    makeStars(scene, 170, 2.5, .9, -32, 0, 72, 22, -190, starTex, true),
  ];

  // --- Nebula clouds ---
  const nebulae = [];
  const nebulaDefs = [
    [0x4f3b96, -74, -20, -120, 150, .14], [0x1f6f9e, 68, -92, -130, 140, .12],
    [0x7a3f74, 28, -160, -110, 120, .1], [0x2b7d78, -82, -185, -125, 145, .1],
    [0x3f5db0, 84, -250, -135, 160, .11], [0x6b3a6e, -30, -300, -120, 135, .09],
    [0x265f96, 40, -380, -140, 170, .1], [0x4e3b8a, -70, -470, -130, 150, .09],
  ];
  for (const [color, x, y, z, scale, opacity] of nebulaDefs) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: starTex, color, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    s.scale.set(scale, scale * .72, 1);
    s.position.set(x, y, z);
    s.userData.base = { x, y, opacity };
    s.userData.phase = Math.random() * Math.PI * 2;
    scene.add(s);
    nebulae.push(s);
  }

  const DEPTH = 170;

  // --- 3D planets anchored to the actual DOM sections ---
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
    // Phones get a transparent 3D stage at the top of each glass card. Keep the
    // value in px so CSS and the pinning math agree.
    const stage = innerWidth >= 1200 ? 0 : Math.round(Math.min(148, Math.max(106, innerHeight * .175)));
    document.documentElement.style.setProperty('--stage', stage + 'px');
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const anchors = {};
    for (const [key, el] of Object.entries(anchorEls)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const top = r.top + scrollY;
      const center = (top + r.height / 2 - innerHeight / 2) / max;
      const card = el.classList.contains('glass') ? el : el.querySelector('.glass');
      const cr = card ? card.getBoundingClientRect() : r;
      anchors[key] = {
        center: Math.min(1, Math.max(0, center)),
        stage,
        cardTop: cr.top + scrollY,
      };
    }
    world.layout(anchors, DEPTH);
    placeHero();
    placeRocket();
  };

  const placeHero = () => {
    const portrait = innerWidth < 760 || innerHeight > innerWidth * 1.15;
    heroBase = portrait
      ? { x: 6.0, y: 9.6, z: 4, scale: .70 }
      : { x: 13.9, y: -1.2, z: 3.5, scale: 1.1 };
    heroEarth.position.set(heroBase.x, heroBase.y, heroBase.z);
    heroEarth.scale.setScalar(heroBase.scale);
  };

  const placeRocket = () => {
    const portrait = innerWidth < 1200;
    rocketBase = portrait
      ? { x: 1.6, y: 3.7, z: 24, scale: .28 }
      : { x: -7.2, y: -4.4, z: 23.5, scale: .82 };
    rocket.scale.setScalar(rocketBase.scale);
  };

  layoutWorld();
  addEventListener('load', layoutWorld);
  document.fonts?.ready.then(layoutWorld);
  document.addEventListener('langchange', e => {
    world.setLang(e.detail.lang);
    requestAnimationFrame(layoutWorld);
  });
  if (new URLSearchParams(location.search).has('debug')) {
    window.__world = { world, camera, scene, renderer, layoutWorld, plane: rocket, rocket, heroEarth };
  }

  let target = 0, prog = 0, mx = 0, my = 0, prevTarget = 0, speed = 0;
  const distEl = document.getElementById('dist');
  const barEl = document.getElementById('distbar');
  const destEl = document.getElementById('dest');
  const onScroll = () => { target = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth - .5;
    my = e.clientY / innerHeight - .5;
  });

  // Drag the rocket while you are still on the hero.
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
  let lang = document.documentElement.lang === 'en' ? 'en' : 'fr';
  document.addEventListener('langchange', e => {
    lang = e.detail.lang;
    locale = lang === 'en' ? 'en-US' : 'fr-FR';
    updateDest();
  });

  let lastDest = '';
  const updateDest = () => {
    let idx = -1;
    for (const wp of world.waypoints) {
      if (prog >= (wp.p ?? 0) - .055) idx = wp.index;
    }
    const value = idx < 0
      ? (lang === 'fr' ? 'ORBITE BASSE' : 'LOW ORBIT')
      : (world.waypoints[idx].name || '').toUpperCase();
    if (value && value !== lastDest) { destEl.textContent = value; lastDest = value; }
  };

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    placeHero();
    placeRocket();
    layoutWorld();
  };
  addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  (function loop() {
    const dt = Math.min(clock.getDelta(), .05);
    prog += (target - prog) * (reduce ? 1 : Math.min(1, dt * 3.6));
    speed += (Math.abs(target - prevTarget) - speed) * .08;
    prevTarget = target;

    if (!reduce) {
      heroEarth.userData.spin?.(clock.elapsedTime);
      heroEarth.position.y = heroBase.y + Math.sin(clock.elapsedTime * .45) * .18;
      heroEarth.position.x = heroBase.x + Math.sin(clock.elapsedTime * .3) * .12;
    } else {
      heroEarth.userData.spin?.(0);
    }

    // Rocket: idle float, pointer lean and drag inertia.
    const time = clock.elapsedTime, osc = reduce ? 0 : 1;
    dragVX *= .94; dragVY *= .94;
    dragSpinY = Math.max(-1.1, Math.min(1.1, dragSpinY + dragVX));
    dragSpinX = Math.max(-.6, Math.min(.6, dragSpinX + dragVY));
    const bank = Math.sin(prog * Math.PI * 3.1) * .06;
    rocket.position.x = camera.position.x + rocketBase.x + Math.sin(time * .5) * .12 * osc + mx * .35;
    rocket.position.y = camera.position.y + rocketBase.y + Math.sin(time * .85) * .14 * osc;
    rocket.position.z = camera.position.z - (34 - rocketBase.z);
    rocket.rotation.x = -.34 + my * .12 + Math.sin(time * .6) * .035 * osc + dragSpinX;
    rocket.rotation.y = -.55 + mx * .22 + Math.sin(time * .42) * .06 * osc + dragSpinY;
    rocket.rotation.z = .16 + Math.sin(time * .7) * .025 * osc + bank;
    if (!reduce) animateRocket(rocket, time, speed, dt);

    // Hero Earth recedes naturally as the camera moves on. Keep it hidden on
    // phones once the launch is over so it cannot sit behind the cards.
    heroEarth.visible = !(innerWidth < 760 && prog > .12);

    // Stars drift and twinkle.
    if (!reduce) {
      for (let i = 0; i < starLayers.length; i++) {
        const l = starLayers[i];
        l.points.rotation.y = time * (.002 + i * .0015);
        l.mat.opacity = l.baseOpacity * (.86 + Math.sin(time * (.7 + i * .2)) * .12);
      }
      for (const n of nebulae) {
        n.position.x = n.userData.base.x + Math.sin(time * .03 + n.userData.phase) * 5;
        n.position.y = n.userData.base.y + Math.cos(time * .025 + n.userData.phase) * 4;
        n.material.opacity = n.userData.base.opacity * (.85 + Math.sin(time * .18 + n.userData.phase) * .18);
      }
    }

    // Camera: a curved flight lane with a slight bank.
    camera.position.y = -prog * DEPTH;
    const camX = Math.sin(prog * Math.PI * 2.3) * 2.8 + mx * 2.2;
    camera.position.x += (camX - camera.position.x) * .06;
    camera.position.z = 34 + Math.cos(prog * Math.PI * 1.7) * 2.4;
    camera.rotation.x = -my * .045 + Math.cos(prog * Math.PI * 2.3) * .015;
    camera.rotation.y = Math.cos(prog * Math.PI * 2.3) * .045 + mx * .035;
    camera.rotation.z = Math.sin(prog * Math.PI * 2.3) * .055;
    camera.updateMatrixWorld();

    fillLight.position.set(camera.position.x + 6, camera.position.y + 10, camera.position.z + 16);
    fillTarget.position.copy(camera.position);

    world.update(prog, time, reduce, scrollY);

    // HUD: distance and current destination.
    const au = prog * 18.4;
    distEl.textContent = au.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    barEl.style.width = (prog * 100).toFixed(2) + '%';
    updateDest();

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
}

// ---------------------------------------------------------------------------
// Rocket
// ---------------------------------------------------------------------------

function buildRocket() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe9eef7, metalness: .5, roughness: .34, envMapIntensity: 1 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xffb36b, metalness: .45, roughness: .3, emissive: 0x3a1404, emissiveIntensity: .35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x273449, metalness: .72, roughness: .3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0b2233, emissive: 0x4fd8ff, emissiveIntensity: .9, metalness: .2, roughness: .12 });
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x7fe7ff, transparent: true, opacity: .62, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(.52, .68, 3.2, 12, 1), bodyMat);
  g.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(.52, 1.5, 12), accentMat);
  nose.position.y = 2.32;
  g.add(nose);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .16, 12), darkMat);
  collar.position.y = 1.18;
  g.add(collar);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(.54, .54, .14, 12), accentMat);
  band.position.y = -.35;
  g.add(band);

  const windowMesh = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 12), glassMat);
  windowMesh.position.set(0, .78, .49);
  windowMesh.scale.z = .55;
  g.add(windowMesh);

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.3, .46, .55, 12, 1, true), darkMat);
  nozzle.position.y = -1.86;
  g.add(nozzle);

  // Three swept fins.
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(.95, -1.05);
  finShape.lineTo(.9, -.42);
  finShape.lineTo(.16, 0);
  finShape.lineTo(0, 0);
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: .11, bevelEnabled: false });
  finGeo.translate(0, 0, -.055);
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = i * Math.PI * 2 / 3;
    const fin = new THREE.Mesh(finGeo, darkMat);
    fin.position.set(.54, -.42, 0);
    pivot.add(fin);
    g.add(pivot);
  }

  // Engine flame: an outer cyan cone plus a white core.
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.34, 2.5, 12, 1, true), flameMat);
  flame.position.y = -3.02;
  flame.rotation.x = Math.PI;
  g.add(flame);
  const core = new THREE.Mesh(new THREE.ConeGeometry(.19, 1.5, 10, 1, true), coreMat);
  core.position.y = -2.55;
  core.rotation.x = Math.PI;
  g.add(core);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: spriteTexture(), color: 0x7fe7ff, transparent: true, opacity: .5,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  glow.scale.set(2.4, 2.4, 1);
  glow.position.y = -2.1;
  g.add(glow);

  const engineLight = new THREE.PointLight(0x7fe7ff, 2.2, 6, 2);
  engineLight.position.y = -1.9;
  g.add(engineLight);

  // Exhaust puffs trailing down local -Y.
  const particles = [];
  const particleGroup = new THREE.Group();
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: spriteTexture(), color: i % 3 ? 0x7fe7ff : 0xffd9a0, transparent: true,
      opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    s.userData.life = Math.random();
    s.userData.speed = .55 + Math.random() * .9;
    s.userData.x = (Math.random() - .5) * .46;
    s.userData.z = (Math.random() - .5) * .46;
    particleGroup.add(s);
    particles.push(s);
  }
  g.add(particleGroup);

  g.userData = { flame, core, glow, engineLight, particles };
  return g;
}

function animateRocket(rocket, time, speed, dt) {
  const { flame, core, glow, engineLight, particles } = rocket.userData;
  const thrust = .82 + Math.sin(time * 21) * .08 + Math.sin(time * 7.3) * .05 + Math.min(.5, speed * 3);
  flame.scale.set(1 + Math.sin(time * 17) * .08, thrust, 1 + Math.sin(time * 13) * .06);
  core.scale.set(.9, .8 + Math.sin(time * 24) * .12, .9);
  glow.scale.setScalar(2.2 + Math.sin(time * 12) * .25);
  glow.material.opacity = .42 + Math.sin(time * 9) * .1;
  engineLight.intensity = 1.8 + Math.sin(time * 18) * .5;

  for (const s of particles) {
    s.userData.life += dt * s.userData.speed;
    if (s.userData.life > 1) {
      s.userData.life -= 1;
      s.userData.x = (Math.random() - .5) * .46;
      s.userData.z = (Math.random() - .5) * .46;
    }
    const l = s.userData.life;
    s.position.set(s.userData.x * (1 + l), -2.15 - l * 5.2, s.userData.z * (1 + l));
    s.scale.setScalar(.32 + l * .95);
    s.material.opacity = (1 - l) * .36;
  }
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

function makeStars(scene, count, size, opacity, zMin, zMax, xSpread, yTop, yBottom, map, colored = false) {
  const positions = new Float32Array(count * 3);
  const colors = colored ? new Float32Array(count * 3) : null;
  const palette = [new THREE.Color('#ffffff'), new THREE.Color('#9fd6ff'), new THREE.Color('#ffe0b0'), new THREE.Color('#c7b6ff')];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - .5) * xSpread;
    positions[i * 3 + 1] = yBottom + Math.random() * (yTop - yBottom);
    positions[i * 3 + 2] = zMin + Math.random() * (zMax - zMin);
    if (colors) {
      const c = palette[(Math.random() * palette.length) | 0];
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size, map, transparent: true, opacity, vertexColors: !!colors,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return { points, mat, baseOpacity: opacity };
}
