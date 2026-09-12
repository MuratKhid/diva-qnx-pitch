"use strict";
/* ================= particles ================= */
const snow = $("#snow"), sctx = snow.getContext("2d");
let sparts = [], bubbles = [], W = 0, H = 0;
function sizeSnow(){
  W = snow.width = innerWidth; H = snow.height = innerHeight;
  sparts = Array.from({length: Math.min(120, W/11)}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    r: 0.6 + Math.random()*1.9, v: 0.1 + Math.random()*0.4,
    ph: Math.random()*Math.PI*2, a: 0.05 + Math.random()*0.15
  }));
  bubbles = Array.from({length: 9}, () => ({
    x: Math.random()*W, y: Math.random()*H,
    r: 1.6 + Math.random()*3.6, v: 0.55 + Math.random()*0.9,
    ph: Math.random()*Math.PI*2
  }));
}
sizeSnow(); addEventListener("resize", sizeSnow);
function drawSnow(t,submerged=1){
  sctx.clearRect(0,0,W,H);
  sctx.fillStyle = "#BFE6F5";
  for (const p of sparts){
    p.y -= p.v; p.x += Math.sin(t*0.0006 + p.ph)*0.18;
    if (p.y < -4){ p.y = H+4; p.x = Math.random()*W; }
    sctx.globalAlpha = p.a*submerged;
    sctx.beginPath(); sctx.arc(p.x, p.y, p.r, 0, 7); sctx.fill();
  }
  sctx.strokeStyle = "rgba(205,238,252,.5)";
  sctx.lineWidth = 1;
  for (const b of bubbles){
    b.y -= b.v; b.x += Math.sin(t*0.0011 + b.ph)*0.5;
    if (b.y < -8){ b.y = H+8; b.x = Math.random()*W; }
    sctx.globalAlpha = 0.5*submerged;
    sctx.beginPath(); sctx.arc(b.x, b.y, b.r, 0, 7); sctx.stroke();
  }
  sctx.globalAlpha = 1;
}
