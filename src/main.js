"use strict";
/* ================= main loop ================= */
const robotTrack = $("#robotTrack"), qnxTrack = $("#qnxTrack"), seaTrack = $("#seaTrack");
const depthNum = $("#depthNum"), drScale = $("#drScale"), drMarker = $("#drMarker");
const glideDot = $("#glideDot"), glidePath = $("#glidePath");
const glideLen = glidePath.getTotalLength();
const root = document.documentElement;

/* ---- depth gauge: every mark is one of the site's actual scenes; ----
   ---- click one to dive to that state of the robot                ---- */
const MAXDEPTH = 30;
const closingEl = document.querySelector(".closing");
const teamEl = document.querySelector(".teamsec");
// track "A" = robot track progress, "B" = QNX track progress, "END" = closing
const MARKS = [
  {name:"SURFACE",        track:"A", t:0},
  {name:"PROBLEM",     track:"A", t:.135},
  {name:"BIOMECHANICS",       track:"A", t:.24},
  {name:"ASSEMBLY",    track:"A", t:.36},
  {name:"ELECTRONICS", track:"A", t:.52},
  {name:"BALLAST",     track:"A", t:.65},
  {name:"WINGS",       track:"A", t:.775},
  {name:"REASSEMBLY",  track:"A", t:.875},
  {name:"HANDOFF",        track:"A", t:.965},
  {name:"INVISIBLE HALF", track:"B", t:.06},
  {name:"ARCHITECTURE",   track:"B", t:.27},
  {name:"DETERMINISM",    track:"B", t:.51},
  {name:"ISOLATION",      track:"B", t:.74},
  {name:"WHY QNX",        track:"B", t:.93},
  {name:"THE ASK",        track:"END", t:0},
  {name:"THE TEAM",       track:"TEAM", t:0},
  {name:"SEA FLOOR",      track:"C", t:.5},
];
function markTargetY(m){
  const doc = document.documentElement;
  const maxY = doc.scrollHeight - innerHeight;
  let y;
  if (m.track === "A") y = robotTrack.offsetTop + m.t*(robotTrack.offsetHeight - innerHeight);
  else if (m.track === "B") y = qnxTrack.offsetTop + m.t*(qnxTrack.offsetHeight - innerHeight);
  else if (m.track === "C") y = seaTrack.offsetTop + m.t*(seaTrack.offsetHeight - innerHeight);
  else if (m.track === "TEAM") y = teamEl ? teamEl.offsetTop - innerHeight*.12 : maxY;
  else y = closingEl ? closingEl.offsetTop - innerHeight*.12 : maxY;
  return clamp(y, 0, maxY);
}
function layoutGauge(){
  const maxY = document.documentElement.scrollHeight - innerHeight;
  for (const m of MARKS){
    const y = markTargetY(m);
    m.frac = y/maxY;
    m.el.style.top = (m.frac*100).toFixed(3) + "%";
    m.el.setAttribute("aria-label", `Dive to ${m.name} · −${(m.frac*MAXDEPTH).toFixed(1)} m`);
  }
}
(function buildGauge(){
  if (!drScale) return;
  for (let d = 1; d < MAXDEPTH; d++){       // faint 1 m ruler ticks behind the scene marks
    const i = document.createElement("i");
    i.className = "dr-min";
    i.style.top = (d/MAXDEPTH*100).toFixed(2) + "%";
    drScale.appendChild(i);
  }
  for (const m of MARKS){
    const b = document.createElement("button");
    b.className = "dr-tick";
    b.innerHTML = `<i></i><span>${m.name}</span>`;
    b.__mark = m;
    drScale.appendChild(b);
    m.el = b;
  }
  layoutGauge();
})();
addEventListener("resize", layoutGauge);
let lastMark = -1;
function updateGaugeActive(total){
  let idx = -1;
  for (let i = 0; i < MARKS.length; i++) if (total >= MARKS[i].frac - .005) idx = i;
  if (idx !== lastMark){
    if (lastMark >= 0) MARKS[lastMark].el.classList.remove("on");
    if (idx >= 0) MARKS[idx].el.classList.add("on");
    lastMark = idx;
  }
  // fade a mark's caption while the depth chip slides over it
  const sh = drScale.clientHeight;
  for (const m of MARKS){
    const near = Math.abs(total - m.frac) * sh < 12;
    if (near !== m.hidden){
      m.hidden = near;
      m.el.querySelector("span").style.opacity = near ? "0" : "";
    }
  }
}
let seekRaf = null;
function cancelSeek(){ if (seekRaf){ cancelAnimationFrame(seekRaf); seekRaf = null; } }
function seekToY(targetY, speedMul){
  const startY = scrollY, dist = targetY - startY;
  cancelSeek();
  if (Math.abs(dist) < 2) return;
  if (reduced){ scrollTo(0, targetY); return; }
  // cruise at a constant, human-scroll pace so every scene animation plays out,
  // with short ramps at both ends so the dive starts and stops gently
  const SPEED = Math.max(200, innerHeight * 0.7 * (speedMul || 1));   // px per second
  const RAMP = 350;                  // ms of acceleration at each end
  const dur = Math.max(600, Math.abs(dist) / SPEED * 1000 + RAMP);
  const r = Math.min(.5, RAMP / dur);
  const v = 1 / (1 - r);             // cruise velocity of the trapezoid profile
  const prof = t => t < r ? v*t*t/(2*r) : t < 1-r ? v*(t - r/2) : 1 - v*(1-t)*(1-t)/(2*r);
  const t0 = performance.now();
  const step = now => {
    const p = clamp((now - t0) / dur, 0, 1);
    scrollTo(0, startY + dist * prof(p));
    seekRaf = p < 1 ? requestAnimationFrame(step) : null;
  };
  seekRaf = requestAnimationFrame(step);
}
window.__seek = f => seekToY(f * (document.documentElement.scrollHeight - innerHeight));
if (drScale){
  drScale.addEventListener("click", e => {
    const tick = e.target.closest(".dr-tick");
    if (tick && tick.__mark){ seekToY(markTargetY(tick.__mark)); return; }
    const r = drScale.getBoundingClientRect();
    seekToY(clamp((e.clientY - r.top) / r.height, 0, 1) * (document.documentElement.scrollHeight - innerHeight));
  });
  // hand control back the moment the user scrolls themselves
  addEventListener("wheel", cancelSeek, {passive:true});
  addEventListener("touchstart", cancelSeek, {passive:true});
  addEventListener("keydown", cancelSeek);
}
const diveBtn = $("#diveBtn");
// extra-slow entry dive so the plunge, splash and level-off all read clearly
if (diveBtn) diveBtn.addEventListener("click", () => seekToY(markTargetY(MARKS[1]), .55));

let smA = 0, smB = 0, smC = 0, lastNow = 0, flapAmp = 0;
let azLast = 0, azVel = 0, lastBob = 0;
let gPitch = 0, gY = 0, glideBB = null;

/* ---- sea bottom frame: DIVA orbits the Q&A boulders, beacon flashing ---- */
function seabedFrame(now, sc){
  if (robot.parent !== seaScene){
    seaScene.add(robot);
    robot.scale.setScalar(.62);
    seaLens.visible = true;
    // reassemble at full opacity (arriving from the faded final robot keyframe)
    for (const key in parts){
      const pt = parts[key];
      pt.g.position.copy(pt.base.p);
      pt.g.rotation.copy(pt.base.r);
      for (const m of pt.mats){
        const base = m.userData.baseOpacity !== undefined ? m.userData.baseOpacity : (m.userData.baseOpacity = m.opacity);
        m.opacity = base;
        m.visible = base > 0.015;
      }
    }
  }
  sizeRenderer2();
  // slow orbit around the letters
  const a = reduced ? 2.2 : now*0.00016;
  robot.position.set(Math.cos(a)*8.6, 2.0 + Math.sin(now*0.0008)*.35, Math.sin(a)*6.2 - .6);
  const dx = -Math.sin(a)*8.6, dz = Math.cos(a)*6.2;
  robot.rotation.set(.05*Math.sin(now*.0008 + 1), Math.atan2(-dx, -dz), reduced ? 0 : .12);
  // wings ripple while cruising
  flapAmp += ((reduced ? 0 : .13) - flapAmp)*.06;
  const om = now*0.0021;
  for (const r of RODS) r.pivot.rotation.z = r.sgn * (0.08 + flapAmp * Math.sin(om + r.ph));
  if (flapAmp > .004){
    for (const mesh of [finLMesh, finRMesh]){
      const pos = mesh.geometry.attributes.position;
      const base = mesh.geometry.userData.base;
      for (let i = 0; i < pos.count; i++){
        const x = base[i*3], y0 = base[i*3+1], z = base[i*3+2];
        const d = Math.max(0, Math.abs(x) - .92);
        const phz = 1.4 * clamp((z + .6)/1.2, 0, 1);
        pos.array[i*3+1] = y0 + flapAmp * Math.sin(om + phz) * d;
      }
      pos.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }
  }
  // survey headlight: steady on, sweeping the rocks as DIVA circles
  seaBeacon.intensity = 26;
  seaGlow.intensity = 2.8;
  seaLens.material.emissiveIntensity = 5;
  seaLens.material.opacity = 1;
  // kelp sway
  if (!reduced) for (const b of SWAY){
    b.rotation.x = b.userData.tx + Math.sin(now*.0011 + b.userData.ph)*.09;
    b.rotation.z = b.userData.tz + Math.cos(now*.0009 + b.userData.ph)*.07;
  }
  // camera settles toward the boulders as you reach the floor
  const el = (26 - sc*14)*Math.PI/180;
  const dist = (17.5 - sc*3.5) * clamp(.78 / camC.aspect, 1, 1.5);
  const az = (-.14 + sc*.3) + (reduced ? 0 : Math.sin(now*.00007)*.05);
  camC.position.set(Math.sin(az)*Math.cos(el)*dist, 2.2 + Math.sin(el)*dist, Math.cos(az)*Math.cos(el)*dist);
  camC.lookAt(0, 1.8, 0);
  robot.updateMatrixWorld();
  renderer2.render(seaScene, camC);
}
const EYEPHYS = [
  {x:0,   y:-.05, vx:0, vy:0, damp:.93, g:.0016},
  {x:.01, y:-.05, vx:0, vy:0, damp:.90, g:.0019},
];
function trackProgress(track){
  const r = track.getBoundingClientRect();
  return clamp(-r.top / (r.height - innerHeight), 0, 1);
}
function sizeRenderer(){
  if (!ok3d) return;
  const w = stageA.clientWidth, h = stageA.clientHeight;
  if (!w || !h) return;
  if (canvas3d.width !== Math.round(w*renderer.getPixelRatio())){
    renderer.setSize(w, h, false);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  }
}
addEventListener("resize", sizeRenderer);

function update(now, kOverride){
  if (innerHeight < 10) return;
  const dt = Math.min(.05, (now - lastNow)/1000 || .016); lastNow = now;
  let tA, tB, tC, total, seaNear = false;
  const doc = document.documentElement;
  if (FAKE !== null){
    const vy = FAKE * (doc.scrollHeight - innerHeight);
    tA = clamp((vy - robotTrack.offsetTop) / (robotTrack.offsetHeight - innerHeight), 0, 1);
    tB = clamp((vy - qnxTrack.offsetTop) / (qnxTrack.offsetHeight - innerHeight), 0, 1);
    tC = seaTrack ? clamp((vy - seaTrack.offsetTop) / (seaTrack.offsetHeight - innerHeight), 0, 1) : 0;
    seaNear = seaTrack ? vy + innerHeight > seaTrack.offsetTop - 40 : false;
    total = FAKE;
    stageA.style.position = "fixed"; stageB.style.position = "fixed";
    stageA.style.left = stageB.style.left = "0"; stageA.style.right = stageB.style.right = "0";
    stageA.style.top = stageB.style.top = "0";
    if (stageC){
      stageC.style.position = "fixed";
      stageC.style.left = stageC.style.right = "0"; stageC.style.top = "0";
      stageC.style.visibility = tC > 0 ? "visible" : "hidden";
    }
    stageB.style.visibility = (tC <= 0 && tB > 0) ? "visible" : "hidden";
    stageA.style.visibility = (tC <= 0 && tB <= 0) ? "visible" : "hidden";
  } else {
    tA = trackProgress(robotTrack);
    tB = trackProgress(qnxTrack);
    tC = seaTrack ? trackProgress(seaTrack) : 0;
    seaNear = seaTrack ? seaTrack.getBoundingClientRect().top < innerHeight + 40 : false;
    total = clamp(scrollY / (doc.scrollHeight - innerHeight), 0, 1);
  }
  const k = kOverride !== undefined ? kOverride : ((reduced || FAKE !== null) ? 1 : 0.11);
  smA += (tA - smA)*k; smB += (tB - smB)*k; smC += (tC - smC)*k;
  if (Math.abs(tA-smA) < 0.0004) smA = tA;
  if (Math.abs(tB-smB) < 0.0004) smB = tB;
  if (Math.abs(tC-smC) < 0.0004) smC = tC;

  depthNum.textContent = "−" + (total*MAXDEPTH).toFixed(1) + " m";
  drMarker.style.top = (total*100).toFixed(2) + "%";
  updateGaugeActive(total);
  root.style.setProperty("--surf", (1 - clamp(total*2.6, 0, 0.96)).toFixed(3));
  root.style.setProperty("--sky", (1 - sstep(smA/.05)).toFixed(3));

  /* ---- robot ---- */
  const seaOn = seaOK && (seaNear || tC > 0 || smC > 0.001);
  if (ok3d && seaOn){
    seabedFrame(now, smC);
  } else if (ok3d){
    if (robot.parent !== scene){
      scene.add(robot);            // climbing back up: return DIVA to the main scene
      robot.scale.setScalar(1);
      robot.position.set(0,0,0);
      robot.rotation.set(0,0,0);
      if (seaLens){ seaLens.visible = false; seaBeacon.intensity = 0; }
    }
    sizeRenderer();
    const P = paramsAt(smA);

    // camera orbit (the camera moves; the robot only idles in place)
    const az = (180 + P.az) * Math.PI/180;
    const el = P.el * Math.PI/180;
    const tgt = _v.set(P.tx, P.ty, P.tz);
    const dist = P.dist * clamp(.78 / camera.aspect, 1, 1.45);
    camera.position.set(
      tgt.x + dist * Math.cos(el) * Math.sin(az),
      tgt.y + dist * Math.sin(el),
      tgt.z + dist * Math.cos(el) * Math.cos(az)
    );
    camera.lookAt(tgt.x, tgt.y, tgt.z);

    // idle swim: gentle bob + slow yaw, damped as it explodes
    const idle = reduced ? 0 : (1 - P.e*0.75);
    // 02 · glide demo: DIVA rides the sawtooth in place — nose-down to dive-glide,
    // nose-up to climb — pitch and depth synced to the panel's path diagram
    const gw = reduced ? 0 : sstep((smA - .175)/.025) * (1 - sstep((smA - .29)/.025));
    let gPitchT = 0, gYT = 0;
    if (gw > 0.001){
      if (!glideBB) glideBB = glidePath.getBBox();
      const L = (now*0.05) % glideLen;
      const p1 = glidePath.getPointAtLength(L);
      const p2 = glidePath.getPointAtLength(Math.min(L + 6, glideLen));
      const ang = Math.atan2(p2.y - p1.y, Math.max(2, p2.x - p1.x));   // svg y-down: + = diving
      gPitchT = clamp(-ang*.55, -.5, .5) * gw;
      gYT = -((p1.y - (glideBB.y + glideBB.height/2)) / (glideBB.height/2)) * .55 * gw;
    }
    const gk = FAKE !== null ? 1 : .08;
    gPitch += (gPitchT - gPitch)*gk;
    gY += (gYT - gY)*gk;
    // surface start: DIVA waits out of frame above the water; once the dive begins
    // it plunges nose-first through the surface, then slowly levels off into 01
    const dropY = 1 - sstep((smA - .004)/.07);      // altitude: falling until ~smA .075
    const dropLvl = 1 - sstep((smA - .055)/.065);   // attitude: levels off later, into 01
    if (!reduced){
      if (!splashed && smA > .042 && smA < .3){ spawnSplash(); splashed = true; }
      else if (smA < .006) splashed = false;
    }
    robot.position.y = Math.sin(now*0.0009)*0.12*idle*(1 - gw*.8) + gY + dropY*9.5;
    robot.rotation.x = gPitch - dropLvl*.55;
    // plunge bubbles streaming up around the hull and wings
    const bw = reduced ? 0 : sstep((smA - .048)/.025) * (1 - sstep((smA - .125)/.04));
    if (bw > 0.001){
      if (!bubActive){ for (let i = 0; i < BUBN; i++) seedBubble(i, robot.position.y); bubActive = true; }
      for (let i = 0; i < BUBN; i++){
        bubArr[i*3+1] += bubVel[i]*(dt*60);
        bubArr[i*3] += Math.sin(now*.004 + bubPh[i])*.006;
        if (bubArr[i*3+1] > robot.position.y + 4.5) seedBubble(i, robot.position.y - .5);
      }
      bubGeo.attributes.position.needsUpdate = true;
      bubTrail.visible = true;
      bubMat.opacity = .7*bw;
    } else if (bubTrail.visible){ bubTrail.visible = false; bubActive = false; }
    robot.rotation.y = Math.sin(now*0.00023)*0.09*idle*(1 - gw*.75);
    robot.rotation.z = Math.sin(now*0.0007)*0.02*idle;


    // staged explode
    for (const key in parts){
      const pt = parts[key];
      const t = sstep((P.e - pt.win[0]) / (pt.win[1] - pt.win[0]));
      pt.g.position.set(
        pt.base.p.x + pt.exp.p.x*t,
        pt.base.p.y + pt.exp.p.y*t,
        pt.base.p.z + pt.exp.p.z*t
      );
      pt.g.rotation.set(
        pt.base.r.x + pt.exp.r.x*t,
        pt.base.r.y + pt.exp.r.y*t,
        pt.base.r.z + pt.exp.r.z*t
      );
      // alpha: focus dim × global op; screws also fade out once removed
      let alpha = (P.al[key] !== undefined ? P.al[key] : 1) * P.op;
      if (pt.spinFade) alpha *= (1 - sstep((t - .75)/.25));
      for (const m of pt.mats){
        const base = m.userData.baseOpacity !== undefined ? m.userData.baseOpacity :
          (m.userData.baseOpacity = m.opacity);
        m.opacity = base * alpha;
        m.visible = m.opacity > 0.015;
      }
    }

    // googly-eye physics: free pupils under gravity + shake, bouncing off the ring
    const azNow = P.az + robot.rotation.y*57;
    const dAz = azNow - azLast; azLast = azNow;
    azVel += (dAz - azVel)*0.3;
    const bobNow = robot.position.y;
    const bobVel = bobNow - lastBob; lastBob = bobNow;
    const fdt = clamp(dt*60, .5, 2);
    const pupils = [dorsalG.userData.pupilL, dorsalG.userData.pupilR];
    for (let ei = 0; ei < 2; ei++){
      const e = EYEPHYS[ei], pv = pupils[ei];
      if (!pv) continue;
      e.vx += (-azVel*0.006) * fdt;
      e.vy += (-e.g + bobVel*0.06) * fdt;
      e.vx *= Math.pow(e.damp, fdt); e.vy *= Math.pow(e.damp, fdt);
      e.x += e.vx*fdt; e.y += e.vy*fdt;
      const rr = Math.hypot(e.x, e.y), rMax = .058;
      if (rr > rMax){
        const nx = e.x/rr, ny = e.y/rr;
        e.x = nx*rMax; e.y = ny*rMax;
        const vn = e.vx*nx + e.vy*ny;
        if (vn > 0){ e.vx -= 1.55*vn*nx; e.vy -= 1.55*vn*ny; }
      }
      pv.position.set(e.x, e.y, 0);
    }
    // strobe pulse
    if (dorsalG.userData.strobe){
      const s = dorsalG.userData.strobe;
      s.material.emissiveIntensity = reduced ? 1.5 : (1 + Math.max(0, Math.sin(now*0.004))**8 * 4);
      s.material.opacity = parts.dorsal.mats[0].opacity;
    }
    // flapping: each servo rotates its rod; the silicone bends with them.
    // roots stay pinned, tips travel; phase lag front-to-rear = the manta's wave.
    const inS6 = smA > 0.705 && smA < 0.845;
    const ampT = reduced ? 0 : (inS6 ? .15 : .12*clamp(1 - P.e/0.3, 0, 1));
    flapAmp += (ampT - flapAmp)*.06;
    const om = now*0.0021;
    for (const r of RODS) r.pivot.rotation.z = r.sgn * (0.08 + flapAmp * Math.sin(om + r.ph));
    if (flapAmp > .004){
      for (const mesh of [finLMesh, finRMesh]){
        const pos = mesh.geometry.attributes.position;
        const base = mesh.geometry.userData.base;
        for (let i=0;i<pos.count;i++){
          const x = base[i*3], y0 = base[i*3+1], z = base[i*3+2];
          const d = Math.max(0, Math.abs(x) - .92);
          const phz = 1.4 * clamp((z + .6)/1.2, 0, 1);
          pos.array[i*3+1] = y0 + flapAmp * Math.sin(om + phz) * d;
        }
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      }
    }

    // ballast plunge in s5
    if (smA > 0.55 && smA < 0.76){
      const lt = clamp((smA - 0.59)/(0.715 - 0.59), 0, 1);
      const plun = reduced ? 0.5 : (Math.sin(lt*Math.PI*2 - Math.PI/2)+1)/2;   // 0..1..0
      const zPiston = 0.18 + (1-plun)*0.62;       // 0.18 (full) .. 0.80 (empty)
      const wLen = Math.max(0.02, 0.92 - zPiston);
      const w = balG.userData.water, pi = balG.userData.piston;
      pi.position.set(0,.05, zPiston);
      w.scale.y = wLen;
      w.position.set(0,.05, zPiston + wLen/2 + .01);
    }

    robot.updateMatrixWorld();
    window.__scene = scene; window.__cam = camera;
    renderer.render(scene, camera);
  }

  // scene switching + labels
  for (const [id, a, b] of SCN) if (smA >= a && smA < b) { setScene(id); break; }
  updateLeaders();

  // glide dot
  if (activeScene === "s2" && !reduced){
    const gp = glidePath.getPointAtLength(((now*0.05) % glideLen));
    glideDot.setAttribute("cx",gp.x); glideDot.setAttribute("cy",gp.y);
  }

  /* ---- QNX hud ---- */
  if (tB > 0 || smB > 0.001){
    const hry = reduced ? 0 : Math.sin(smB*Math.PI*2.2)*6;
    hud.style.transform = `rotateX(6deg) rotateY(${hry}deg)`;
    for (const [id, a, b] of QSCN) if (smB >= a && smB < b) { setQScene(id); break; }
    // the three diagrams run on their own clocks — self-looping demos, not scroll-scrubbed:
    // each cycle sweeps through in the first 80%, holds the finished state, then restarts
    const loopT = D => clamp(((now % D)/D)*1.25, 0, 1);
    if (reduced){ updatePipe(1); updateScheduler(1); updateIso(1); }
    else {
      updatePipe(loopT(7000));
      updateScheduler(loopT(8000));
      updateIso(loopT(10000));
    }
  }

  if (!reduced) drawSnow(now);
}
function frame(now){ update(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
// keep state in sync even when rAF is throttled (hidden tab, battery saver)
addEventListener("scroll", () => { if (document.hidden) update(performance.now(), 1); }, {passive:true});
// deep link: #p=0.42 scrolls to that fraction of the page; add &still to freeze transitions (for captures)
const hp = location.hash.match(/(?:^|[#&])p=([\d.]+)/);
if (hp && /(^|[#&])still\b/.test(location.hash)){
  const st = document.createElement("style");
  st.textContent = "*{transition-duration:0s !important;animation-play-state:paused !important}";
  (document.head || document.body).appendChild(st);
}
if (hp) setTimeout(() => {
  scrollTo(0, parseFloat(hp[1]) * (document.documentElement.scrollHeight - innerHeight));
  update(performance.now(), 1);
}, 80);
if (FAKE !== null){
  const st = document.createElement("style");
  st.textContent = "*{transition-duration:0s !important;animation-play-state:paused !important}";
  document.head ? document.head.appendChild(st) : document.body.appendChild(st);
  setTimeout(() => { update(performance.now(), 1); update(performance.now(), 1); }, 150);
}
