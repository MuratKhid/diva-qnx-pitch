"use strict";
/* ================= keyframes: camera + explode + focus ================= */
const A1 = {dorsal:1,hatch:1,finL:1,finR:1,frame:1,tray:1,ballast:1,ventral:1};
const AE = Object.assign({},A1,{dorsal:.04,hatch:.04,finL:.03,finR:.03,frame:.07,tray:1,ballast:.08,ventral:.05});
const AB = Object.assign({},A1,{dorsal:.04,hatch:.04,finL:.03,finR:.03,frame:.07,tray:.07,ballast:1,ventral:.06});
const AW = Object.assign({},A1,{dorsal:.08,hatch:.08,finL:.9,finR:.9,frame:1,tray:.08,ballast:.08,ventral:.07});
const KF = [
 {p:0.000, az:-26, el:14, dist:9.8,  tx:0,    ty:1.6,  tz:0,    e:0,   op:1,   al:A1},
 {p:0.085, az:26,  el:12, dist:10.0, tx:-1.35,ty:.15,  tz:0,    e:0,   op:1,   al:A1},
 {p:0.185, az:-28, el:24, dist:10.2, tx:1.35, ty:.1,   tz:0,    e:0,   op:1,   al:A1},
 {p:0.300, az:18,  el:34, dist:9.8,  tx:0,    ty:.1,   tz:0,    e:.1,  op:1,   al:A1},
 {p:0.360, az:4,   el:31, dist:14.4, tx:0,    ty:.1,   tz:0,    e:1,   op:1,   al:A1},
 {p:0.445, az:-20, el:29, dist:14.2, tx:0,    ty:.1,   tz:0,    e:1,   op:1,   al:A1},
 {p:0.492, az:12,  el:46, dist:4.9,  tx:0,    ty:-.62, tz:-.75, e:1,   op:1,   al:AE},
 {p:0.590, az:-6,  el:44, dist:4.8,  tx:0,    ty:-.62, tz:-.75, e:1,   op:1,   al:AE},
 {p:0.635, az:150, el:30, dist:5.3,  tx:0,    ty:-1.42,tz:1.25, e:1,   op:1,   al:AB},
 {p:0.715, az:198, el:26, dist:5.2,  tx:0,    ty:-1.42,tz:1.25, e:1,   op:1,   al:AB},
 {p:0.762, az:322, el:42, dist:10.8,  tx:0,    ty:.8,   tz:0,    e:.8,  op:1,   al:AW},
 {p:0.830, az:374, el:36, dist:10.4,  tx:0,    ty:.8,   tz:0,    e:.8,  op:1,   al:AW},
 {p:0.885, az:352, el:17, dist:9.8,  tx:0,    ty:-.55, tz:0,    e:0,   op:1,   al:A1},
 {p:0.925, az:338, el:19, dist:9.8,  tx:0,    ty:-.5,  tz:0,    e:0,   op:1,   al:A1},
 {p:1.000, az:330, el:10, dist:16.0, tx:0,    ty:.2,   tz:0,    e:0,   op:.22, al:A1},
];
function paramsAt(p){
  let i = 0;
  while (i < KF.length-2 && p > KF[i+1].p) i++;
  const a = KF[i], b = KF[i+1];
  const t = ease(clamp((p - a.p) / (b.p - a.p), 0, 1));
  const out = {al:{}};
  for (const k of ["az","el","dist","tx","ty","tz","e","op"]) out[k] = lerp(a[k], b[k], t);
  for (const k in A1) out.al[k] = lerp(a.al[k], b.al[k], t);
  return out;
}

