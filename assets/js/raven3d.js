/* =========================================================
   RavenShield — live 3D raven
   A rigged, low-poly raven (body, head, opening beak, wings,
   tail, legs) that steps out of the logo shield, turns its whole
   body 180°, screeches, flies away and lands back.
   Requires THREE (r128, assets/vendor/three.min.js).
   ========================================================= */
(function () {
  "use strict";
  if (!window.THREE) return;
  const T = THREE;
  const D = Math.PI / 180;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // slow-motion in-out

  /* ---------------- materials ---------------- */
  function mats() {
    const std = (o) => new T.MeshStandardMaterial(Object.assign({ flatShading: true, transparent: true }, o));
    return {
      body: std({ color: 0x0e1320, metalness: 0.55, roughness: 0.32 }),
      dark: std({ color: 0x080b12, metalness: 0.4, roughness: 0.45, side: T.DoubleSide }),
      feather: std({ color: 0x121827, metalness: 0.6, roughness: 0.3, side: T.DoubleSide }),
      silver: std({ color: 0xe6edf6, metalness: 0.75, roughness: 0.22, side: T.DoubleSide }),
      cyan: std({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.2, metalness: 0.2, roughness: 0.3, side: T.DoubleSide }),
      eye: new T.MeshBasicMaterial({ color: 0xd8feff, transparent: true }),
      mouth: std({ color: 0x9f1239, roughness: 0.6, metalness: 0 }),
      beak: std({ color: 0xcfd8e4, metalness: 0.8, roughness: 0.25 }),
    };
  }

  function glowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(220,255,255,1)");
    r.addColorStop(0.25, "rgba(46,230,245,.9)");
    r.addColorStop(1, "rgba(46,230,245,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(c);
  }

  function featherGeo(len, wid) {
    const s = new T.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(wid, len * 0.25, wid * 0.7, len * 0.8);
    s.quadraticCurveTo(wid * 0.35, len * 1.02, 0, len);
    s.quadraticCurveTo(-wid * 0.45, len * 0.7, -wid * 0.5, len * 0.3);
    s.quadraticCurveTo(-wid * 0.4, 0.05, 0, 0);
    return new T.ShapeGeometry(s, 3);
  }

  /* ---------------- the raven model ---------------- */
  function buildRaven(M) {
    const root = new T.Group();
    const rig = {};
    const TILT = 0.62;                       // body leans forward like a perched raven
    const axis = (y) => new T.Vector3(0, y * Math.cos(TILT), y * Math.sin(TILT));

    const bodyPivot = new T.Group();
    root.add(bodyPivot);

    // body: faceted teardrop (lathe), chest forward, tapering to the tail
    const prof = [[0.02, -1.3], [0.16, -1.08], [0.34, -0.72], [0.5, -0.3], [0.56, 0.08], [0.52, 0.42], [0.4, 0.7], [0.26, 0.9], [0.04, 1.0]]
      .map(([r, y]) => new T.Vector2(r, y));
    const body = new T.Mesh(new T.LatheGeometry(prof, 8), M.body);
    body.scale.set(0.82, 1, 1);
    body.rotation.x = TILT;
    bodyPivot.add(body);
    // chest shards (silver spikes like the logo's feather blades)
    for (let i = 0; i < 5; i++) {
      const sh = new T.Mesh(new T.ConeGeometry(0.06, 0.6 - Math.abs(i - 2) * 0.1, 3), M.silver);
      const p = axis(-0.05 - Math.abs(i - 2) * 0.12);
      sh.position.set((i - 2) * 0.13, p.y, p.z + 0.5 - Math.abs(i - 2) * 0.06);
      sh.rotation.set(Math.PI + 0.25, 0, (i - 2) * 0.22);
      bodyPivot.add(sh);
    }
    // back blades
    for (let i = 0; i < 3; i++) {
      const b = new T.Mesh(new T.ConeGeometry(0.05, 0.7, 3), M.silver);
      const p = axis(0.3 - i * 0.35);
      b.position.set(0, p.y + 0.05, p.z - 0.48);
      b.rotation.set(-2.2, 0, 0);
      bodyPivot.add(b);
    }
    // cyan collar (logo accent)
    const arc = new T.Mesh(new T.TorusGeometry(0.4, 0.03, 4, 20, Math.PI * 0.95), M.cyan);
    const ap = axis(0.62);
    arc.position.set(0, ap.y, ap.z + 0.05);
    arc.rotation.set(0.95, 0, Math.PI * 1.03);
    bodyPivot.add(arc);

    // neck + head
    const neck = new T.Group();
    const np = axis(0.92);
    neck.position.set(0, np.y + 0.06, np.z + 0.04);
    bodyPivot.add(neck);
    rig.neck = neck;
    const head = new T.Mesh(new T.IcosahedronGeometry(0.44, 1), M.body);
    head.scale.set(0.8, 0.82, 1.12);
    head.position.set(0, 0.16, 0.02);
    neck.add(head);
    // shaggy throat hackles (ravens have these)
    for (let i = 0; i < 5; i++) {
      const h = new T.Mesh(new T.ConeGeometry(0.06, 0.34, 3), M.dark);
      h.position.set((i - 2) * 0.07, -0.1, 0.22 - Math.abs(i - 2) * 0.04);
      h.rotation.set(Math.PI - 0.5, 0, (i - 2) * 0.2);
      neck.add(h);
    }
    // crest (silver, swept back like the logo)
    for (let i = 0; i < 4; i++) {
      const c = new T.Mesh(new T.ConeGeometry(0.06, 0.75 - i * 0.1, 3), M.silver);
      c.position.set((i - 1.5) * 0.06, 0.48 - i * 0.05, -0.08 - i * 0.07);
      c.rotation.set(-1.85 + i * 0.1, 0, (i - 1.5) * 0.1);
      neck.add(c);
    }
    // angry brows
    [-1, 1].forEach((sgn) => {
      const brow = new T.Mesh(new T.BoxGeometry(0.3, 0.05, 0.07), M.silver);
      brow.position.set(sgn * 0.19, 0.31, 0.3);
      brow.rotation.set(0.25, sgn * 0.45, sgn * -0.42);
      neck.add(brow);
    });
    // eyes + glow
    const glowTex = glowTexture();
    rig.eyes = [];
    [-1, 1].forEach((sgn) => {
      const e = new T.Group();
      e.position.set(sgn * 0.25, 0.21, 0.27);
      const ball = new T.Mesh(new T.SphereGeometry(0.07, 12, 10), M.eye);
      const pupil = new T.Mesh(new T.BoxGeometry(0.016, 0.09, 0.02), new T.MeshBasicMaterial({ color: 0x031018, transparent: true }));
      pupil.position.set(sgn * 0.035, 0, 0.05);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.scale.set(0.32, 0.32, 1);
      e.add(ball, pupil, glow);
      e.userData.glow = glow;
      neck.add(e);
      rig.eyes.push(e);
    });
    // heavy raven beak: upper (hooked) + lower (hinged) + mouth
    const upper = new T.Group();
    upper.position.set(0, 0.12, 0.42);
    neck.add(upper);
    const ub = new T.Mesh(new T.ConeGeometry(0.2, 1.0, 5), M.beak);
    ub.rotation.x = Math.PI / 2 + 0.16;
    ub.position.set(0, -0.06, 0.46);
    ub.scale.set(0.75, 1, 1);
    upper.add(ub);
    const hook = new T.Mesh(new T.ConeGeometry(0.05, 0.18, 4), M.beak);
    hook.position.set(0, -0.17, 0.92);
    hook.rotation.x = Math.PI - 0.3;
    upper.add(hook);
    const lower = new T.Group();
    lower.position.set(0, 0.0, 0.4);
    neck.add(lower);
    const lb = new T.Mesh(new T.ConeGeometry(0.14, 0.78, 5), M.beak);
    lb.rotation.x = Math.PI / 2 - 0.02;
    lb.position.set(0, -0.06, 0.36);
    lb.scale.set(0.75, 1, 0.55);
    lower.add(lb);
    const tongue = new T.Mesh(new T.ConeGeometry(0.07, 0.42, 5), M.mouth);
    tongue.rotation.x = Math.PI / 2;
    tongue.position.set(0, 0.02, 0.24);
    lower.add(tongue);
    rig.upper = upper;
    rig.lower = lower;

    // wings (shoulder pivot; feathers fan inside the wing plane)
    function wing(side) {
      const shoulder = new T.Group();
      const sp = axis(0.5);
      shoulder.position.set(side * 0.4, sp.y, sp.z - 0.05);
      shoulder.scale.x = side;
      const plane = new T.Group();
      shoulder.add(plane);
      const feathers = [];
      const N = 11;
      for (let i = 0; i < N; i++) {
        const k = i / (N - 1);
        const pivot = new T.Group();
        pivot.position.set(0.1 + k * 1.2, 0, 0);
        const len = lerp(0.8, 1.55, Math.pow(k, 0.7));
        const f = new T.Mesh(featherGeo(len, 0.17 + k * 0.05), i % 2 ? M.feather : M.dark);
        f.rotation.x = -Math.PI / 2;
        f.position.y = -0.006 * i;
        pivot.add(f);
        if (i % 3 === 2 || i === N - 1) {
          const tip = new T.Mesh(featherGeo(len * 0.4, 0.06), M.silver);
          tip.rotation.x = -Math.PI / 2;
          tip.position.set(0, 0.012, -len * 0.55);
          pivot.add(tip);
        }
        plane.add(pivot);
        feathers.push({ pivot, k });
      }
      const arm = new T.Mesh(new T.BoxGeometry(1.4, 0.09, 0.26), M.body);
      arm.position.set(0.7, 0.03, -0.06);
      plane.add(arm);
      const edge = new T.Mesh(new T.BoxGeometry(1.35, 0.035, 0.04), M.cyan);
      edge.position.set(0.7, 0.07, 0.08);
      plane.add(edge);
      bodyPivot.add(shoulder);
      return { shoulder, plane, feathers, side };
    }
    rig.wings = [wing(1), wing(-1)];

    // long wedge tail
    const tail = new T.Group();
    const tp = axis(-1.12);
    tail.position.set(0, tp.y, tp.z);
    bodyPivot.add(tail);
    for (let i = 0; i < 7; i++) {
      const p = new T.Group();
      p.rotation.y = (i - 3) * 0.1;
      const f = new T.Mesh(featherGeo(1.05 - Math.abs(i - 3) * 0.08, 0.16), i === 3 ? M.silver : M.feather);
      f.rotation.x = -Math.PI / 2 - (Math.PI / 2 - TILT) + 0.1;
      p.add(f);
      tail.add(p);
    }
    rig.tail = tail;

    // legs + talons
    rig.legs = [];
    [-1, 1].forEach((sgn) => {
      const hip = new T.Group();
      const hp = axis(-0.45);
      hip.position.set(sgn * 0.2, hp.y - 0.25, hp.z + 0.12);
      const shin = new T.Mesh(new T.CylinderGeometry(0.045, 0.05, 0.4, 5), M.dark);
      shin.position.y = -0.2;
      hip.add(shin);
      for (let t = -1; t <= 1; t++) {
        const toe = new T.Mesh(new T.ConeGeometry(0.035, 0.24, 4), M.silver);
        toe.position.set(t * 0.07, -0.4, 0.1);
        toe.rotation.set(Math.PI / 2 + 0.25, 0, t * 0.35);
        hip.add(toe);
      }
      bodyPivot.add(hip);
      rig.legs.push(hip);
    });

    rig.body = bodyPivot;
    rig.allMats = Object.values(M);
    return { root, rig };
  }

  /* ---------------- choreography (seconds) ----------------
     x,y,z offsets in raven-heights from the rest spot; yaw 90 = facing right like the logo */
  const SHOW = [
    { t: 0.0, op: 0, yaw: 90 },
    { t: 0.7, op: 1, yaw: 90 },
    { t: 2.2, hYaw: -35, hPitch: -5 },                               // notices you
    { t: 5.2, yaw: 0, hYaw: 0, z: 1.1, y: 0.1, s: 1.32, wing: 0 }, // slow turn to face front, steps out of shield
    { t: 6.0, hPitch: -8, wing: 0.95 },                              // spreads its wings
    { t: 6.6, beak: 1, hPitch: -13, screech: 1 },                    // CAW
    { t: 7.3, beak: 0.15, hPitch: -6 },
    { t: 7.7, beak: 1, hPitch: -12, screech: 1 },                    // CAW
    { t: 8.4, beak: 0, hPitch: 0 },
    { t: 9.2, wing: 0 },
    { t: 11.0, yaw: -82, hYaw: -18 },                                // whole body to extreme left
    { t: 12.0, hYaw: -18, hRoll: 12 },                               // curious head tilt
    { t: 14.2, yaw: 0, hYaw: 0, hRoll: 0 },                          // straight
    { t: 15.0, beak: 0.5 },
    { t: 15.4, beak: 0 },
    { t: 17.4, yaw: 82, hYaw: 16 },                                  // extreme right
    { t: 18.4, hRoll: -10 },
    { t: 19.2, y: -0.12, pitch: 16, wing: 0.7, hRoll: 0, hYaw: 0 },  // crouch, wings open
    { t: 19.9, y: 0.7, z: 1.4, pitch: -18, wing: 1, flap: 1, yaw: 55 }, // take off
    { t: 22.4, x: 7.5, y: 4.8, z: -2, s: 0.55, pitch: -12, flap: 1, yaw: 70 }, // fly away
    { t: 22.9, op: 0 },
    { t: 24.2, op: 0, x: -8, y: 4.2, z: -2, s: 0.6, yaw: 105, wing: 1, flap: 1, pitch: -8, step: true }, // circle back
    { t: 24.6, op: 1 },
    { t: 27.2, x: -0.4, y: 0.55, z: 0.7, s: 1.05, yaw: 95, pitch: -6, flap: 1 },
    { t: 28.2, x: 0, y: 0, z: 0, s: 1, wing: 0.45, flap: 0.35, pitch: 8 },   // landing
    { t: 29.0, wing: 0, flap: 0, pitch: 0, yaw: 90, hYaw: 0 },
    { t: 29.8, op: 1 },
    { t: 30.4, op: 0 },
  ];
  const KEYS = { x: 0, y: 0, z: 0, s: 1, yaw: 90, pitch: 0, roll: 0, hYaw: 0, hPitch: 0, hRoll: 0, beak: 0, wing: 0, flap: 0, op: 0 };
  // expand keyframes so every key has a value at every frame
  const TRACK = (() => {
    const out = [];
    const state = Object.assign({}, KEYS);
    for (const k of SHOW) { Object.assign(state, k); out.push(Object.assign({}, state)); }
    return out;
  })();
  const DURATION = TRACK[TRACK.length - 1].t;

  function sample(time) {
    let i = 0;
    while (i < TRACK.length - 1 && TRACK[i + 1].t <= time) i++;
    const a = TRACK[i], b = TRACK[Math.min(i + 1, TRACK.length - 1)];
    if (a === b || b.step) return Object.assign({}, a, { screech: a.t === time ? a.screech : 0 });
    const u = ease(Math.min(1, Math.max(0, (time - a.t) / (b.t - a.t))));
    const o = {};
    for (const k in KEYS) o[k] = lerp(a[k], b[k], u);
    return o;
  }

  /* ---------------- stage ---------------- */
  RS.Raven3D = function (host, logoCtl) {
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); }
    catch (e) { return null; }
    const canvas = renderer.domElement;
    canvas.className = "raven3d";
    host.appendChild(canvas);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 14);
    scene.add(new T.HemisphereLight(0xa78bfa, 0x0b0820, 0.55));
    const key = new T.DirectionalLight(0xffffff, 1.0); key.position.set(-3, 5, 8); scene.add(key);
    const rimC = new T.PointLight(0x22d3ee, 3.2, 30); rimC.position.set(5, 2, -3); scene.add(rimC);
    const rimP = new T.PointLight(0xec4899, 2.4, 30); rimP.position.set(-5, 1, -2); scene.add(rimP);
    const fill = new T.DirectionalLight(0xa5b4fc, 0.6); fill.position.set(4, -2, 6); scene.add(fill);

    const M = mats();
    const { root, rig } = buildRaven(M);
    const holder = new T.Group();
    holder.add(root);
    scene.add(holder);
    root.position.y = -0.15;

    const logoEl = logoCtl.el;
    const rest = { x: 0, y: 0, scale: 1 };
    let unitPerPx = 0.01;

    function layout() {
      const hr = host.getBoundingClientRect();
      const W = Math.max(1, hr.width), H = Math.max(1, hr.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      const visH = 2 * camera.position.z * Math.tan((camera.fov * D) / 2);
      unitPerPx = visH / H;
      const lr = logoEl.getBoundingClientRect();
      const cx = lr.left - hr.left + lr.width * 0.57, cy = lr.top - hr.top + lr.height * 0.6;
      rest.x = (cx - W / 2) * unitPerPx;
      rest.y = -(cy - H / 2) * unitPerPx;
      rest.scale = (lr.height * 0.27) * unitPerPx;   // raven-height in world units
    }
    layout();
    window.addEventListener("resize", layout);

    let playing = false, t0 = 0, raf = 0, lastScreech = -1, nextBlink = 0, snap = { y: 0, p: 0, at: 0 };
    const screechEl = document.createElement("div");
    screechEl.className = "raven3d-screech";
    screechEl.innerHTML = "<i></i><i></i><i></i><i></i>";
    host.appendChild(screechEl);
    const beakTip = new T.Vector3();

    function setOpacity(v) {
      for (const m of rig.allMats) m.opacity = v;
      rig.eyes.forEach((e) => (e.userData.glow.material.opacity = v));
      canvas.style.opacity = v > 0.001 ? 1 : 0;
    }

    function apply(p, time) {
      const S = rest.scale * p.s;
      holder.position.set(rest.x + p.x * rest.scale, rest.y + p.y * rest.scale, p.z * rest.scale);
      holder.scale.setScalar(S);
      root.rotation.set(p.pitch * D, p.yaw * D, p.roll * D);
      // bird-like micro head snaps while holding a pose
      if (time > snap.at) { snap = { y: (Math.random() - 0.5) * 14, p: (Math.random() - 0.5) * 8, at: time + 0.35 + Math.random() * 0.9 }; }
      rig.neck.rotation.set((p.hPitch + snap.p * (1 - p.flap)) * D, (p.hYaw + snap.y * (1 - p.flap)) * D, p.hRoll * D);
      // beak open / close (upper lifts a little, lower drops)
      rig.lower.rotation.x = p.beak * 0.62;
      rig.upper.rotation.x = -p.beak * 0.16;
      // wings: fold <-> spread, with flapping
      const flap = p.flap * Math.sin(time * 11) * 0.85;
      rig.wings.forEach((w) => {
        w.shoulder.rotation.set(lerp(0.62, -1.25, p.wing), 0, w.side * (lerp(-1.5, 0.32, p.wing) + flap));
        w.shoulder.scale.set(w.side * lerp(0.78, 1, p.wing), lerp(0.78, 1, p.wing), lerp(0.78, 1, p.wing));
        w.plane.rotation.set(0, 0, 0);
        w.feathers.forEach(({ pivot, k }) => { pivot.rotation.y = -lerp(1.25 + k * 0.22, 0.05 + k * 1.4, p.wing); });
      });
      // breathing, flight bob, legs tuck
      const breathe = 1 + Math.sin(time * 2.4) * 0.015;
      rig.body.scale.set(1, breathe, 1);
      holder.position.y += (p.flap > 0.2 ? Math.sin(time * 11 + 1.6) * 0.06 * rest.scale * p.flap : 0);
      rig.legs.forEach((l) => (l.rotation.x = p.flap * 1.1));
      rig.tail.rotation.x = lerp(0, -0.45, p.flap) + Math.sin(time * 1.7) * 0.04;
      // eyes: blink + flare on screech
      if (time > nextBlink) nextBlink = time + 2.2 + Math.random() * 3;
      const bl = nextBlink - time < 0.12 ? 0.12 : 1;
      rig.eyes.forEach((e) => { e.scale.set(1, bl, 1); e.userData.glow.scale.setScalar(0.32 + p.beak * 0.4); });
      setOpacity(p.op);
      // DOM screech waves from the beak tip
      if (p.beak > 0.8 && time - lastScreech > 0.9) {
        lastScreech = time;
        rig.upper.children[0].getWorldPosition(beakTip);
        beakTip.project(camera);
        const hr = host.getBoundingClientRect();
        screechEl.style.left = ((beakTip.x + 1) / 2) * hr.width + "px";
        screechEl.style.top = ((1 - beakTip.y) / 2) * hr.height + "px";
        screechEl.classList.remove("on"); void screechEl.offsetWidth; screechEl.classList.add("on");
        logoEl.classList.remove("shield-pulse"); void logoEl.offsetWidth; logoEl.classList.add("shield-pulse");
      }
    }

    function frame(now) {
      const time = (now - t0) / 1000;
      if (time >= DURATION) { stop(); return; }
      apply(sample(time), time);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    function play() {
      if (playing) return;
      playing = true;
      layout();
      logoCtl.el.classList.add("raven-out");
      host.classList.add("raven-show");
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      cancelAnimationFrame(raf);
      playing = false;
      setOpacity(0);
      renderer.render(scene, camera);
      logoCtl.el.classList.remove("raven-out");
      host.classList.remove("raven-show");
    }
    setOpacity(0);
    return { play, stop, seek(sec) { if (!playing) play(); t0 = performance.now() - sec * 1000; }, pose(p, time = 1) { cancelAnimationFrame(raf); playing = false; layout(); logoCtl.el.classList.add("raven-out"); apply(Object.assign({}, KEYS, { op: 1 }, p), time); renderer.render(scene, camera); }, _dbg() { return { t: (performance.now() - t0) / 1000, playing, yaw: root.rotation.y, s: holder.scale.x, pos: holder.position.toArray(), rest }; }, get playing() { return playing; }, duration: DURATION };
  };
})();
