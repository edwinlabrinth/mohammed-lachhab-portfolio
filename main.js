import * as THREE from 'three';

// Concept: scroll = altitude. Ground (day) -> sunset layer -> night sky with stars.
const canvas = document.getElementById('sky');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch { /* CSS gradient fallback stays */ }
if (renderer) init();

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  camera.position.z = 30;

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
  const puffs = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  // Clusters of puffs = clouds, spread over the full altitude range
  for (let k = 0; k < 34; k++) {
    const cxp = rnd(-60, 60), cyp = -rnd(0, DEPTH), czp = rnd(-70, 8);
    for (let i = 0; i < 9; i++) {
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
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0, depthWrite: false });
  scene.add(new THREE.Points(sg, starMat));

  let target = 0, prog = 0, mx = 0, my = 0;
  const altEl = document.getElementById('alt'), barEl = document.getElementById('altbar');
  const onScroll = () => { target = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
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

    camera.position.y = -prog * DEPTH;
    camera.position.x += (mx * 6 - camera.position.x) * .05;
    camera.rotation.x = -my * .06;

    altEl.textContent = Math.round(prog * 12000).toLocaleString('fr-FR');
    barEl.style.width = (prog * 100) + '%';
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
}
