"use strict";
/* ================= QNX HUD ================= */
const stageB = $("#stageB"), hud = $("#hud");
const QSCN = [["q0",0,0.15],["q1",0.15,0.40],["q2",0.40,0.63],["q3",0.63,0.86],["q4",0.86,1.01]];
let activeQ = "";   // empty so the first entry into the QNX half activates q0 properly
function setQScene(id){
  if (id === activeQ) return;
  activeQ = id;
  stageB.dataset.scene = id;
  ["q0","q1","q2","q3","q4"].forEach(q => $("#"+q).classList.toggle("on", q === id));
}
const sch = $("#sch");
const SEG = [];
(function buildScheduler(){
  const t = (x,y,size,cls,str) => {
    const e = document.createElementNS(NS,"text");
    e.setAttribute("x",x); e.setAttribute("y",y); e.setAttribute("font-size",size);
    e.setAttribute("class",cls); e.textContent = str; sch.appendChild(e); return e;
  };
  const lane = (y) => {
    const l = document.createElementNS(NS,"line");
    l.setAttribute("x1",40); l.setAttribute("x2",860); l.setAttribute("y1",y); l.setAttribute("y2",y);
    l.setAttribute("stroke","rgba(140,190,220,.18)"); sch.appendChild(l);
  };
  t(40, 40, 11.5, "tt ta", "QNX · CONTROL LOOP — 100 Hz, highest priority");
  lane(86);
  t(40, 128, 11.5, "tt tc", "QNX · VISION INFERENCE — preempted at every deadline");
  lane(174);
  t(40, 216, 11.5, "tt", "GENERAL-PURPOSE OS · same loop, best-effort scheduling");
  lane(262);
  for (let x = 52; x <= 848; x += 30){
    const r = document.createElementNS(NS,"rect");
    r.setAttribute("x",x); r.setAttribute("y",60); r.setAttribute("width",3.2); r.setAttribute("height",26);
    r.setAttribute("fill","var(--amber)"); sch.appendChild(r);
    SEG.push({el:r, x});
  }
  let seed = 20260824;
  const rnd = () => (seed = seed*48271 % 2147483647) / 2147483647;
  let vx = 58;
  while (vx < 830){
    const w = 20 + rnd()*46;
    let a = vx, b = Math.min(vx + w, 838);
    let cuts = [a];
    for (let x = 52; x <= 848; x += 30) if (x > a+2 && x < b-2) cuts.push(x);
    cuts.push(b);
    for (let i = 0; i < cuts.length-1; i++){
      const x0 = cuts[i] + (i>0 ? 4 : 0), x1 = cuts[i+1];
      if (x1 - x0 < 3) continue;
      const r = document.createElementNS(NS,"rect");
      r.setAttribute("x",x0); r.setAttribute("y",146); r.setAttribute("width",x1-x0); r.setAttribute("height",22);
      r.setAttribute("rx",2); r.setAttribute("fill","rgba(111,214,242,.5)"); sch.appendChild(r);
      SEG.push({el:r, x:x0});
    }
    vx = b + 8 + rnd()*22;
  }
  let k = 0;
  for (let x = 52; x <= 848; x += 30, k++){
    const J = 2 + (k/26)*15;
    const jit = (rnd()-0.5)*2*J;
    const late = Math.abs(jit) > 9;
    const r = document.createElementNS(NS,"rect");
    r.setAttribute("x",x+jit); r.setAttribute("y",236); r.setAttribute("width",3.2); r.setAttribute("height",26);
    r.setAttribute("fill", late ? "var(--danger)" : "rgba(147,169,188,.8)"); sch.appendChild(r);
    SEG.push({el:r, x:x+jit});
    if (late){
      const m = document.createElementNS(NS,"text");
      m.setAttribute("x",x+jit-4); m.setAttribute("y",232); m.setAttribute("font-size","9");
      m.setAttribute("class","t"); m.setAttribute("fill","var(--danger)"); m.textContent = "✕";
      sch.appendChild(m); SEG.push({el:m, x:x+jit});
    }
  }
  t(560, 292, 10, "t tf", "jitter grows under load →");
  const ph = document.createElementNS(NS,"line");
  ph.id = "playhead";
  ph.setAttribute("y1",30); ph.setAttribute("y2",270);
  ph.setAttribute("stroke","var(--ink)"); ph.setAttribute("stroke-width","1.4");
  ph.setAttribute("stroke-dasharray","2 3");
  sch.appendChild(ph);
  SEG.forEach(s => s.el.style.opacity = "0.16");
})();
const playhead = $("#playhead");
let phLast = -1;
function updateScheduler(t){
  const px = 40 + t*810;
  if (Math.abs(px - phLast) < 0.5) return;
  phLast = px;
  playhead.setAttribute("x1",px); playhead.setAttribute("x2",px);
  for (const s of SEG){
    const on = s.x <= px;
    if (s.on !== on){ s.on = on; s.el.style.opacity = on ? "1" : "0.16"; }
  }
}
const pipe = $("#pipe"), iso = $("#iso");
function updatePipe(t){
  let step = 0;
  if (t > 0.12) step = 1;
  if (t > 0.32) step = 2;
  if (t > 0.52) step = 3;
  if (t > 0.72) step = 4;
  if (pipe.dataset.step != step) pipe.dataset.step = step;
  pipe.classList.toggle("running", step >= 3 && !reduced);
}
function updateIso(t){
  let ph = "normal";
  if (t > 0.30) ph = "crash";
  if (t > 0.52) ph = "respawn";
  if (t > 0.70) ph = "restored";
  if (iso.dataset.phase !== ph) iso.dataset.phase = ph;
}

