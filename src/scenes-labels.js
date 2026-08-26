"use strict";
/* ================= scenes / labels ================= */
const SCN = [
 ["hero",0,0.085],["s1",0.085,0.185],["s2",0.185,0.300],["s3",0.300,0.445],
 ["s4",0.445,0.590],["s5",0.590,0.715],["s6",0.715,0.830],["s7",0.830,0.925],["hand",0.925,1.01]
];
const panelMap = {s1:"#panel-s1",s2:"#panel-s2",s7:"#panel-s7",hand:"#panel-hand"};
const capMap = {s3:"#cap-s3",s4:"#cap-s4",s5:"#cap-s5",s6:"#cap-s6"};
const labels = [...document.querySelectorAll(".lbl")].map(el => ({
  el, scene: el.dataset.scene, anchor: el.dataset.anchor
}));
const NS = "http://www.w3.org/2000/svg";
const leadersSvg = $("#leadersA");
const sceneGroups = {};
labels.forEach(lb => {
  if (!sceneGroups[lb.scene]) {
    const g = document.createElementNS(NS,"g");
    leadersSvg.appendChild(g);
    sceneGroups[lb.scene] = g;
  }
});
// dark halos first so every underlay renders beneath every cyan lead line
labels.forEach(lb => {
  const g = sceneGroups[lb.scene];
  lb.halo = document.createElementNS(NS,"line");
  lb.halo.setAttribute("class","halo");
  lb.dotH = document.createElementNS(NS,"circle");
  lb.dotH.setAttribute("class","halo");
  lb.dotH.setAttribute("r","5");
  g.appendChild(lb.halo); g.appendChild(lb.dotH);
});
labels.forEach(lb => {
  const g = sceneGroups[lb.scene];
  lb.line = document.createElementNS(NS,"line");
  lb.dot = document.createElementNS(NS,"circle");
  lb.dot.setAttribute("r","3");
  g.appendChild(lb.line); g.appendChild(lb.dot);
});
const _v = new T.Vector3();
/* dynamic label layout: each box sits on the same side of the screen as the part
   it points to, columns stack in target order (so leader lines never cross), and
   boxes dodge the topbar, scene caption, and depth rail. */
const railEl = document.querySelector(".depthrail");
const topbarEl = document.querySelector(".topbar");
const LGAP = 12;
function updateLeaders(){
  const w = stageA.clientWidth, h = stageA.clientHeight;
  const sr = stageA.getBoundingClientRect();
  const act = [];
  for (const lb of labels){
    const g = sceneGroups[lb.scene];
    if (!g.classList.contains("on")) continue;
    const a = ANCH[lb.anchor];
    if (!a) continue;
    _v.copy(a.local).applyMatrix4(a.obj.matrixWorld).project(camera);
    lb.tx = (_v.x+1)/2*w; lb.ty = (1-(_v.y+1)/2)*h;
    // side of the part on screen, with hysteresis so idle bob can't flip boxes back and forth
    const band = w*0.03;
    if (lb.tx < w/2 - band) lb.side = "L";
    else if (lb.tx > w/2 + band) lb.side = "R";
    else if (!lb.side) lb.side = lb.tx < w/2 ? "L" : "R";
    act.push(lb);
  }
  if (act.length){
    let minTop = 70;
    if (topbarEl){ const tr = topbarEl.getBoundingClientRect(); minTop = Math.max(minTop, tr.bottom - sr.top + 8); }
    const capSel = capMap[activeScene];
    let capR = null;
    if (capSel){ const c = $(capSel); if (c && c.classList.contains("on")) capR = c.getBoundingClientRect(); }
    const maxBot = h - 16;
    const edge = Math.round(clamp(w*0.015, 8, 26));
    for (const side of ["L","R"]){
      const col = act.filter(l => l.side === side).sort((a,b) => a.ty - b.ty);
      if (!col.length) continue;
      const colW = Math.max(...col.map(l => l.el.offsetWidth));
      let colX = side === "L" ? edge : w - edge - colW;
      // the depth gauge owns the far-left strip; start the left column beside it
      if (side === "L" && railEl && getComputedStyle(railEl).display !== "none"){
        const rr = railEl.getBoundingClientRect();
        colX = Math.max(colX, rr.right - sr.left + 12);
      }
      let cMin = minTop;
      if (capR && !(colX + colW < capR.left - sr.left || colX > capR.right - sr.left))
        cMin = Math.max(cMin, capR.bottom - sr.top + 10);
      for (const l of col){
        l.bh = l.el.offsetHeight;
        l.want = clamp(l.ty - l.bh/2, cMin, Math.max(cMin, maxBot - l.bh));
      }
      // stack downward in target order
      let cur = cMin;
      for (const l of col){
        const t = Math.max(l.want, cur);
        l.top = t; cur = t + l.bh + LGAP;
      }
      // if the column ran past the bottom, pack it back up
      const last = col[col.length-1];
      if (last.top + last.bh > maxBot){
        let cur2 = maxBot;
        for (let i = col.length-1; i >= 0; i--){
          const l = col[i];
          l.top = Math.min(l.top, cur2 - l.bh);
          cur2 = l.top - LGAP;
        }
      }
      for (const l of col){
        if (side === "L"){ l.el.style.left = colX + "px"; l.el.style.right = "auto"; }
        else { l.el.style.right = edge + "px"; l.el.style.left = "auto"; }
        l.el.style.top = Math.round(l.top) + "px";
      }
    }
    for (const lb of act){
      const cr = lb.el.getBoundingClientRect();
      const ax = (lb.side === "L" ? cr.right : cr.left) - sr.left;
      const ay = cr.top + cr.height/2 - sr.top;
      for (const ln of [lb.halo, lb.line]){
        ln.setAttribute("x1",ax); ln.setAttribute("y1",ay);
        ln.setAttribute("x2",lb.tx); ln.setAttribute("y2",lb.ty);
      }
      lb.dotH.setAttribute("cx",lb.tx); lb.dotH.setAttribute("cy",lb.ty);
      lb.dot.setAttribute("cx",lb.tx); lb.dot.setAttribute("cy",lb.ty);
    }
  }
}
let activeScene = "hero";
function setScene(id){
  if (id === activeScene) return;
  activeScene = id;
  stageA.dataset.scene = id;
  for (const [sid, sel] of Object.entries(panelMap)) $(sel).classList.toggle("on", sid === id);
  for (const [sid, sel] of Object.entries(capMap)) $(sel).classList.toggle("on", sid === id);
  labels.forEach(lb => lb.el.classList.toggle("on", lb.scene === id));
  for (const [sid, g] of Object.entries(sceneGroups)) g.classList.toggle("on", sid === id);
}

