const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),root=path.resolve(__dirname,'..');
const elements={};
const document={querySelector:s=>elements[s]||(elements[s]={textContent:''}),
  createElement:()=>({width:256,height:256,getContext:()=>({fillRect(){},fillText(){}})})};
const ctx=vm.createContext({window:{THREE:require(path.join(root,'lib/three.min.js'))},
  document,console,matchMedia:()=>({matches:false}),location:{hash:''},assert});
vm.runInContext('const T=window.THREE;const scene=new T.Scene();',ctx);
for(const file of ['utils','materials','shapes','robot','cooling','component-focus']){
  vm.runInContext(fs.readFileSync(path.join(root,'src',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
}
vm.runInContext(`
  const expected={s5:['ballast'],cooling:['ballast','tray','cooler'],s4:['tray'],s6:['finL','finR','frame']};
  const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
  // Simulate effect updates before each chapter; material visibility cannot
  // resurrect geometry under a hidden system, even with shared materials.
  for(const chapter of ['s5','cooling','s4','s6','s4','cooling','s5']){
    coolingFX.visible=true;
    applyComponentFocus(chapter);
    assert.deepEqual(Object.keys(parts).filter(k=>parts[k].g.visible).sort(),expected[chapter].slice().sort());
    assert.equal(plumbingG.visible,chapter==='cooling');
    assert.equal(coolingFX.visible,chapter==='cooling');
    for(const [name,part] of Object.entries(parts)){
      if(expected[chapter].includes(name))continue;
      part.g.traverse(o=>{assert(!visible(o),chapter+' must hide every descendant of '+name);});
    }
    if(chapter==='cooling'){
      assert(trayG.children.some(o=>!o.visible),'unrelated electronics are hidden');
      for(const member of trayG.userData.coolingMembers)assert(visible(member),'Pi/support remains visible');
    }
    if(chapter==='s4')assert(trayG.children.every(o=>o.visible),'all electronics return');
  }
  for(const chapter of ['s3','s7','hero',null]){
    applyComponentFocus('cooling');applyComponentFocus(chapter);
    assert(Object.values(parts).every(p=>p.g.visible),'full robot returns for assembly / seabed');
    assert(trayG.children.every(o=>o.visible),'electronics children restored');
    assert(plumbingG.visible,'assembled plumbing restored');
  }
  const chapters=[['s3',.300,.445],['s5',.445,.555],['cooling',.555,.665],
    ['s4',.665,.775],['s6',.775,.880],['rejoin',.880,.945],['s7',.945,.975],['hand',.975,1.01]];
  for(const boundary of [.445,.555,.665,.775,.880]){
    const before=componentFocusAt(boundary-.012,chapters);
    const mid=componentFocusAt(boundary+.008,chapters);
    const after=componentFocusAt(boundary+.0281,chapters);
    for(const name of Object.keys(parts)){
      assert(mid.parts[name]>=0&&mid.parts[name]<=1);
      if(before.parts[name]!==after.parts[name]){
        assert(Math.abs(mid.parts[name]-.5)<1e-8,'halfway crossfade for '+name);
        const left=componentFocusAt(boundary-1e-7,chapters).parts[name];
        const right=componentFocusAt(boundary+1e-7,chapters).parts[name];
        assert(Math.abs(left-right)<.00002,'no chapter-boundary pop');
      }
    }
    applyComponentFocus(mid);
    assert(Object.values(parts).some(part=>part.g.visible));
    assert.deepEqual(componentFocusAt(boundary+.008,chapters),mid,'reverse scroll is deterministic');
  }
  for(const [chapter,p] of [['s5',.51],['cooling',.61],['s4',.72],['s6',.83]]){
    applyComponentFocus(componentFocusAt(p,chapters));
    assert.deepEqual(Object.keys(parts).filter(k=>parts[k].g.visible).sort(),expected[chapter].slice().sort(),
      'other systems are completely gone at the chapter focus');
  }
  // Separately attached fittings and tray details must fade, not pop or get
  // exponentially dimmer from repeated material updates at the same position.
  const crossing=componentFocusAt(.563,chapters);
  updateCooling(0,0,.25,.5);applyComponentFocus(crossing);
  const fitting=intakeG.children[0].material,firstOpacity=fitting.opacity;
  assert(firstOpacity>0&&firstOpacity<1,'metal fittings fade too');
  updateCooling(0,0,.25,.5);applyComponentFocus(crossing);
  assert.equal(fitting.opacity,firstOpacity,'no cumulative fading');
  const detail=detailFocusMaterials.keys().next().value;
  assert(detail.opacity>0&&detail.opacity<detailFocusMaterials.get(detail).opacity,'electronics details crossfade');
`,ctx);
console.log('Component fades passed: continuous chapter boundaries, reversible crossfades, isolated focus, fading fittings/details, full reassembly and seabed reset.');
