import * as THREE from 'three';

// A small floating archipelago: every section gets a 3D artifact anchored to it,
// so scrolling is an actual flight past objects instead of a moving wallpaper.
const ACCENT = 0xffd9a0;
const FONT = 'Georgia, "Times New Roman", serif';

const clamp01 = v => Math.min(1, Math.max(0, v));
const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

export function createWorld(camera) {
  const group = new THREE.Group();

  const mats = {
    metal: new THREE.MeshStandardMaterial({
      color: 0x55647d, metalness: 0.85, roughness: 0.32, flatShading: true, envMapIntensity: 0.9,
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x1d2739, metalness: 0.6, roughness: 0.5, flatShading: true, envMapIntensity: 0.6,
    }),
    pale: new THREE.MeshStandardMaterial({
      color: 0xd7e3f4, metalness: 0.15, roughness: 0.55, flatShading: true,
    }),
    rock: new THREE.MeshStandardMaterial({
      color: 0x4d5c74, metalness: 0.1, roughness: 0.95, flatShading: true,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: ACCENT, emissive: 0xff8a3d, emissiveIntensity: 0.75, roughness: 0.35, metalness: 0.2,
    }),
    accentSoft: new THREE.MeshBasicMaterial({
      color: ACCENT, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    beam: new THREE.MeshBasicMaterial({
      color: 0xffc98a, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide,
    }),
    wire: new THREE.MeshBasicMaterial({
      color: 0xffe0b0, wireframe: true, transparent: true, opacity: 0.22, depthWrite: false,
    }),
    line: new THREE.LineBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: 0.45 }),
  };

  // Shared radial texture for the little cloud each island sits on.
  const cloudTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(0.45, 'rgba(240,248,255,.35)');
    g.addColorStop(1, 'rgba(240,248,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  function island(radius, seed) {
    const g = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(radius, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = 1 + (hash(i + seed) - 0.5) * 0.18;
      pos.setXYZ(i, x * k, (y < 0 ? y * 1.7 : y) * k, z * k);
    }
    geo.computeVertexNormals();

    const rock = new THREE.Mesh(geo, mats.rock);
    rock.scale.set(1, 0.72, 1);
    rock.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xffcf8a, transparent: true, opacity: 0.14 })
    ));
    g.add(rock);

    for (let i = 0; i < 3; i++) {
      const pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * (0.1 + hash(i + seed) * 0.09), 0), mats.rock);
      const a = i * 2.1 + seed;
      pebble.position.set(Math.cos(a) * radius * 0.95, -radius * (0.45 + hash(i + seed + 3) * 0.4), Math.sin(a) * radius * 0.5);
      g.add(pebble);
    }

    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTex, transparent: true, opacity: 0.32, depthWrite: false,
    }));
    cloud.scale.set(radius * 2.6, radius * 1.1, 1);
    cloud.position.y = -radius * 0.75;
    g.add(cloud);

    return g;
  }

  function makeLabel() {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false, opacity: 0.9,
    }));
    sprite.scale.set(11, 2.75, 1);
    sprite.position.y = 7.4;

    function setText(text) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `600 100px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(7,11,31,.6)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#ffe0b0';
      ctx.fillText(text.toUpperCase(), 512, 128);
      ctx.shadowColor = 'transparent';
      sprite.userData.text = text;
      tex.needsUpdate = true;
    }

    return { sprite, setText };
  }

  // --- Profile: a floating island with a crystal and an orbit cage ---
  function buildProfile() {
    const g = island(3.6, 1.7);
    const spin = new THREE.Group();
    spin.position.y = 3.4;

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), mats.accent);
    crystal.scale.set(1, 1.65, 1);
    spin.add(crystal);

    const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(2.05, 0), mats.wire);
    spin.add(cage);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.05, 6, 72), mats.accentSoft);
    ring.rotation.x = Math.PI / 2.6;
    spin.add(ring);

    g.add(spin);
    g.userData.spin = (t) => { spin.rotation.y = t * 0.35; cage.rotation.y = -t * 0.18; };
    return g;
  }

  // --- Security: shield + halo ring ---
  function buildShield() {
    const g = island(3.2, 4.2);
    const shieldGroup = new THREE.Group();
    shieldGroup.position.y = 4;

    const shape = new THREE.Shape();
    shape.moveTo(0, 1.5);
    shape.bezierCurveTo(1.0, 1.5, 1.55, 1.05, 1.55, 0.35);
    shape.bezierCurveTo(1.55, -0.55, 0.85, -1.25, 0, -1.75);
    shape.bezierCurveTo(-0.85, -1.25, -1.55, -0.55, -1.55, 0.35);
    shape.bezierCurveTo(-1.55, 1.05, -1.0, 1.5, 0, 1.5);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.34, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.07, bevelThickness: 0.07,
    });
    geo.center();
    const shield = new THREE.Mesh(geo, mats.metal);
    shield.scale.setScalar(1.45);
    shieldGroup.add(shield);

    const key = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), mats.accent);
    key.position.z = 0.5;
    shieldGroup.add(key);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.045, 6, 80), mats.accentSoft);
    ring.rotation.x = Math.PI / 2;
    shieldGroup.add(ring);

    g.add(shieldGroup);
    g.userData.spin = (t) => { shieldGroup.rotation.y = Math.sin(t * 0.3) * 0.35 + 0.15; };
    return g;
  }

  // --- BookTinder: a stack of books with a bookmark ---
  function buildBooks() {
    const g = island(3.0, 8.4);
    const stack = new THREE.Group();
    stack.position.y = 2.6;
    const colors = [0x2c4a78, 0x7a4b3a, 0x3d6659];

    for (let i = 0; i < 3; i++) {
      const cover = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.42, 2.3),
        new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.55, metalness: 0.18, flatShading: true })
      );
      cover.position.y = i * 0.46;
      cover.rotation.y = (i - 1) * 0.26;
      stack.add(cover);

      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 2.02), mats.pale);
      pages.position.x = 1.62;
      cover.add(pages);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cover.geometry), mats.line);
      edges.position.copy(cover.position);
      edges.rotation.copy(cover.rotation);
      stack.add(edges);
    }

    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.75, 1.5), mats.accent);
    mark.position.set(1.05, 1.35, 0.35);
    mark.rotation.z = -0.18;
    stack.add(mark);

    g.add(stack);
    g.userData.spin = (t) => { stack.rotation.y = Math.sin(t * 0.25) * 0.22; };
    return g;
  }

  // --- Sezart: floating crate / storefront ---
  function buildCrate() {
    const g = island(3.0, 12.1);
    const crate = new THREE.Group();
    crate.position.y = 3;

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 2.6), mats.dark);
    crate.add(body);

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), mats.line);
    crate.add(edges);

    const band = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.16, 2.74), mats.accent);
    band.position.y = 0.2;
    crate.add(band);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.22, 2.85), mats.metal);
    lid.position.y = 1.3;
    crate.add(lid);

    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6), mats.accent);
    tag.position.set(1.6, 0.55, 1.05);
    tag.rotation.set(0, 0.25, -0.3);
    tag.material.side = THREE.DoubleSide;
    crate.add(tag);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.04, 6, 72), mats.accentSoft);
    ring.rotation.x = Math.PI / 2.4;
    crate.add(ring);

    g.add(crate);
    g.userData.spin = (t) => {
      crate.rotation.y = Math.sin(t * 0.22) * 0.3;
      tag.rotation.z = -0.3 + Math.sin(t * 0.8) * 0.08;
    };
    return g;
  }

  // --- Skills: gyroscope of rings and nodes ---
  function buildOrbit() {
    const g = new THREE.Group();
    g.position.y = 3.2;

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), mats.accent);
    g.add(core);

    const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), mats.wire);
    g.add(halo);

    const orbs = [];
    for (let i = 0; i < 3; i++) {
      const radius = 2.2 + i * 0.65;
      const orb = new THREE.Group();
      orb.rotation.set(Math.PI / 2 + i * 0.5, i * 0.7, i * 0.3);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.038, 6, 80), mats.metal);
      orb.add(ring);

      for (let j = 0; j < 3; j++) {
        const a = (j / 3) * Math.PI * 2 + i;
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), mats.accent);
        node.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        orb.add(node);
      }

      g.add(orb);
      orbs.push(orb);
    }

    g.userData.spin = (t) => {
      orbs.forEach((orb, i) => { orb.rotation.z = t * (0.18 + i * 0.06) * (i % 2 ? -1 : 1); });
      core.rotation.y = t * 0.4;
      halo.rotation.y = -t * 0.2;
    };
    return g;
  }

  // --- Contact: beacon with a light shaft ---
  function buildBeacon() {
    const g = island(3.1, 16.9);
    const rig = new THREE.Group();
    rig.position.y = 2.6;

    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 4.2, 8), mats.dark);
    tower.position.y = 1.6;
    rig.add(tower);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.2, 16), mats.metal);
    collar.position.y = 3.7;
    rig.add(collar);

    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 12), mats.accent);
    crown.position.y = 4.35;
    rig.add(crown);

    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 6, 72), mats.accentSoft);
    ringA.position.y = 4.2;
    ringA.rotation.x = Math.PI / 2;
    rig.add(ringA);

    const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.03, 6, 72), mats.accentSoft);
    ringB.position.y = 4.2;
    ringB.rotation.x = Math.PI / 2.6;
    rig.add(ringB);

    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 0.1, 24, 20, 1, true), mats.beam);
    beam.position.y = 15.5;
    rig.add(beam);

    g.add(rig);
    g.userData.spin = (t) => {
      ringA.rotation.z = t * 0.35;
      ringB.rotation.z = -t * 0.22;
      crown.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);
    };
    return g;
  }

  // Tiny helper for secondary bobbing that does not fight the group animation.
  const defs = [
    { key: 'profile', side: -1, build: buildProfile, z: 2, scale: 1, labelY: 7.4 },
    { key: 'security', side: 1, build: buildShield, z: 0, scale: 1, labelY: 7.6 },
    { key: 'booktinder', side: -1, build: buildBooks, z: 0, scale: 1, labelY: 7.2 },
    { key: 'sezart', side: 1, build: buildCrate, z: 0, scale: 1, labelY: 7.2 },
    { key: 'skills', side: -1, build: buildOrbit, z: 2, scale: 1, labelY: 7.6 },
    { key: 'contact', side: 1, build: buildBeacon, z: -2, scale: 1, labelY: 8.2 },
  ];

  const labels = {
    fr: { profile: 'Profil', security: 'Sécurité', booktinder: 'BookTinder', sezart: 'Sezart', skills: 'Compétences', contact: 'Contact' },
    en: { profile: 'Profile', security: 'Security', booktinder: 'BookTinder', sezart: 'Sezart', skills: 'Skills', contact: 'Contact' },
  };

  const waypoints = defs.map((def, i) => {
    const g = def.build();
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTex, color: 0xffc98a, transparent: true, opacity: 0.16,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.set(13, 13, 1);
    halo.position.set(0, 3.2, -2);
    g.add(halo);
    const label = makeLabel();
    label.sprite.position.y = def.labelY;
    g.add(label.sprite);
    group.add(g);
    return {
      ...def, group: g, label, index: i,
      baseY: 0, baseX: 0, baseZ: def.z, visible: true,
    };
  });

  let wide = true;

  // Flight gates: faint rings the camera passes through, visible on every screen.
  const gateMat = new THREE.MeshBasicMaterial({
    color: ACCENT, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false,
  });
  const gateDefs = [
    [0.16, -1, 9, 0], [0.34, 2, 10, 1], [0.53, -2, 9.5, 2],
    [0.72, 1.5, 10, 3], [0.9, -1, 11, 4],
  ];
  const gates = gateDefs.map(([p, x, r, i]) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 6, 96), gateMat);
    mesh.position.set(x, 0, -4 - i);
    mesh.rotation.z = i * 0.8;
    group.add(mesh);
    return { mesh, p };
  });

  // Distant moon, there for the night end of the climb.
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xf6ecd8, fog: false })
  );
  moon.position.set(-27, -138, -70);
  group.add(moon);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: cloudTex, color: 0xfff1d6, transparent: true, opacity: 0.25,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  moonGlow.scale.set(36, 36, 1);
  moonGlow.position.copy(moon.position).setZ(-72);
  group.add(moonGlow);

  function layout(anchors, depth) {
    wide = innerWidth >= 1100;
    const fov = THREE.MathUtils.degToRad(camera.fov / 2);

    for (const gate of gates) gate.mesh.position.y = -gate.p * depth;

    for (const wp of waypoints) {
      const p = anchors[wp.key] ?? 0.5;
      wp.p = p;
      wp.group.visible = wide;

      if (wide) {
        const dist = 30 - wp.z;
        const halfW = Math.tan(fov) * dist * camera.aspect;
        wp.baseX = wp.side * Math.min(halfW * 0.73, 30);
        wp.baseY = -p * depth;
        wp.baseZ = wp.z;
        wp.group.scale.setScalar(wp.scale);
      } else {
        wp.baseX = 0;
        wp.baseY = -p * depth;
        wp.baseZ = -22;
        wp.group.scale.setScalar(0.66);
      }

      wp.group.position.set(wp.baseX, wp.baseY, wp.baseZ);
      wp.label.sprite.visible = wide;
    }
  }

  function update(prog, time, reduce) {
    for (const gate of gates) {
      gate.mesh.rotation.z = time * (reduce ? 0 : 0.09) * (gate.p > 0.5 ? -1 : 1) + gate.p * 4;
    }
    if (!reduce) moonGlow.material.opacity = 0.22 + Math.sin(time * 0.7) * 0.03;

    for (const wp of waypoints) {
      if (!wide) continue;
      const drift = reduce ? 0 : Math.sin(time * 0.5 + wp.index * 1.7) * 0.28;
      wp.group.position.y = wp.baseY + drift;
      wp.group.position.x = wp.baseX + (reduce ? 0 : Math.sin(time * 0.23 + wp.index) * 0.18);

      // Slight emphasis when the matching section is centered.
      const near = 1 - Math.min(1, Math.abs(prog - (wp.p ?? 0)) / 0.09);
      const s = (wide ? wp.scale : 0.66) * (1 + near * 0.05);
      wp.group.scale.setScalar(s);
      wp.label.sprite.scale.set(10 / s, 2.5 / s, 1);

      if (!reduce && wp.group.userData.spin) wp.group.userData.spin(time);
    }
  }

  function setLang(lang) {
    for (const wp of waypoints) wp.label.setText(labels[lang]?.[wp.key] ?? labels.fr[wp.key]);
  }

  setLang('fr');

  return { group, layout, update, setLang, waypoints, gates };
}
