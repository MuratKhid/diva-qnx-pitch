"use strict";
// Chapter ownership is enforced on scene-graph groups, not only materials:
// hiding a system also hides its fittings, labels, cameras, lights and rings.
const COMPONENT_SYSTEMS={
  s5:new Set(["ballast"]),
  cooling:new Set(["ballast","tray","cooler"]),
  s4:new Set(["tray"]),
  s6:new Set(["finL","finR","frame"])
};
function componentState(chapter){
  const system=COMPONENT_SYSTEMS[chapter];
  return {parts:Object.fromEntries(Object.keys(parts).map(name=>[name,!system||system.has(name)?1:0])),
    plumbing:!system||chapter==="cooling"?1:0,details:chapter==="cooling"?0:1,
    flow:chapter==="cooling"?1:0};
}
// A short anticipation before the chapter boundary and a longer fade inside
// it give the camera time to settle. Pure scroll-based weights also rewind.
function componentFocusAt(progress,chapters=SCN){
  let state=componentState(null);
  for(let i=1;i<chapters.length;i++){
    const [chapter,start]=chapters[i],previous=chapters[i-1][0];
    if(!COMPONENT_SYSTEMS[chapter]&&!COMPONENT_SYSTEMS[previous])continue;
    if(progress<start-.012)break;
    const t=sstep((progress-(start-.012))/.040),target=componentState(chapter);
    for(const name in state.parts)state.parts[name]=lerp(state.parts[name],target.parts[name],t);
    for(const key of ['plumbing','details','flow'])state[key]=lerp(state[key],target[key],t);
    if(t<1)break;
  }
  return state;
}
function focusMaterials(objects){
  const result=new Map();
  for(const object of objects)object.traverse(o=>{
    if(!o.material)return;
    for(const material of Array.isArray(o.material)?o.material:[o.material]){
      if(!result.has(material))result.set(material,{opacity:material.opacity,depthWrite:material.depthWrite});
    }
  });
  return result;
}
// Capture intrinsic opacity once, before any animation modifies materials.
const plumbingFocusMaterials=focusMaterials([plumbingG]);
const detailFocusMaterials=focusMaterials(trayG.children.filter(o=>!trayG.userData.coolingMembers.has(o)));
const componentLights=[];
for(const [name,part] of Object.entries(parts))part.g.traverse(o=>{
  if(o.isLight)componentLights.push({name,light:o,intensity:o.intensity});
});
function setFocusMaterial(material,base,alpha,opacity=base.opacity){
  material.opacity=opacity*alpha;
  material.visible=material.opacity>.001;
  if(!material.map)material.transparent=material.opacity<.995;
  material.depthWrite=base.depthWrite&&alpha>.98;
}
function applyComponentFocus(state,opacity=1){
  // Accept chapter names for a complete reset (including the seabed scene).
  if(typeof state!=="object"||state===null)state=componentState(state);
  for(const [name,part] of Object.entries(parts)){
    part.g.visible=state.parts[name]>.001;
  }
  for(const {name,light,intensity} of componentLights)light.intensity=intensity*state.parts[name];
  // Plumbing is attached directly to the robot, outside the exploded parts.
  plumbingG.visible=state.plumbing>.001;
  for(const [material,base] of plumbingFocusMaterials){
    const dynamic=material===hoseWall||material===hoseWater;
    setFocusMaterial(material,base,state.plumbing*opacity,dynamic?material.opacity:base.opacity);
  }
  coolingFX.visible=coolingFX.visible&&state.flow>.001;
  flowMat.opacity*=state.flow;
  heatMat.opacity*=state.flow;
  // The cooling demonstration needs the Pi and its support, not the battery,
  // IMU, power converters and unrelated wiring from the electronics chapter.
  for(const child of trayG.children){
    child.visible=state.details>.001||trayG.userData.coolingMembers.has(child);
  }
  for(const [material,base] of detailFocusMaterials){
    setFocusMaterial(material,base,state.parts.tray*state.details*opacity);
  }
}
