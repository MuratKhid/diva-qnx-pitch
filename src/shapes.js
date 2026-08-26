"use strict";
/* ================= shapes ================= */
function closedShape(pts, div){
  const v3 = pts.map(p => new T.Vector3(p[0], p[1], 0));
  const curve = new T.CatmullRomCurve3(v3, true, "catmullrom", 0.6);
  const smooth = curve.getPoints(div || 140).map(p => new T.Vector2(p.x, p.y));
  return new T.Shape(smooth);
}
// planform coords: x = span, y = forward (+y = nose). rotateX(-90°) maps y → world −z (nose at −z).
const bodyPts = [
  [0,2.4],[-0.4,2.36],[-0.72,2.2],[-1.0,1.85],[-1.22,1.3],[-1.35,0.5],[-1.3,-0.35],[-1.05,-1.2],[-0.6,-1.85],[0,-2.1],
  [0.6,-1.85],[1.05,-1.2],[1.3,-0.35],[1.35,0.5],[1.22,1.3],[1.0,1.85],[0.72,2.2],[0.4,2.36]
];
const wingPtsL = [
  [-0.95,1.35],[-1.9,1.05],[-2.85,0.6],[-3.6,0.1],[-3.8,-0.12],[-3.65,-0.32],[-3.0,-0.5],[-2.1,-0.7],[-1.35,-0.85],[-0.96,-0.85],[-0.9,0.2]
];
const wingPtsR = wingPtsL.map(p => [-p[0], p[1]]).reverse();
const lobePtsL = [[-0.3,2.28],[-0.4,2.7],[-0.48,2.98],[-0.64,2.92],[-0.6,2.55],[-0.48,2.22]];
const lobePtsR = lobePtsL.map(p => [-p[0], p[1]]).reverse();

const bodyShape = closedShape(bodyPts, 160);
const wingShapeL = closedShape(wingPtsL, 90);
const wingShapeR = closedShape(wingPtsR, 90);
const lobeShapeL = closedShape(lobePtsL, 40);
const lobeShapeR = closedShape(lobePtsR, 40);

function extrudeFlat(shape, depth, bevelT, bevelS, segs){
  const g = new T.ExtrudeGeometry(shape, {
    steps: 1, depth, bevelEnabled: true,
    bevelThickness: bevelT, bevelSize: bevelS, bevelOffset: -bevelS*0.55,
    bevelSegments: segs || 6, curveSegments: 10
  });
  g.rotateX(-Math.PI/2);   // planform flat, thickness up (+y), nose → −z
  g.computeVertexNormals();
  return g;
}

/* sculpted manta shell: organic thickness field over the planform */
function mantaShell(H, prof, wfn){
  let pts = bodyShape.getPoints(220);
  if (pts.length > 1 && pts[0].distanceTo(pts[pts.length-1]) < 1e-6) pts = pts.slice(0,-1);
  const N = pts.length, MR = 22, CAP = 6, TOT = MR + CAP, cx = 0, cyc = 0.1;
  const vtx = [], idx = [];
  for (let k = 0; k <= TOT; k++){
    let sx, sy, t;
    if (k <= MR){
      t = k/MR; sx = 1 - t*0.62; sy = 1 - t*0.27;
    } else {
      t = 1;
      const c = (k - MR)/CAP;
      sx = 0.38*(1 - c*0.96); sy = 0.73*(1 - c*0.96);
    }
    for (let i = 0; i < N; i++){
      const p = pts[i];
      const x = cx + (p.x-cx)*sx, yp = cyc + (p.y-cyc)*sy, z = -yp;
      vtx.push(x, H*prof(t)*wfn(z), z);
    }
  }
  for (let k = 0; k < TOT; k++) for (let i = 0; i < N; i++){
    const a = k*N+i, b = k*N+(i+1)%N, c = (k+1)*N+i, d = (k+1)*N+(i+1)%N;
    idx.push(a,b,c, b,d,c);
  }
  const ci = vtx.length/3;
  vtx.push(cx, H*prof(1)*wfn(-cyc), -cyc);
  for (let i = 0; i < N; i++) idx.push(TOT*N+i, TOT*N+(i+1)%N, ci);
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vtx,3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const mantaW = z => .55 + .5*Math.exp(-Math.pow(z + .9, 2)/2.2);
function flattenBow(g){
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++){
    if (pos.getZ(i) < -2.25) pos.setZ(i, -2.25);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
}
function cutWindow(g){
  const pos = g.attributes.position, ix = g.getIndex();
  const a = .45, b = .2, y0 = .14, zLim = -2.1;
  const inside = i => {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (z > zLim) return false;
    const ex = x/a, ey = (y-y0)/b;
    return ex*ex + ey*ey < 1;
  };
  const keep = [];
  for (let t = 0; t < ix.count; t += 3){
    const i0 = ix.getX(t), i1 = ix.getX(t+1), i2 = ix.getX(t+2);
    if (inside(i0) && inside(i1) && inside(i2)) continue;
    keep.push(i0, i1, i2);
  }
  g.setIndex(keep);
}

