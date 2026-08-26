"use strict";
/* ================= materials ================= */
const M = (color, rough, metal, o) => new T.MeshStandardMaterial(Object.assign(
  {color, roughness: rough, metalness: metal, transparent: true}, o || {}));
const P = (color, rough, metal, o) => new T.MeshPhysicalMaterial(Object.assign(
  {color, roughness: rough, metalness: metal, transparent: true}, o || {}));
// dorsal: polished anodized alloy — deep navy tint, lacquer clearcoat over metal
const matHull   = () => P(0x243352, .3, .92, {envMapIntensity:1.1, side:T.DoubleSide, clearcoat:.8, clearcoatRoughness:.22});
// ventral: brushed marine-grade aluminum
const matHullV  = () => P(0xbcc6d1, .46, .92, {envMapIntensity:.85, side:T.DoubleSide, clearcoat:.12, clearcoatRoughness:.5});
const matFin    = () => M(0xdfeaf4, .28, .05, {opacity:.62, side:T.DoubleSide, envMapIntensity:.9, depthWrite:false});
const matMetal  = () => M(0xc4d2dd, .28, .85, {envMapIntensity:1.1});
const matDark   = () => M(0x1a2430, .5, .55, {envMapIntensity:.6});
const matYellow = () => M(0xe3bc3f, .4, .35);
const matGreen  = () => M(0x5e9e44, .45, .1);
const matPink   = () => M(0xd77f9e, .5, .05);
const matOrange = () => M(0xe07b39, .5, .08);
const matBlue   = () => M(0x3d6bc6, .42, .15);
const matPurple = () => M(0x6a55b0, .45, .1);
const matWhite  = () => M(0xf2f6fa, .3, 0);
const matBlack  = () => M(0x0b0c1a, .35, .2);
const matGlassD = () => M(0x2a2560, .08, .3, {opacity:.85, envMapIntensity:1.6});
const matGlassG = () => M(0xbde696, .06, .05, {opacity:.24, side:T.DoubleSide, envMapIntensity:1.4, depthWrite:false});
const matWater  = () => M(0x54c0e8, .15, 0, {opacity:.55, envMapIntensity:.8, depthWrite:false});

