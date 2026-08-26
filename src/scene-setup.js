"use strict";
/* ================= THREE scene ================= */
const T = window.THREE;
const stageA = $("#stageA");
const canvas3d = $("#robot3d");
let ok3d = true, renderer, scene, camera;
try {
  renderer = new T.WebGLRenderer({canvas: canvas3d, alpha: true, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
} catch(e){ ok3d = false; }

scene = new T.Scene();
scene.fog = new T.FogExp2(0x0d2b40, 0.02);
camera = new T.PerspectiveCamera(38, 1, 0.1, 120);

const hemi = new T.HemisphereLight(0xa8d8ee, 0x0a1626, 0.45);
scene.add(hemi);
const key = new T.DirectionalLight(0xd8ecf8, 1.25);
key.position.set(3.5, 9, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -6; key.shadow.camera.right = 6;
key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
key.shadow.camera.far = 30;
key.shadow.bias = -0.0008;
scene.add(key);
const fill = new T.DirectionalLight(0x4d7fb5, 0.4);
fill.position.set(-6, 2.5, -4);
scene.add(fill);
const rim = new T.PointLight(0x6fd6f2, 0.85, 45, 1.4);
rim.position.set(0, -5, 7);
scene.add(rim);

/* --- structured underwater environment: gives metals real reflections --- */
(function makeEnv(){
  const W = 512, H = 256;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  // base water column gradient
  const gr = g.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,"#aadcf2"); gr.addColorStop(.42,"#2a6f96"); gr.addColorStop(1,"#03101c");
  g.fillStyle = gr; g.fillRect(0,0,W,H);
  // sun disc refracted through the surface — the main specular hotspot
  const sun = g.createRadialGradient(W*.68, H*.10, 4, W*.68, H*.10, H*.42);
  sun.addColorStop(0,"rgba(255,252,238,.95)");
  sun.addColorStop(.18,"rgba(214,242,252,.55)");
  sun.addColorStop(1,"rgba(214,242,252,0)");
  g.fillStyle = sun; g.fillRect(0,0,W,H);
  // cool counter-glow opposite the sun, for rim interest on the dark side
  const cg = g.createRadialGradient(W*.16, H*.30, 6, W*.16, H*.30, H*.5);
  cg.addColorStop(0,"rgba(111,214,242,.30)"); cg.addColorStop(1,"rgba(111,214,242,0)");
  g.fillStyle = cg; g.fillRect(0,0,W,H);
  // god-ray streaks fanning down from the surface
  let seed = 77;
  const rnd = () => (seed = seed*48271 % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++){
    const x = rnd()*W, w = 3 + rnd()*14, a = .04 + rnd()*.10, len = H*(.3 + rnd()*.35);
    const ray = g.createLinearGradient(0,0,0,len);
    ray.addColorStop(0,`rgba(196,232,246,${a})`); ray.addColorStop(1,"rgba(196,232,246,0)");
    g.fillStyle = ray; g.fillRect(x-w/2, 0, w, len);
  }
  // caustic mottling near the surface band
  for (let i = 0; i < 70; i++){
    const x = rnd()*W, y = rnd()*H*.22, r = 4 + rnd()*16;
    const sp = g.createRadialGradient(x,y,0,x,y,r);
    sp.addColorStop(0,`rgba(226,246,252,${.05 + rnd()*.10})`); sp.addColorStop(1,"rgba(226,246,252,0)");
    g.fillStyle = sp; g.fillRect(x-r,y-r,r*2,r*2);
  }
  const tex = new T.CanvasTexture(c);
  tex.mapping = T.EquirectangularReflectionMapping;
  tex.encoding = T.sRGBEncoding;   // canvas colors are sRGB; without this the PMREM pass reads them ~2x bright
  scene.environment = tex;
})();

