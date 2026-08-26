"use strict";
const $ = s => document.querySelector(s);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a + (b-a)*t;
const ease = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
const sstep = t => { t = clamp(t,0,1); return t*t*(3-2*t); };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fkm = location.hash.match(/fake=([\d.]+)/);
const FAKE = fkm ? parseFloat(fkm[1]) : null;

