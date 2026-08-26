"use strict";
/* ================= sea bottom: Q&A boulders ================= */
const stageC = $("#stageC"), seaCanvas = $("#seabed3d");
let renderer2 = null, seaScene = null, camC = null, seaOK = false;
let seaBeacon = null, seaLens = null, seaGlow = null;
const SWAY = [];
(function buildSeabed(){
  if (!ok3d || !seaCanvas) return;
  try {
    renderer2 = new T.WebGLRenderer({canvas: seaCanvas, alpha: true, antialias: true});
    renderer2.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer2.outputEncoding = T.sRGBEncoding;
    renderer2.toneMapping = T.ACESFilmicToneMapping;
    renderer2.toneMappingExposure = 1.02;
  } catch(e){ return; }
  seaOK = true;
  seaScene = new T.Scene();
  seaScene.fog = new T.FogExp2(0x04121e, 0.05);
  seaScene.environment = scene.environment;
  camC = new T.PerspectiveCamera(42, 1, .1, 140);
  seaScene.add(new T.HemisphereLight(0x6fa9c9, 0x050d16, .36));
  const moon = new T.DirectionalLight(0x9fcbe4, .42);
  moon.position.set(-6, 14, 8); seaScene.add(moon);
  const shaft = new T.SpotLight(0x8fd0ec, .5, 70, Math.PI/7, .6, 1.3);
  shaft.position.set(4, 26, 8); shaft.target.position.set(0, 0, 0);
  seaScene.add(shaft, shaft.target);
  seaScene.fog.density = .055;

  let seed = 4242;
  const rnd = () => (seed = seed*48271 % 2147483647) / 2147483647;

  // sandy floor with gentle dunes
  const floorG = new T.CircleGeometry(70, 56);
  floorG.rotateX(-Math.PI/2);
  {
    const pos = floorG.attributes.position;
    for (let i = 0; i < pos.count; i++){
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, Math.sin(x*.35)*Math.cos(z*.3)*.2 + Math.sin(x*.07 + z*.11)*.38 - .05);
    }
    floorG.computeVertexNormals();
  }
  seaScene.add(new T.Mesh(floorG, new T.MeshStandardMaterial({color:0x35342a, roughness:.97, metalness:0, envMapIntensity:.1})));

  // boulder geometry variants: displaced icosahedra, mossy toward the top (vertex colors)
  const rockGeos = [];
  const cRock = new T.Color(0x66707c), cMoss = new T.Color(0x3f7a4e), cTmp = new T.Color();
  for (let v = 0; v < 5; v++){
    const g = new T.IcosahedronGeometry(1, 1);
    const pos = g.attributes.position, col = new Float32Array(pos.count*3);
    for (let i = 0; i < pos.count; i++){
      const s = .78 + rnd()*.5;
      pos.setXYZ(i, pos.getX(i)*s, pos.getY(i)*(s*.82), pos.getZ(i)*s);
    }
    g.computeVertexNormals();
    for (let i = 0; i < pos.count; i++){
      const up = clamp(pos.getY(i)*1.2 + .1, 0, 1) * (.5 + rnd()*.5);
      cTmp.copy(cRock).lerp(cMoss, up);
      col[i*3] = cTmp.r; col[i*3+1] = cTmp.g; col[i*3+2] = cTmp.b;
    }
    g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    rockGeos.push(g);
  }
  const matRock = new T.MeshStandardMaterial({vertexColors:true, roughness:.92, metalness:.04, envMapIntensity:.25});
  const matKelp = new T.MeshStandardMaterial({color:0x2a6b42, roughness:.78, metalness:0, envMapIntensity:.2});

  function boulder(x, y, z, r){
    const m = new T.Mesh(rockGeos[(rnd()*rockGeos.length)|0], matRock);
    m.position.set(x + (rnd()-.5)*.22, y, z + (rnd()-.5)*.5);
    m.scale.setScalar(r*(.85 + rnd()*.4));
    m.rotation.set(rnd()*6.3, rnd()*6.3, rnd()*6.3);
    seaScene.add(m);
    if (rnd() < .42){                     // kelp blades sprouting from this boulder
      const n = 1 + (rnd()*3|0);
      for (let k = 0; k < n; k++){
        const h = .7 + rnd()*1.1;
        const blade = new T.Mesh(new T.ConeGeometry(.055 + rnd()*.05, h, 5), matKelp);
        blade.position.set(m.position.x + (rnd()-.5)*.5, y + r*.5 + h/2 - .1, m.position.z + (rnd()-.5)*.4);
        const tx = (rnd()-.5)*.5, tz = (rnd()-.5)*.5;
        blade.rotation.set(tx, 0, tz);
        blade.userData = {tx, tz, ph: rnd()*6.3};
        SWAY.push(blade);
        seaScene.add(blade);
      }
    }
  }
  // lay touching boulders along a polyline stroke
  function stroke(pts, ox, r){
    for (let i = 0; i < pts.length-1; i++){
      const [x1,y1] = pts[i], [x2,y2] = pts[i+1];
      const n = Math.max(1, Math.round(Math.hypot(x2-x1, y2-y1)/(r*1.5)));
      for (let k = 0; k <= n; k++){
        const t = k/n;
        boulder(ox + x1 + (x2-x1)*t, Math.max(r*.55, y1 + (y2-y1)*t), 0, r);
      }
    }
  }
  const R = .52;
  const circle = (cx, cy, cr, n) => Array.from({length:n+1}, (_,i) => {
    const a = Math.PI*2*i/n; return [cx + Math.cos(a)*cr, cy + Math.sin(a)*cr];
  });
  // Q
  stroke(circle(0, 2.1, 1.55, 14), -5.4, R);
  stroke([[.65,1.15],[1.75,.2]], -5.4, R);
  // & — stylized: small top loop, larger bottom loop, diagonal leg
  stroke(circle(.05, 3.05, .8, 8), 0, R);
  stroke(circle(-.15, 1.15, 1.1, 10), 0, R);
  stroke([[.55,2.5],[1.7,.35]], 0, R);
  // A
  stroke([[-1.35,.2],[0,3.9]], 5.4, R);
  stroke([[1.35,.2],[0,3.9]], 5.4, R);
  stroke([[-.62,1.45],[.62,1.45]], 5.4, R);

  // scattered pebbles for depth
  for (let i = 0; i < 42; i++){
    const a = rnd()*6.3, d = 6 + rnd()*26;
    const m = new T.Mesh(rockGeos[(rnd()*rockGeos.length)|0], matRock);
    m.position.set(Math.cos(a)*d, .08 + rnd()*.15, Math.sin(a)*d - 2);
    m.scale.setScalar(.12 + rnd()*.3);
    m.rotation.set(rnd()*6.3, rnd()*6.3, rnd()*6.3);
    seaScene.add(m);
  }

  // DIVA's survey beacon: nose spotlight + glowing lens, flashed in seabedFrame
  seaBeacon = new T.SpotLight(0xcfeaff, 0, 40, Math.PI/6.5, .5, 1.1);
  seaBeacon.position.set(0, .1, -2.1);
  seaBeacon.target.position.set(0, -2.6, -9);
  seaGlow = new T.PointLight(0xbfe6ff, 0, 8, 1.4);
  seaGlow.position.set(0, .1, -2.4);
  seaLens = new T.Mesh(new T.SphereGeometry(.07, 10, 8),
    new T.MeshStandardMaterial({color:0xbfe6ff, emissive:0x9fdcff, emissiveIntensity:0, transparent:true}));
  seaLens.position.set(0, .05, -2.32);
  seaLens.visible = false;
  robot.add(seaBeacon, seaBeacon.target, seaGlow, seaLens);
})();
function sizeRenderer2(){
  if (!seaOK) return;
  const w = stageC.clientWidth, h = stageC.clientHeight;
  if (!w || !h) return;
  if (seaCanvas.width !== Math.round(w*renderer2.getPixelRatio())){
    renderer2.setSize(w, h, false);
    camC.aspect = w/h;
    camC.updateProjectionMatrix();
  }
}
addEventListener("resize", sizeRenderer2);

/* dive-in bubbles: a trail that streams up around the hull as DIVA plunges */
const BUBN = 54;
const bubGeo = new T.BufferGeometry();
bubGeo.setAttribute("position", new T.BufferAttribute(new Float32Array(BUBN*3), 3));
const bubArr = bubGeo.attributes.position.array;
const bubVel = new Float32Array(BUBN), bubPh = new Float32Array(BUBN);
function seedBubble(i, yBase){
  bubArr[i*3]   = (Math.random()*2 - 1)*3.4;
  bubArr[i*3+1] = yBase + Math.random()*1.6 - .6;
  bubArr[i*3+2] = (Math.random()*2 - 1)*2.0;
  bubVel[i] = .015 + Math.random()*.03;
  bubPh[i] = Math.random()*6.3;
}
const bubMat = new T.PointsMaterial({color:0xd6f2fc, size:.12, transparent:true, opacity:0, depthWrite:false});
const bubTrail = new T.Points(bubGeo, bubMat);
bubTrail.visible = false;
bubTrail.frustumCulled = false;
scene.add(bubTrail);
let bubActive = false;



