"use strict";
/* ================= keyframes: camera + explode + focus ================= */
const A1 = {dorsal:1,hatch:1,finL:1,finR:1,frame:1,tray:1,ballast:1,ventral:1,cooler:1};
const AE = Object.assign({},A1,{dorsal:.04,hatch:.04,finL:.03,finR:.03,frame:.07,tray:1,ballast:.08,ventral:.05});
const AB = Object.assign({},A1,{dorsal:.04,hatch:.04,finL:.03,finR:.03,frame:.07,tray:.07,ballast:1,ventral:.06,cooler:.07});
const AC = Object.assign({},A1,{dorsal:.025,hatch:.025,finL:.015,finR:.015,frame:.025,tray:1,ballast:1,ventral:.025});
const AW = Object.assign({},A1,{dorsal:.08,hatch:.08,finL:.9,finR:.9,frame:1,tray:.08,ballast:.08,ventral:.07,cooler:.08});
const KF = [
 {p:0.000, az:-26, el:2, dist:12.0,  tx:0,    ty:3.6,  tz:0,    e:0,   op:1,   al:A1},
 {p:0.045, az:-8, el:8, dist:11.5,  tx:0,    ty:2.3,  tz:0,    e:0,   op:1,   al:A1},
 {p:0.085, az:26,  el:12, dist:10.0, tx:-1.35,ty:.15,  tz:0,    e:0,   op:1,   al:A1},
 {p:0.185, az:-28, el:24, dist:10.2, tx:1.35, ty:.1,   tz:0,    e:0,   op:1,   al:A1},
 {p:0.300, az:18,  el:34, dist:9.8,  tx:0,    ty:.1,   tz:0,    e:.1,  op:1,   al:A1},
 {p:0.360, az:4,   el:31, dist:14.4, tx:0,    ty:.1,   tz:0,    e:1,   op:1,   al:A1},
 {p:0.445, az:-20, el:29, dist:14.2, tx:0,    ty:.1,   tz:0,    e:1,   op:1,   al:A1},
 {p:0.482, az:150, el:30, dist:5.3,  tx:0,    ty:-1.42,tz:1.25, e:1,   op:1,   al:AB},
 {p:0.545, az:198, el:26, dist:5.2,  tx:0,    ty:-1.42,tz:1.25, e:1,   op:1,   al:AB},
 {p:0.578, az:330, el:42, dist:8.2,  tx:0,    ty:-.80,tz:.55,  e:1,   op:1,al:AC,cool:1},
 {p:0.615, az:347, el:40, dist:8.2,  tx:0,    ty:-.80,tz:.55,  e:1,   op:1,al:AC,cool:1},
 {p:0.655, az:365, el:38, dist:8.2,  tx:0,    ty:-.80,tz:.55,  e:1,   op:1,al:AC,cool:1},
 {p:0.702, az:372, el:46, dist:4.9,  tx:0,    ty:-.62, tz:-.75, e:1,   op:1,   al:AE},
 {p:0.775, az:354, el:44, dist:4.8,  tx:0,    ty:-.62, tz:-.75, e:1,   op:1,   al:AE},
 {p:0.810, az:322, el:42, dist:10.8,  tx:0,    ty:.8,   tz:0,    e:.8,  op:1,   al:AW},
 {p:0.880, az:374, el:36, dist:10.4,  tx:0,    ty:.8,   tz:0,    e:.8,  op:1,   al:AW},
 // Give the returning systems almost twice the scroll distance to close.
 // Keep the same translucent material treatment as the handoff fade.
 {p:0.945, az:340, el:19, dist:9.8,  tx:0,    ty:-.5,  tz:0,    e:0,   op:.6, al:A1},
 {p:0.975, az:338, el:19, dist:9.8,  tx:0,    ty:-.5,  tz:0,    e:0,   op:.6, al:A1},
 {p:1.000, az:330, el:10, dist:16.0, tx:0,    ty:.2,   tz:0,    e:0,   op:.22, al:A1},
];
function paramsAt(p){
  let i = 0;
  while (i < KF.length-2 && p > KF[i+1].p) i++;
  const a = KF[i], b = KF[i+1];
  const u = clamp((p - a.p) / (b.p - a.p), 0, 1);
  // Quintic easing brings both velocity and acceleration to rest at either
  // end of reassembly, without an extra camera stop halfway through it.
  const reassembling = a.p === .880;
  const t = reassembling ? u*u*u*(u*(u*6-15)+10) : ease(u);
  const out = {al:{}};
  for (const k of ["az","el","dist","tx","ty","tz","e","op"]) out[k] = lerp(a[k], b[k], t);
  for (const k in A1) out.al[k] = lerp(a.al[k], b.al[k], t);
  out.cool=lerp(a.cool||0,b.cool||0,t);
  // Establish the ghosted view while systems return, then hold it as the
  // shell closes so the internal parts remain visible inside the hull.
  if(reassembling)out.op=lerp(1,.6,sstep((p-.880)/.028));
  return out;
}
