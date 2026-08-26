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
/* surface splash: white spray thrown up where DIVA punches through the waterline */
let splash = [], splashed = false;
function spawnSplash(){
  const cx = W/2, cy = H*.56;
  for (let i = 0; i < 40; i++){
    const a = -Math.PI/2 + (Math.random() - .5)*2.0;
    const sp = 2.0 + Math.random()*4.8;
    splash.push({x: cx + (Math.random() - .5)*110, y: cy + (Math.random() - .5)*6,
      vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 1.4, r: 1.2 + Math.random()*2.8, life: 1});
  }
}
function drawSnow(t){
  sctx.clearRect(0,0,W,H);
  if (splash.length){
    sctx.fillStyle = "#EAF9FF";
    for (const p of splash){
      p.x += p.vx; p.y += p.vy; p.vy += .12; p.life -= .014;
      sctx.globalAlpha = Math.max(0, p.life)*.85;
      sctx.beginPath(); sctx.arc(p.x, p.y, p.r, 0, 7); sctx.fill();
    }
    splash = splash.filter(p => p.life > 0 && p.y < H*.8);
    sctx.globalAlpha = 1;
  }
  sctx.fillStyle = "#BFE6F5";
  for (const p of sparts){
    p.y -= p.v; p.x += Math.sin(t*0.0006 + p.ph)*0.18;
    if (p.y < -4){ p.y = H+4; p.x = Math.random()*W; }
    sctx.globalAlpha = p.a;
    sctx.beginPath(); sctx.arc(p.x, p.y, p.r, 0, 7); sctx.fill();
  }
  sctx.strokeStyle = "rgba(205,238,252,.5)";
  sctx.lineWidth = 1;
  for (const b of bubbles){
    b.y -= b.v; b.x += Math.sin(t*0.0011 + b.ph)*0.5;
    if (b.y < -8){ b.y = H+8; b.x = Math.random()*W; }
    sctx.globalAlpha = 0.5;
    sctx.beginPath(); sctx.arc(b.x, b.y, b.r, 0, 7); sctx.stroke();
  }
  sctx.globalAlpha = 1;
}

