"use strict";
/* ================= robot ================= */
const robot = new T.Group();
scene.add(robot);
const parts = {};      // key -> {g:Group, mats:[...], base:{p,r}, exp:{p,r}, win:[a,b], spinFade:bool}
const ANCH = {};       // label anchors: key -> {obj, local}

function addPart(key, group, win, expPos, expRot, opts){
  robot.add(group);
  const mats = [];
  group.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; mats.push(o.material); }});
  parts[key] = {
    g: group, mats,
    base: {p: group.position.clone(), r: group.rotation.clone()},
    exp: {p: expPos || new T.Vector3(), r: expRot || new T.Vector3()},
    win: win || [0,1],
    spinFade: !!(opts && opts.spinFade)
  };
}
const box = (w,h,d,m) => new T.Mesh(new T.BoxGeometry(w,h,d), m);
const cyl = (r1,r2,h,m,seg) => new T.Mesh(new T.CylinderGeometry(r1,r2,h,seg||20), m);


function textPlane(txt, w, h, fg, bg, fontPx){
  const c = document.createElement("canvas"); c.width = 256; c.height = Math.round(256*h/w);
  const g = c.getContext("2d");
  if (bg){ g.fillStyle = bg; g.fillRect(0,0,c.width,c.height); }
  g.fillStyle = fg; g.font = `600 ${fontPx||64}px 'IBM Plex Mono', monospace`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(txt, c.width/2, c.height/2);
  const tex = new T.CanvasTexture(c);
  const m = new T.MeshBasicMaterial({map: tex, transparent: true});
  return new T.Mesh(new T.PlaneGeometry(w, h), m);
}

/* --- dorsal canopy: flat manta shell, acrylic nose, googly eyes --- */
const dorsalG = new T.Group();
{
  const shellGeoD = mantaShell(.62, t => Math.pow(Math.min(1, t/.28), .5), mantaW);
  flattenBow(shellGeoD);
  cutWindow(shellGeoD);
  const shell = new T.Mesh(shellGeoD, matHull());
  dorsalG.add(shell);

  // bow window: open tunnel into the hull — you see the actual interior
  const mCav = () => M(0x10152a,.85,0,{side:T.DoubleSide});
  const bay = new T.Mesh(new T.CylinderGeometry(.38,.4,.2,30,1,true), mCav());
  bay.rotation.x = Math.PI/2;
  bay.scale.set(1.25,1,.65);
  bay.position.set(0,.14,-2.16);
  dorsalG.add(bay);
  // flat hull-colored surround, flush on the face — masks the cut edge
  const rimCover = new T.Mesh(new T.RingGeometry(.8, 1.2, 56), matHull());
  rimCover.scale.set(.45,.2,1);
  rimCover.position.set(0,.14,-2.257);
  rimCover.rotation.y = Math.PI;
  dorsalG.add(rimCover);
  // camera: its lens lives inside the glass blister, in front of the hull wall
  const camBody = box(.3,.22,.2, matDark()); camBody.position.set(0,.12,-1.94);
  const camMount = box(.34,.03,.24, matDark()); camMount.position.set(0,-.01,-1.93);
  const barrelR = cyl(.15,.15,.07, matMetal()); barrelR.rotation.x = Math.PI/2; barrelR.position.set(0,.14,-2.06);
  const barrelF = cyl(.12,.12,.13, matDark()); barrelF.rotation.x = Math.PI/2; barrelF.position.set(0,.14,-2.14);
  const ridge1 = new T.Mesh(new T.TorusGeometry(.122,.009,8,26), matMetal());
  ridge1.position.set(0,.14,-2.11);
  const ridge2 = ridge1.clone(); ridge2.position.z = -2.17;
  const optic = cyl(.1,.1,.02, M(0x2a4a8a,.05,.3,{envMapIntensity:2, emissive:0x1c3f6e, emissiveIntensity:1}));
  optic.rotation.x = Math.PI/2; optic.position.set(0,.14,-2.21);
  const iris = cyl(.052,.052,.016, M(0x69b4e8,.1,.2,{emissive:0x49a0e0, emissiveIntensity:2}));
  iris.rotation.x = Math.PI/2; iris.position.set(0,.14,-2.218);
  const spec = new T.Mesh(new T.SphereGeometry(.016,8,6), new T.MeshBasicMaterial({color:0xffffff, transparent:true}));
  spec.position.set(-.033,.175,-2.222);
  const led = new T.Mesh(new T.SphereGeometry(.018,8,6), new T.MeshStandardMaterial({color:0x7fe0b0, emissive:0x4fe090, emissiveIntensity:3, transparent:true}));
  led.position.set(.15,.26,-1.98);
  dorsalG.add(camBody, camMount, barrelR, barrelF, ridge1, ridge2, optic, iris, spec, led);
  dorsalG.userData.strobe = led;   // nav light pulses via the strobe driver in the main loop
  // downward survey camera under the chin
  const camDown = cyl(.05,.06,.09, matMetal()); camDown.position.set(0,-.34,-1.8);
  const lensDg = cyl(.04,.04,.02, matGlassD()); lensDg.position.set(0,-.39,-1.8);
  dorsalG.add(camDown, lensDg);
  // the glass: a shallow clear blister over the bay — nothing else
  const matAcr = M(0xeaf7ff, .06, .05, {opacity:.12, envMapIntensity:2.2, depthWrite:false, side:T.DoubleSide});
  const pane = new T.Mesh(new T.CircleGeometry(.44, 30), matAcr);
  pane.scale.set(1.24,.58,1);
  pane.position.set(0,.14,-2.235);
  pane.rotation.y = Math.PI;
  pane.renderOrder = 10;
  pane.castShadow = false;
  dorsalG.add(pane);
  const glint1 = new T.Mesh(new T.CircleGeometry(.09, 12),
    new T.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:.28, depthWrite:false}));
  glint1.scale.set(1.8,.55,1);
  glint1.position.set(-.16,.25,-2.24);
  glint1.rotation.set(0, Math.PI, 0);
  glint1.renderOrder = 11;
  dorsalG.add(glint1);
  const camLight = new T.PointLight(0xaadcf2, 2.2, 2.2, 1.3);
  camLight.position.set(0,.34,-2.08);
  dorsalG.add(camLight);
  const camLight2 = new T.PointLight(0x8fd4ee, 1.0, 1.8, 1.4);
  camLight2.position.set(0,0,-2.2);
  dorsalG.add(camLight2);
  // interior fill so the inside of the hull reads through the window
  const innerLight = new T.PointLight(0x9fc8e8, 1.4, 3.0, 1.5);
  innerLight.position.set(0,.1,-1.5);
  dorsalG.add(innerLight);
  // googly-eye stickers, seated on the actual shell surface via raycast
  const rayC = new T.Raycaster();
  dorsalG.updateMatrixWorld(true);
  for (const sgn of [-1,1]){
    const from = new T.Vector3(sgn*2.2, 1.1, -3.3);
    const to = new T.Vector3(sgn*.4, .0, -1.5);
    rayC.set(from, to.clone().sub(from).normalize());
    const hit = rayC.intersectObject(shell)[0];
    const p = hit ? hit.point.clone() : new T.Vector3(sgn*.86,.22,-2.05);
    const n = hit ? hit.face.normal.clone().normalize() : new T.Vector3(sgn*.55,.45,-.7).normalize();
    const eg = new T.Group();
    eg.position.copy(p).addScaledVector(n, .008);
    eg.lookAt(p.clone().add(n));
    const whiteC = new T.Mesh(new T.CircleGeometry(.15, 24), M(0xf5f8fb,.35,0,{side:T.DoubleSide}));
    whiteC.position.z = .002;
    const ring = new T.Mesh(new T.TorusGeometry(.145,.016,10,28), matBlack());
    ring.position.z = .006;
    const pivot = new T.Group();
    const pupil = new T.Mesh(new T.CircleGeometry(.07, 18), M(0x0b0c16,.3,.1,{side:T.DoubleSide}));
    pupil.position.z = .012;
    pivot.add(pupil);
    eg.add(whiteC, ring, pivot);
    dorsalG.add(eg);
    if (sgn < 0){ ANCH.eyeL = {obj: dorsalG, local: p.clone().addScaledVector(n, .15)}; }
    (sgn<0 ? (dorsalG.userData.pupilL = pivot) : (dorsalG.userData.pupilR = pivot));
  }


}
addPart("dorsal", dorsalG, [0.04,0.5], new T.Vector3(0,2.6,0), new T.Vector3(0,0,.06));
ANCH.dorsal = {obj: dorsalG, local: new T.Vector3(0,.4,.2)};
ANCH.cams = {obj: dorsalG, local: new T.Vector3(0,.14,-2.24)};



/* --- fins: silicone skins that bend at the tips --- */
const finLG = new T.Group(), finRG = new T.Group();
function makeFin(shape){
  const geo = extrudeFlat(shape, .05, .07, .06, 4);
  const pos = geo.attributes.position;
  let minY = 1e9, maxY = -1e9;
  for (let i=0;i<pos.count;i++){ const y = pos.getY(i); if (y<minY) minY=y; if (y>maxY) maxY=y; }
  const midY = (minY+maxY)/2;
  const colTop = new T.Color(0x101a40), colBot = new T.Color(0xdde6f0);
  const cols = new Float32Array(pos.count*3);
  for (let i=0;i<pos.count;i++){
    const x = pos.getX(i), y = pos.getY(i);
    const d = Math.max(0, Math.abs(x) - .92);
    pos.setY(i, y + .08*d);             // linear dihedral — matches the rod hinge angle
    const c = y > midY ? colTop : colBot;
    cols[i*3]=c.r; cols[i*3+1]=c.g; cols[i*3+2]=c.b;
  }
  geo.userData.base = geo.attributes.position.array.slice();
  geo.setAttribute("color", new T.Float32BufferAttribute(cols,3));
  geo.computeVertexNormals();
  // cast silicone: dead-matte rubber with a soft velvety sheen, faintly translucent
  return new T.Mesh(geo, P(0xffffff,.82,0,{vertexColors:true, side:T.DoubleSide, opacity:.94, envMapIntensity:.14,
    sheen:.5, sheenColor:0xcfe0ee, sheenRoughness:.78}));
}
const finLMesh = makeFin(wingShapeL), finRMesh = makeFin(wingShapeR);
finLG.add(finLMesh); finRG.add(finRMesh);
finLG.position.y = .1; finRG.position.y = .1;
addPart("finL", finLG, [0.34,0.46], new T.Vector3(-1.6,1.5,0), new T.Vector3());
addPart("finR", finRG, [0.34,0.46], new T.Vector3(1.6,1.5,0), new T.Vector3());
ANCH.finL = {obj: finLG, local: new T.Vector3(-2.6,.05,0)};
ANCH.finR = {obj: finRG, local: new T.Vector3(2.6,.05,0)};

/* --- frame: three spars per wing, one servo per spar --- */
const frameG = new T.Group();
const RODS = [];
{
  const rodDefs = [[-.6,14,0],[0,2,.7],[.55,-10,1.4]];   // [chord z, sweep deg, wave phase]
  for (const sgn of [-1,1]){
    for (const [z,ang,ph] of rodDefs){
      const sv = new T.Group();
      const bodyB = box(.3,.2,.24, matGreen());
      const cap = box(.3,.05,.24, M(0x4a8534,.4,.1)); cap.position.y = .12;
      const flange = box(.46,.04,.1, matGreen()); flange.position.y = -.07;
      const wiretail = box(.16,.02,.02, M(0xc0392b,.5,.1)); wiretail.position.set(-sgn*.22,0,.06);
      sv.add(bodyB, cap, flange, wiretail);
      sv.position.set(sgn*.72, .13, z);
      frameG.add(sv);
      const pivot = new T.Group();
      pivot.position.set(sgn*.92, .16, z);
      const horn = cyl(.065,.065,.05, matWhite()); horn.rotation.x = Math.PI/2;
      const clampB = box(.14,.06,.09, matDark()); clampB.position.x = sgn*.09;
      const rod = cyl(.028,.028,1.9, matYellow());
      rod.rotation.z = Math.PI/2;
      rod.position.x = sgn*1.02;
      const tip = new T.Mesh(new T.SphereGeometry(.045,10,8), matYellow());
      tip.position.x = sgn*1.92;
      pivot.add(horn, clampB, rod, tip);
      pivot.rotation.y = sgn > 0 ? -ang*Math.PI/180 : ang*Math.PI/180;
      frameG.add(pivot);
      RODS.push({pivot, sgn, ph});
    }
  }
  const cross = box(1.4,.07,.28, matPink()); cross.position.set(0,.04,1.0);
  frameG.add(cross);
  frameG.position.y = -.08;
  ANCH.sparL2 = {obj: frameG, local: new T.Vector3(-2.0,.24,0)};
  ANCH.sparR2 = {obj: frameG, local: new T.Vector3(2.0,.24,0)};
  ANCH.servoL1 = {obj: frameG, local: new T.Vector3(-.72,.28,-.6)};
}
addPart("frame", frameG, [0.52,0.76], new T.Vector3(0,.6,0), new T.Vector3());

/* --- electronics tray --- */
const trayG = new T.Group();
{
  const tray = box(1.5,.14,1.9, matPink());
  const cavity = box(1.34,.06,1.74, M(0x5c2138,.6,0)); cavity.position.y = .06;
  trayG.add(tray, cavity);
  for (const [x,z] of [[-.68,-.88],[.68,-.88],[-.68,.88],[.68,.88]]){
    const st = cyl(.05,.05,.1, matMetal()); st.position.set(x,.1,z); trayG.add(st);
  }
  // Jetson (orange board + heatsink)
  const jet = new T.Group();
  const pcb = box(.78,.05,.82, matOrange()); pcb.position.z = -.07;
  const hsB = box(.5,.05,.5, matMetal()); hsB.position.y = .06;
  for (let i=0;i<7;i++){
    const fin = box(.5,.1,.02, matMetal());
    fin.position.set(0,.13,-.21+i*.07);
    jet.add(fin);
  }
  for (let i=0;i<3;i++){
    const port = box(.1,.08,.1, matMetal());
    port.position.set(.34, .06, -.36+i*.14);
    jet.add(port);
  }
  jet.add(pcb, hsB);
  jet.position.set(-.28,.12,-.2);
  trayG.add(jet);
  const jl = textPlane("JETSON · QNX", .6, .12, "#ffe3c4", null, 42);
  jl.rotation.x = -Math.PI/2; jl.rotation.z = Math.PI;
  jl.position.set(0, .027, .2); jet.add(jl);
  // Nano Every (green)
  const nano = box(.32,.05,.5, matGreen()); nano.position.set(.44,.12,-.5);
  const chip = box(.14,.04,.14, matBlack()); chip.position.set(.44,.16,-.5);
  trayG.add(nano, chip);
  // IMU
  const imu = box(.3,.05,.24, matPurple()); imu.position.set(-.44,.12,.3);
  const ichip = box(.1,.04,.08, matBlack()); ichip.position.set(-.44,.16,.3);
  trayG.add(imu, ichip);
  // buck
  const buck = box(.28,.06,.2, matBlue()); buck.position.set(0,.12,.3);
  trayG.add(buck);
  // Bar30
  const bar = cyl(.14,.14,.1, matMetal()); bar.position.set(.44,.14,.3);
  const barc = cyl(.06,.06,.04, matWhite()); barc.position.set(.44,.21,.3);
  trayG.add(bar, barc);
  // LiPo
  const lipo = box(1.1,.2,.34, matBlue()); lipo.position.set(0,.18,.68);
  const label = textPlane("4S 14.8V 5000mAh", .8, .14, "#12305A", "#EAF4FB", 34);
  label.rotation.x = -Math.PI/2; label.rotation.z = Math.PI;
  label.position.set(0,.29,.68);
  const xt = box(.1,.08,.1, matYellow()); xt.position.set(.58,.2,.68);
  trayG.add(lipo, label, xt);
  // wires
  const wire = (pts, color, r) => {
    const curve = new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));
    return new T.Mesh(new T.TubeGeometry(curve, 20, r||.015, 6), M(color,.5,.1));
  };
  trayG.add(wire([[.64,.22,.68],[.72,.26,.5],[.7,.2,.2],[.6,.16,-.1]], 0xC0392B));
  trayG.add(wire([[.64,.2,.72],[.76,.24,.55],[.74,.18,.25]], 0x14181E));
  trayG.add(wire([[-.28,.14,-.6],[.1,.2,-.62],[.44,.14,-.58]], 0xC9A227, .012));
  trayG.position.set(0, -.16, -.5);
}
addPart("tray", trayG, [0.5,0.85], new T.Vector3(0,-.5,-.25), new T.Vector3());
ANCH.jetson = {obj: trayG, local: new T.Vector3(-.28,.25,-.2)};
ANCH.imu = {obj: trayG, local: new T.Vector3(-.44,.18,.3)};
ANCH.bar30 = {obj: trayG, local: new T.Vector3(.44,.24,.3)};
ANCH.lipo = {obj: trayG, local: new T.Vector3(0,.3,.68)};
ANCH.pwm = {obj: trayG, local: new T.Vector3(.44,.18,-.5)};

/* --- ballast engine --- */
const balG = new T.Group();
{
  const nema = box(.48,.42,.48, matDark()); nema.position.set(0,.05,-.5);
  const plate = box(.5,.44,.04, matMetal()); plate.position.set(0,.05,-.24);
  for (const [x,y] of [[-.18,-.1],[.18,-.1],[-.18,.2],[.18,.2]]){
    const b = cyl(.03,.03,.03, matMetal()); b.rotation.x = Math.PI/2;
    b.position.set(x,y+.05,-.22); balG.add(b);
  }
  const lbl = textPlane("NEMA 17", .4, .1, "#b8ccdc", null, 40);
  lbl.position.set(0,.32,-.5); lbl.rotation.x = -Math.PI/2; lbl.rotation.z = Math.PI;
  const shaft = cyl(.028,.028,.5, matMetal()); shaft.rotation.x = Math.PI/2;
  shaft.position.set(0,.05,.02);
  // syringe
  const tube = new T.Mesh(new T.CylinderGeometry(.21,.21,.84,24,1,true), matGlassG());
  tube.rotation.x = Math.PI/2; tube.position.set(0,.05,.54);
  const capF = cyl(.23,.23,.06, matMetal()); capF.rotation.x = Math.PI/2; capF.position.set(0,.05,.12);
  const capB = cyl(.23,.23,.06, matMetal()); capB.rotation.x = Math.PI/2; capB.position.set(0,.05,.96);
  const water = new T.Mesh(new T.CylinderGeometry(.18,.18,1,20), matWater());
  water.rotation.x = Math.PI/2;
  water.scale.y = 0.4; water.position.set(0,.05,.74);
  balG.userData.water = water;
  const piston = cyl(.19,.19,.06, matMetal()); piston.rotation.x = Math.PI/2;
  piston.position.set(0,.05,.5);
  balG.userData.piston = piston;
  const portF = cyl(.06,.06,.14, M(0x8a7440,.4,.6)); portF.rotation.x = Math.PI/2;
  portF.position.set(0,.02,1.02);
  const portD = cyl(.04,.04,.2, matMetal()); portD.position.set(0,-.18,1.04);
  balG.add(nema, plate, lbl, shaft, tube, capF, capB, water, piston, portF, portD);
  balG.position.set(0, -.15, 1.0);
}
addPart("ballast", balG, [0.55,0.88], new T.Vector3(0,-1.3,.25), new T.Vector3());
ANCH.chamber = {obj: balG, local: new T.Vector3(0,.26,.55)};
ANCH.stepper = {obj: balG, local: new T.Vector3(0,.28,-.5)};
ANCH.port = {obj: balG, local: new T.Vector3(0,-.2,1.05)};

/* --- ventral hull --- */
const ventralG = new T.Group();
{
  const shellGeoV = mantaShell(-.42, t => Math.pow(Math.min(1, t/.34), .55), mantaW);
  flattenBow(shellGeoV);
  cutWindow(shellGeoV);
  const shell = new T.Mesh(shellGeoV, matHullV());
  ventralG.add(shell);
  // silicone seam bead along the parting line
  const gpts = bodyShape.getPoints(80).map(p => new T.Vector3(p.x*.985, -.015, -p.y*.985));
  const gasket = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(gpts, true), 100, .02, 8), M(0xf2a7c3,.4,.05));
  ventralG.add(gasket);
  // tail
  const tail = cyl(.05,.012,1.8, matHull());
  tail.rotation.x = Math.PI/2 + .13;
  tail.position.set(0,-.16,2.85);
  ventralG.add(tail);
  // intake grille
  const gr = box(.5,.08,.34, matBlack()); gr.position.set(0,-.21,-1.5);
  for (let i=0;i<4;i++){
    const slat = box(.4,.02,.04, M(0x42477c,.4,.3));
    slat.position.set(0,-.25,-1.62+i*.09);
    ventralG.add(slat);
  }
  ventralG.add(gr);
  // ballast port ring
  const ring = new T.Mesh(new T.TorusGeometry(.12,.03,10,22), matMetal());
  ring.rotation.x = Math.PI/2;
  ring.position.set(0,-.26,1.1);
  ventralG.add(ring);
}
addPart("ventral", ventralG, [0.42,0.85], new T.Vector3(0,-2.5,0), new T.Vector3(0,0,-.05));
ANCH.vent = {obj: ventralG, local: new T.Vector3(0,-.3,.4)};

