import * as THREE from 'three';

// A small hand-built solar system. Every section owns a planet, and the scroll
// position is the camera's place along the flight lane. Nothing here is loaded
// from disk: surfaces, rings and glows are generated procedurally on canvases.

const ACCENT = 0xffd9a0;

const clamp01 = v => Math.min(1, Math.max(0, v));
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d') };
}

// Soft radial sprite shared by atmospheres, glows and particles.
const glowTex = (() => {
  const { c, ctx } = canvas2d(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(.3, 'rgba(255,255,255,.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

// ---------------------------------------------------------------------------
// Procedural planet surfaces
// ---------------------------------------------------------------------------

function planetTexture({ base, accent, dark, light, seed = 1, type = 'rock' }) {
  const { c, ctx } = canvas2d(512, 256);
  const rand = rng(seed);

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, dark);
  grad.addColorStop(.5, base);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 512, 256);

  if (type === 'gas') {
    // Wavy latitude bands.
    for (let i = 0; i < 58; i++) {
      const y = rand() * 256;
      const amp = 2 + rand() * 9;
      ctx.strokeStyle = hexA(i % 3 === 0 ? light : i % 2 ? accent : dark, .06 + rand() * .18);
      ctx.lineWidth = 2 + rand() * 15;
      ctx.beginPath();
      for (let x = -8; x <= 520; x += 12) {
        const yy = y + Math.sin(x * .018 + i * 1.7) * amp + Math.sin(x * .006 + i) * amp * 1.6;
        if (x === -8) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // A storm oval.
    const sx = 110 + rand() * 300, sy = 85 + rand() * 90;
    ctx.fillStyle = hexA(accent, .5);
    ctx.beginPath(); ctx.ellipse(sx, sy, 34, 13, -.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(light, .5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 43, 18, -.15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = hexA('#ffffff', .18);
    ctx.beginPath(); ctx.ellipse(sx - 8, sy - 4, 16, 6, -.15, 0, Math.PI * 2); ctx.fill();
  } else {
    // Continents / mineral patches.
    const blobs = type === 'ice' ? 46 : 78;
    for (let i = 0; i < blobs; i++) {
      const x = rand() * 512, y = 18 + rand() * 220;
      const rx = 7 + rand() * 38, ry = 5 + rand() * 24;
      const col = rand() > .48 ? accent : (rand() > .5 ? dark : light);
      ctx.fillStyle = hexA(col, .08 + rand() * .32);
      for (const dx of [-512, 0, 512]) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Craters / bright ridges.
    const marks = type === 'ice' ? 32 : 54;
    for (let i = 0; i < marks; i++) {
      const x = rand() * 512, y = 12 + rand() * 232;
      const r = 1 + rand() * 6;
      ctx.fillStyle = hexA(dark, .18 + rand() * .3);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hexA(light, .12 + rand() * .22);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x + .8, y + .8, r, 0, Math.PI * 2); ctx.stroke();
    }
    if (type !== 'lava') {
      const cap = ctx.createLinearGradient(0, 0, 0, 52);
      cap.addColorStop(0, 'rgba(255,255,255,.65)');
      cap.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cap; ctx.fillRect(0, 0, 512, 52);
      const cap2 = ctx.createLinearGradient(0, 256, 0, 204);
      cap2.addColorStop(0, 'rgba(255,255,255,.5)');
      cap2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cap2; ctx.fillRect(0, 204, 512, 52);
    }
    if (type === 'earth') {
      // Cloud systems.
      for (let i = 0; i < 24; i++) {
        const x = rand() * 512, y = 30 + rand() * 196;
        ctx.fillStyle = `rgba(255,255,255,${.08 + rand() * .22})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 14 + rand() * 42, 4 + rand() * 10, rand() * .5 - .25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (type === 'lava') {
      // Molten cracks.
      for (let i = 0; i < 22; i++) {
        ctx.strokeStyle = hexA(accent, .22 + rand() * .5);
        ctx.lineWidth = .7 + rand() * 1.8;
        ctx.beginPath();
        let x = rand() * 512, y = rand() * 256;
        ctx.moveTo(x, y);
        for (let j = 0; j < 4; j++) {
          x += (rand() - .5) * 46; y += (rand() - .5) * 26;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  // Fine grain.
  for (let i = 0; i < 620; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * .045})`;
    ctx.fillRect(rand() * 512, rand() * 256, 1, 1);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function cloudTexture(seed = 9) {
  const { c, ctx } = canvas2d(512, 256);
  const rand = rng(seed);
  for (let i = 0; i < 70; i++) {
    const x = rand() * 512, y = 20 + rand() * 216;
    const rx = 8 + rand() * 34, ry = 2 + rand() * 8;
    ctx.fillStyle = `rgba(255,255,255,${.16 + rand() * .45})`;
    for (const dx of [-512, 0, 512]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y, rx, ry, rand() * .4 - .2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Planet pieces
// ---------------------------------------------------------------------------

function atmosphereMaterial(color, power = 3.1, intensity = .7) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), uPower);
        gl_FragColor = vec4(uColor, rim * uIntensity);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

function makeRing({ inner, outer, colorA, colorB, opacity = .42, tilt = 0, spin = .05, seed = 3 }) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uA: { value: new THREE.Color(colorA) },
      uB: { value: new THREE.Color(colorB) },
      uOpacity: { value: opacity },
      uSeed: { value: seed },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uA;
      uniform vec3 uB;
      uniform float uOpacity;
      uniform float uSeed;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float bands = sin(r * 125.0 + uSeed) * 0.5 + 0.5;
        bands = mix(0.3, 1.0, bands);
        float gaps = smoothstep(0.18, 0.24, abs(r - 0.93)) * smoothstep(0.18, 0.24, abs(r - 0.965));
        float alpha = uOpacity * bands * (0.55 + 0.45 * gaps);
        vec3 col = mix(uA, uB, bands);
        gl_FragColor = vec4(col, alpha);
      }`,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 128, 1), mat);
  mesh.rotation.x = Math.PI / 2 + tilt;
  mesh.rotation.z = tilt * .7;
  mesh.userData.spin = spin;
  return mesh;
}

function makeMoon({ radius, distance, color, speed = .25, phase = 0, tilt = .2, segments = 16 }) {
  const pivot = new THREE.Group();
  pivot.rotation.x = tilt;
  pivot.userData.speed = speed;
  pivot.userData.phase = phase;
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(radius, segments, Math.max(8, segments - 4)),
    new THREE.MeshStandardMaterial({ color, roughness: .92, metalness: .05, flatShading: true })
  );
  moon.position.x = distance;
  moon.userData.noBounds = true;
  pivot.add(moon);
  return { pivot, moon };
}

function addGlow(parent, { color, scale, opacity = .3, y = 0, z = 0 }) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sprite.scale.set(scale, scale, 1);
  sprite.position.set(0, y, z);
  parent.add(sprite);
  return sprite;
}

function makePlanet(def) {
  const g = new THREE.Group();
  const tex = planetTexture(def.surface);
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    // A faint self-lit pass keeps the pigments alive in deep space; the
    // directional lights still carve out the day/night terminator.
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: .16,
    roughness: def.surface.type === 'gas' ? .82 : .9,
    metalness: def.surface.type === 'lava' ? .28 : .04,
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(def.radius, def.segments || 48, 32), mat);
  planet.rotation.z = def.tilt || 0;
  g.add(planet);

  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(def.radius * 1.035, 40, 28),
    atmosphereMaterial(def.atmo, def.atmoPower || 3.1, def.atmoIntensity || .7)
  );
  atmo.userData.noBounds = true;
  g.add(atmo);

  addGlow(g, {
    color: def.atmo,
    scale: def.radius * (def.glowScale || 4.3),
    opacity: def.glowOpacity ?? .22,
  });

  if (def.clouds) {
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(def.radius * 1.012, 40, 26),
      new THREE.MeshStandardMaterial({
        map: cloudTexture(def.surface.seed + 31),
        transparent: true, opacity: .62, depthWrite: false, roughness: 1,
      })
    );
    clouds.rotation.z = def.tilt || 0;
    clouds.userData.noBounds = true;
    g.add(clouds);
    g.userData.clouds = clouds;
  }

  if (def.rings) {
    def.rings.forEach((r, i) => {
      const ring = makeRing({
        inner: def.radius * r.inner,
        outer: def.radius * r.outer,
        colorA: r.a, colorB: r.b,
        opacity: r.opacity ?? .38,
        tilt: r.tilt ?? .22,
        spin: (r.spin ?? .04) * (i % 2 ? -1 : 1),
        seed: (def.surface.seed || 1) + i * 7,
      });
      ring.userData.noBounds = true;
      g.add(ring);
      (g.userData.rings ||= []).push(ring);
    });
  }

  for (const m of def.moons || []) {
    const moon = makeMoon({ ...m, tilt: def.tilt || 0 });
    g.add(moon.pivot);
    (g.userData.moons ||= []).push(moon);
  }

  const spinSpeed = def.spinSpeed ?? .045;
  g.userData.spin = (t) => {
    planet.rotation.y = t * spinSpeed;
    if (g.userData.clouds) g.userData.clouds.rotation.y = t * (spinSpeed * 1.9);
    for (const ring of g.userData.rings || []) ring.rotation.z = t * ring.userData.spin;
    for (const m of g.userData.moons || []) {
      m.pivot.rotation.y = t * m.pivot.userData.speed + m.pivot.userData.phase;
    }
    if (def.extraSpin) def.extraSpin(g, t);
  };

  return { group: g, planet };
}

// ---------------------------------------------------------------------------
// Small portfolio artefacts orbiting their planet
// ---------------------------------------------------------------------------

const artifactMats = {
  gold: new THREE.MeshStandardMaterial({
    color: 0xffd9a0, emissive: 0xff8a3d, emissiveIntensity: .8,
    roughness: .3, metalness: .5, flatShading: true,
  }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9fb2cc, metalness: .8, roughness: .3, flatShading: true }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1f2b3f, metalness: .5, roughness: .55, flatShading: true }),
  paper: new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: .85 }),
  line: new THREE.LineBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: .55 }),
};

function makeCrystal() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.OctahedronGeometry(.55, 0), artifactMats.gold);
  c.scale.y = 1.7;
  g.add(c);
  const cage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 0),
    new THREE.MeshBasicMaterial({ color: 0xffe0b0, wireframe: true, transparent: true, opacity: .25, depthWrite: false })
  );
  g.add(cage);
  g.userData.spin = t => { c.rotation.y = t * .8; cage.rotation.y = -t * .3; };
  return g;
}

function makeShield() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 1);
  shape.bezierCurveTo(.65, 1, 1, .7, 1, .22);
  shape.bezierCurveTo(1, -.38, .55, -.82, 0, -1.12);
  shape.bezierCurveTo(-.55, -.82, -1, -.38, -1, .22);
  shape.bezierCurveTo(-1, .7, -.65, 1, 0, 1);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: .2, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 1 });
  geo.center();
  const shield = new THREE.Mesh(geo, artifactMats.metal);
  shield.scale.setScalar(.85);
  g.add(shield);
  const key = new THREE.Mesh(new THREE.OctahedronGeometry(.16, 0), artifactMats.gold);
  key.position.z = .3;
  g.add(key);
  g.userData.spin = t => { shield.rotation.y = Math.sin(t * .5) * .5; key.rotation.z = t; };
  return g;
}

function makeBooks() {
  const g = new THREE.Group();
  const colors = [0x2c4a78, 0x7a4b3a, 0x3d6659];
  for (let i = 0; i < 3; i++) {
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, .24, 1.3),
      new THREE.MeshStandardMaterial({ color: colors[i], roughness: .6, metalness: .15, flatShading: true })
    );
    cover.position.y = i * .27;
    cover.rotation.y = (i - 1) * .24;
    g.add(cover);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(.06, .16, 1.16), artifactMats.paper);
    pages.position.x = .92;
    cover.add(pages);
  }
  const mark = new THREE.Mesh(new THREE.BoxGeometry(.08, .45, .8), artifactMats.gold);
  mark.position.set(.6, .78, .2);
  mark.rotation.z = -.16;
  g.add(mark);
  g.userData.spin = t => { g.rotation.y = Math.sin(t * .4) * .4; };
  return g;
}

function makeCrate() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.5), artifactMats.dark);
  g.add(body);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.58, .1, 1.58), artifactMats.gold);
  band.position.y = .15;
  g.add(band);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.65, .14, 1.65), artifactMats.metal);
  lid.position.y = .75;
  g.add(lid);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), artifactMats.line);
  g.add(edges);
  g.userData.spin = t => { g.rotation.y = Math.sin(t * .35) * .45; };
  return g;
}

function makeGyro() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.4, 1), artifactMats.gold);
  g.add(core);
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(.8 + i * .22, .025, 6, 48),
      i === 1 ? artifactMats.gold : artifactMats.metal
    );
    ring.rotation.set(Math.PI / 2 + i * .55, i * .7, i * .3);
    g.add(ring);
    rings.push(ring);
  }
  g.userData.spin = t => {
    core.rotation.y = t * .6;
    rings.forEach((r, i) => { r.rotation.z = t * (.25 + i * .08) * (i % 2 ? -1 : 1); });
  };
  return g;
}

function makeBeacon() {
  const g = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(.28, .5, 1.8, 8), artifactMats.dark);
  tower.position.y = .8;
  g.add(tower);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.58, .58, .1, 16), artifactMats.metal);
  collar.position.y = 1.7;
  g.add(collar);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(.28, 16, 12), artifactMats.gold);
  crown.position.y = 2;
  g.add(crown);
  const halo = addGlow(g, { color: 0xffc98a, scale: 3.2, opacity: .35, y: 2 });
  g.userData.spin = t => {
    crown.scale.setScalar(1 + Math.sin(t * 2.2) * .08);
    halo.material.opacity = .3 + Math.sin(t * 1.7) * .1;
  };
  return g;
}

const artifacts = {
  crystal: makeCrystal,
  shield: makeShield,
  books: makeBooks,
  crate: makeCrate,
  gyro: makeGyro,
  beacon: makeBeacon,
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

function makeLabel() {
  const { c, ctx } = canvas2d(1024, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, opacity: .92,
  }));
  sprite.scale.set(11, 2.75, 1);

  function setText(name, section) {
    ctx.clearRect(0, 0, 1024, 256);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.65)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffe0b0';
    ctx.font = '600 88px Georgia, "Times New Roman", serif';
    ctx.fillText(name.toUpperCase(), 512, 96);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(232,242,255,.86)';
    ctx.font = '500 40px "Instrument Sans", system-ui, sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText(section.toUpperCase(), 512, 178);
    tex.needsUpdate = true;
    sprite.userData.text = name;
  }

  return { sprite, setText };
}

// ---------------------------------------------------------------------------
// Planet definitions
// ---------------------------------------------------------------------------

const planetDefs = [
  {
    key: 'profile', name: 'Terra Nova', side: -1, z: 0, radius: 4.9, labelY: 7.1,
    surface: { base: '#2b6f9e', accent: '#5fa96f', dark: '#0c2d4d', light: '#c7b98a', seed: 4.2, type: 'earth' },
    atmo: 0x6fc8ff, atmoIntensity: .85, clouds: true, spinSpeed: .035,
    moons: [
      { radius: .42, distance: 8.2, color: 0xb9c7dd, speed: .22, phase: 1.2, tilt: .3 },
      { radius: .22, distance: 10.1, color: 0x8d9db8, speed: .34, phase: 3.4, tilt: -.2 },
    ],
    artifact: 'crystal',
    extraSpin: (g, t) => {
      const a = g.userData.artifact;
      if (a) { a.rotation.y = t * .5; a.position.y = Math.sin(t * .7) * .25; }
    },
  },
  {
    key: 'security', name: 'Aegis', side: 1, z: -1, radius: 4.2, labelY: 6.2,
    surface: { base: '#3a4358', accent: '#d8733f', dark: '#121827', light: '#94a6c4', seed: 11.7, type: 'lava' },
    atmo: 0xff9a63, atmoIntensity: .55, spinSpeed: .03,
    rings: [
      { inner: 1.35, outer: 2.15, a: '#ffb071', b: '#7c5c72', opacity: .28, tilt: .55, spin: .03 },
    ],
    moons: [{ radius: .3, distance: 7.4, color: 0x9aa7c2, speed: .3, phase: 2.1, tilt: .5 }],
    artifact: 'shield',
    extraSpin: (g, t) => {
      const a = g.userData.artifact;
      if (a) { a.position.y = Math.sin(t * .8 + 1) * .3; }
    },
  },
  {
    key: 'booktinder', name: 'Biblio', side: -1, z: 1, radius: 3.9, labelY: 6.1,
    surface: { base: '#9a5a41', accent: '#e0b07a', dark: '#45251f', light: '#f2d8b4', seed: 19.3, type: 'rock' },
    atmo: 0xffb788, atmoIntensity: .5, spinSpeed: .04,
    moons: [
      { radius: .34, distance: 6.6, color: 0xd8c2a6, speed: .27, phase: .6, tilt: -.3 },
      { radius: .18, distance: 8.3, color: 0xa88f78, speed: .4, phase: 4.1, tilt: .4 },
    ],
    artifact: 'books',
    extraSpin: (g, t) => {
      const a = g.userData.artifact;
      if (a) { a.position.y = Math.sin(t * .6 + 2) * .3; }
    },
  },
  {
    key: 'sezart', name: 'Sezart', side: 1, z: 0, radius: 4.35, labelY: 6.5,
    surface: { base: '#1f6d68', accent: '#d6bc86', dark: '#0d3537', light: '#8fd8c7', seed: 27.8, type: 'rock' },
    atmo: 0x6ff0da, atmoIntensity: .6, spinSpeed: .035,
    rings: [
      { inner: 1.45, outer: 2.4, a: '#8fe0ce', b: '#d8c08e', opacity: .26, tilt: -.35, spin: .045 },
    ],
    moons: [{ radius: .26, distance: 7.9, color: 0x9fc9bd, speed: .36, phase: 3.1, tilt: .2 }],
    artifact: 'crate',
    extraSpin: (g, t) => {
      const a = g.userData.artifact;
      if (a) { a.position.y = Math.sin(t * .65 + 4) * .28; }
    },
  },
  {
    key: 'skills', name: 'Orbital Forge', side: -1, z: -2, radius: 5.5, labelY: 7.8,
    surface: { base: '#4a3e8e', accent: '#a98be8', dark: '#19153f', light: '#e0c9ff', seed: 35.6, type: 'gas' },
    atmo: 0xb59cff, atmoIntensity: .7, spinSpeed: .025,
    rings: [
      { inner: 1.32, outer: 2.17, a: '#c9b6ff', b: '#5e4a9e', opacity: .45, tilt: .28, spin: .025 },
      { inner: 2.32, outer: 2.55, a: '#ffd9a0', b: '#7b6c9e', opacity: .2, tilt: .28, spin: -.02 },
    ],
    moons: [
      { radius: .4, distance: 9.4, color: 0xd8c8ff, speed: .18, phase: 2.4, tilt: .15 },
      { radius: .24, distance: 11.5, color: 0x9e8ec9, speed: .26, phase: 5.1, tilt: -.2 },
      { radius: .16, distance: 13.2, color: 0xffe0b0, speed: .38, phase: .8, tilt: .4 },
    ],
    artifact: 'gyro',
    extraSpin: (g, t) => {
      const a = g.userData.artifact;
      if (a) { a.rotation.y = t * .35; a.rotation.x = Math.sin(t * .3) * .2; }
    },
  },
  {
    key: 'contact', name: 'Beacon', side: 1, z: -1, radius: 4.15, labelY: 6.4,
    surface: { base: '#2a5e93', accent: '#c9ecff', dark: '#0e2440', light: '#ffffff', seed: 44.9, type: 'ice' },
    atmo: 0xa9e6ff, atmoIntensity: .8, spinSpeed: .032,
    rings: [
      { inner: 1.4, outer: 2.3, a: '#bdeaff', b: '#5f9dcc', opacity: .3, tilt: .4, spin: .03 },
    ],
    moons: [{ radius: .3, distance: 8.1, color: 0xcfe8ff, speed: .27, phase: 1.8, tilt: -.25 }],
    artifact: 'beacon',
    extraSpin: (g, t) => {
      const a = g.userData.artifact;
      if (a) { a.position.y = Math.sin(t * .7 + 3) * .26; }
    },
  },
];

const sectionLabels = {
  fr: {
    profile: 'Profil', security: 'Projet 01', booktinder: 'Projet 02',
    sezart: 'Projet 03', skills: 'Compétences', contact: 'Contact',
  },
  en: {
    profile: 'Profile', security: 'Project 01', booktinder: 'Project 02',
    sezart: 'Project 03', skills: 'Skills', contact: 'Contact',
  },
};

// ---------------------------------------------------------------------------
// Hero Earth: larger, closer, with a station ring
// ---------------------------------------------------------------------------

export function createHeroEarth() {
  const built = makePlanet({
    radius: 6.2,
    tilt: .2,
    surface: { base: '#245d9c', accent: '#4f9a68', dark: '#071f3d', light: '#d8c59a', seed: 7.7, type: 'earth' },
    atmo: 0x6fc8ff,
    atmoIntensity: 1.02,
    glowScale: 3.4,
    glowOpacity: .25,
    clouds: true,
    spinSpeed: .022,
    moons: [{ radius: .42, distance: 9.8, color: 0xc7d6e8, speed: .2, phase: 2.2, tilt: .3 }],
  });

  const orbit = new THREE.Group();
  orbit.rotation.x = Math.PI / 2 + .42;
  orbit.rotation.z = .32;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(8.7, .025, 6, 120),
    new THREE.MeshBasicMaterial({ color: 0x9fe4ff, transparent: true, opacity: .3, depthWrite: false })
  );
  orbit.add(ring);
  const station = new THREE.Mesh(
    new THREE.BoxGeometry(.6, .2, .2),
    new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xff8a3d, emissiveIntensity: .7, metalness: .4, roughness: .35 })
  );
  station.position.x = 8.7;
  orbit.add(station);
  built.group.add(orbit);

  const baseSpin = built.group.userData.spin;
  built.group.userData.spin = (t) => {
    baseSpin(t);
    orbit.rotation.y = t * .18;
    station.rotation.y = t * .5;
  };
  return built.group;
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export function createWorld(camera) {
  const group = new THREE.Group();

  const waypoints = planetDefs.map((def, i) => {
    const built = makePlanet(def);
    const g = built.group;
    group.add(g);

    const artifact = artifacts[def.artifact]?.();
    if (artifact) {
      artifact.scale.setScalar(.42);
      const orbit = new THREE.Group();
      orbit.rotation.x = .4 + i * .17;
      orbit.rotation.z = i * .8;
      artifact.position.set(def.radius * 1.75, 0, 0);
      orbit.add(artifact);
      orbit.userData.noBounds = true;
      g.add(orbit);
      g.userData.artifact = artifact;
      g.userData.artifactOrbit = orbit;
    }

    // A faint orbital thread around the planet.
    const orbitLine = new THREE.Mesh(
      new THREE.TorusGeometry(def.radius * 1.95, .014, 4, 96),
      new THREE.MeshBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: .18, depthWrite: false })
    );
    orbitLine.rotation.x = Math.PI / 2 + .32;
    orbitLine.rotation.z = .4;
    orbitLine.userData.noBounds = true;
    g.add(orbitLine);

    const halo = addGlow(g, {
      color: def.atmo, scale: def.radius * 2.8, opacity: .12, z: -1,
    });
    halo.userData.noBounds = true;

    // The contact planet sends a visible signal toward the contact card.
    if (def.key === 'contact') {
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x9fe4ff, transparent: true, opacity: .2,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.85, .035, 26, 16, 1, true), beamMat);
      beam.position.y = 13;
      beam.userData.noBounds = true;
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xe8fbff, transparent: true, opacity: .34,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(.12, .012, 26, 8, 1, true), coreMat);
      core.position.y = 13;
      core.userData.noBounds = true;
      const pivot = new THREE.Group();
      pivot.add(beam, core);
      const emitter = new THREE.Mesh(
        new THREE.SphereGeometry(.32, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xe8fbff, fog: false })
      );
      emitter.userData.noBounds = true;
      pivot.add(emitter);
      addGlow(pivot, { color: 0x9fe4ff, scale: 4.2, opacity: .35 });
      addGlow(pivot, { color: 0xdff8ff, scale: 2.4, opacity: .45, y: 26 });
      g.add(pivot);
      g.userData.beamMat = beamMat;
      g.userData.beamCoreMat = coreMat;
      g.userData.aim = (side) => {
        pivot.rotation.z = side === 0 ? Math.PI : (side > 0 ? 1.62 : -1.62);
        pivot.rotation.x = side === 0 ? 0 : .08;
      };
    }

    const label = makeLabel();
    label.sprite.position.set(def.labelX || 0, def.labelY, 0);
    g.add(label.sprite);

    return {
      ...def, group: g, label, index: i,
      centerX: 0, centerY: 0, sizeX: def.radius * 2, sizeY: def.radius * 2,
      baseX: 0, baseY: 0, baseZ: def.z, scale: 1, mobileScale: .3,
      stagePx: 0, cardTop: null,
    };
  });

  // Measure only the solid planet + its rings; moons, glows and labels are
  // deliberately excluded so the visual centre stays on the planet.
  for (const wp of waypoints) {
    wp.group.updateMatrixWorld(true);
    const box = new THREE.Box3();
    wp.group.traverse(o => {
      if (!(o.isMesh || o.isLine) || o.userData.noBounds || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
    });
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    wp.centerX = center.x;
    wp.centerY = center.y;
    wp.sizeX = Math.max(1, size.x);
    wp.sizeY = Math.max(1, size.y);
  }

  // Flight gates: faint rings the camera passes through.
  const gateMat = new THREE.MeshBasicMaterial({
    color: 0xffd9a0, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false,
  });
  const gateDefs = [
    [0.11, -1.5, 7.5, 0], [0.25, 2.2, 8.5, 1], [0.39, -2.6, 8, 2],
    [0.54, 2.8, 8.5, 3], [0.68, -2.2, 9, 4], [0.82, 2.4, 8.5, 5], [0.94, -1.6, 9.5, 6],
  ];
  const gates = gateDefs.map(([p, x, r, i]) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, .05, 6, 96), gateMat);
    mesh.position.set(x, 0, -4 - i * .5);
    mesh.rotation.z = i * .8;
    group.add(mesh);
    return { mesh, p, i };
  });

  // Asteroid belts: instanced low-poly rocks, one mid-journey and one near the beacon.
  function makeBelt({ y, count, spread, speed, seed }) {
    const rand = rng(seed);
    const geo = new THREE.DodecahedronGeometry(.46, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b7088, roughness: .95, metalness: .08, flatShading: true });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = 13 + rand() * spread;
      dummy.position.set(Math.cos(a) * r, y + (rand() - .5) * 11, Math.sin(a) * r * .7 - 6);
      dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      const s = .25 + rand() * 1.05;
      dummy.scale.set(s, s * (0.7 + rand() * .5), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.speed = speed;
    group.add(mesh);
    return mesh;
  }

  const belts = [
    makeBelt({ y: -0.36 * 170, count: innerWidth < 700 ? 80 : 150, spread: 26, speed: .018, seed: 5.5 }),
    makeBelt({ y: -0.79 * 170, count: innerWidth < 700 ? 55 : 105, spread: 22, speed: -.014, seed: 13.2 }),
  ];

  // A distant sun, used as a visual anchor and warm rim light.
  const sun = new THREE.Group();
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff1d0 })
  );
  sun.add(sunCore);
  addGlow(sun, { color: 0xffd0a0, scale: 46, opacity: .42 });
  addGlow(sun, { color: 0xfff4dc, scale: 18, opacity: .75 });
  sun.position.set(-56, -70, -118);
  group.add(sun);

  let wide = true;

  function layout(anchors, depth) {
    wide = innerWidth >= 1200;
    const fov = THREE.MathUtils.degToRad(camera.fov / 2);

    for (const gate of gates) gate.mesh.position.y = -gate.p * depth;

    for (const wp of waypoints) {
      const raw = anchors[wp.key];
      const centerP = raw && typeof raw === 'object' ? raw.center : (raw ?? .5);
      wp.p = centerP;
      wp.stagePx = raw && typeof raw === 'object' ? (raw.stage || 0) : 0;
      wp.cardTop = raw && typeof raw === 'object' ? (raw.cardTop ?? null) : null;
      wp.group.visible = true;

      if (wide) {
        const dist = 34 - wp.z;
        const halfW = Math.tan(fov) * dist * camera.aspect;
        wp.baseX = wp.side * Math.min(halfW * .8, 30);
        wp.baseY = -centerP * depth;
        wp.baseZ = wp.z;
        wp.scale = 1;
        wp.group.scale.setScalar(wp.scale);
      } else {
        // Phones: fit the whole planet (including rings) inside the stage.
        const dist = 34;
        const worldH = 2 * Math.tan(fov) * dist;
        const pxPerWorld = innerHeight / worldH;
        const s = Math.min(
          (Math.max(70, wp.stagePx) * .8) / (wp.sizeY * pxPerWorld),
          (innerWidth * .72) / (wp.sizeX * pxPerWorld)
        );
        wp.mobileScale = Math.max(.12, Math.min(.55, s));
        wp.baseX = 0;
        wp.baseY = -centerP * depth;
        wp.baseZ = 0;
        wp.group.scale.setScalar(wp.mobileScale);
      }

      wp.group.position.set(wp.baseX, wp.baseY, wp.baseZ);
      wp.label.sprite.visible = wide && innerWidth >= 1360;
      wp.label.sprite.scale.set(10 / wp.group.scale.x, 2.5 / wp.group.scale.x, 1);
      wp.group.userData.aim?.(wide ? wp.side : 0);
    }
  }

  const _ray = new THREE.Vector3();
  const _labelPos = new THREE.Vector3();
  const labelFov = THREE.MathUtils.degToRad(58 / 2);

  // Keep the 3D place labels inside the frame. The labels live in the scene, so
  // without this they get clipped at the edges on narrower desktops.
  function clampLabel(wp) {
    wp.label.sprite.position.x = 0;
    if (!wp.label.sprite.visible) return;
    const s = wp.group.scale.x;
    const dist = Math.max(1, Math.abs(wp.group.position.z - camera.position.z));
    const px = innerHeight / (2 * Math.tan(labelFov) * dist);
    const half = (10 / (2 * Math.tan(labelFov) * dist)) * innerHeight * .5;
    _labelPos.set(
      wp.group.position.x,
      wp.group.position.y + wp.label.sprite.position.y * s,
      wp.group.position.z
    ).project(camera);
    const sx = (_labelPos.x * .5 + .5) * innerWidth;
    const lo = half + 10, hi = innerWidth - half - 10;
    let dx = 0;
    if (sx < lo) dx = lo - sx;
    else if (sx > hi) dx = hi - sx;
    if (dx) wp.label.sprite.position.x = dx / px / s;
  }

  function update(prog, time, reduce, scrollY = 0) {
    for (const gate of gates) {
      gate.mesh.rotation.z = time * (reduce ? 0 : .07) * (gate.i % 2 ? -1 : 1) + gate.p * 4;
      gate.mesh.material.opacity = .24 + Math.sin(time * .8 + gate.i) * .06;
    }
    if (!reduce) {
      for (const belt of belts) belt.rotation.y += belt.userData.speed * .016;
      sun.rotation.z = Math.sin(time * .02) * .05;
    }

    for (const wp of waypoints) {
      const near = 1 - Math.min(1, Math.abs(prog - (wp.p ?? 0)) / .09);
      const s = (wide ? 1 : wp.mobileScale) * (1 + near * .035);
      wp.group.scale.setScalar(s);
      if (wide) wp.label.sprite.scale.set(10 / s, 2.5 / s, 1);

      if (!wide && wp.stagePx > 0 && wp.cardTop != null) {
        const bob = reduce ? 0 : Math.sin(time * .7 + wp.index * 1.3) * 3;
        const screenY = wp.cardTop - scrollY + wp.stagePx * .5 + bob;
        _ray.set(0, 1 - (screenY / innerHeight) * 2, .5)
          .unproject(camera).sub(camera.position).normalize();
        const hit = (wp.baseZ - camera.position.z) / _ray.z;
        wp.group.position.set(
          camera.position.x + _ray.x * hit - wp.centerX * s,
          camera.position.y + _ray.y * hit - wp.centerY * s,
          wp.baseZ
        );
      } else {
        const drift = reduce ? 0 : Math.sin(time * .45 + wp.index * 1.7) * .3;
        wp.group.position.x = wp.baseX + (reduce ? 0 : Math.sin(time * .21 + wp.index) * .22);
        wp.group.position.y = wp.baseY + drift;
        wp.group.position.z = wp.baseZ;
        if (!reduce && wp.group.userData.artifactOrbit) {
          wp.group.userData.artifactOrbit.rotation.y = time * (.18 + wp.index * .03);
        }
      }

      if (!reduce && wp.group.userData.spin) wp.group.userData.spin(time);
      clampLabel(wp);
      wp.label.sprite.material.opacity = .72 + near * .25;
      if (wp.group.userData.beamMat) {
        wp.group.userData.beamMat.opacity = .17 + Math.sin(time * 1.8) * .04;
        wp.group.userData.beamCoreMat.opacity = .3 + Math.sin(time * 1.8 + .5) * .07;
      }
    }
  }

  function setLang(lang) {
    const dict = sectionLabels[lang] || sectionLabels.fr;
    for (const wp of waypoints) wp.label.setText(wp.name, dict[wp.key]);
  }

  setLang('fr');

  return { group, layout, update, setLang, waypoints, gates, belts, sun };
}
