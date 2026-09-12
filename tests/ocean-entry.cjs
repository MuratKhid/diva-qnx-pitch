const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const THREE=require(path.join(root,'lib/three.min.js'));
for(const reducedMotion of [false,true]){
  const context=vm.createContext({assert,console,THREE,reducedMotion});
  vm.runInContext(`
    const T=THREE,scene=new T.Scene(),reduced=reducedMotion;
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    const sstep=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  `,context);
  vm.runInContext(fs.readFileSync(path.join(root,'src/ocean-entry.js'),'utf8'),context);
  vm.runInContext(`
    const at=t=>entryPose(t/ENTRY.clock+.004);
    const h=1e-5,c=ENTRY.contact;
    assert(Math.abs(at(c-h).y-at(c+h).y)<.001,'continuous impact position');
    const before=(at(c).y-at(c-h).y)/h,after=(at(c+h).y-at(c).y)/h;
    assert(Math.abs(before-after)<.002,'continuous impact velocity');
    let last=entryPose(0).y;
    for(let p=0;p<=.16;p+=.001){
      const pose=entryPose(p);
      assert(pose.y<=last+1e-9&&pose.y>=0,'descent is monotonic and bounded');
      assert(Number.isFinite(pose.pitch));last=pose.y;
      updateOceanEntry(p,2000);
      assert([...sprayMesh.instanceMatrix.array].every(Number.isFinite),'finite spray');
      assert([...crownPositions].every(Number.isFinite),'finite splash sheet');
      assert([...foamMesh.instanceMatrix.array].every(Number.isFinite),'finite foam');
    }
    assert(!entryOcean.visible,'ocean is culled after entry');
    assert(at(5).y<.001,'entry settles into existing glider motion');
    for(const p of spraySeeds){
      assert(p.hit>1&&p.hit<2,'spray follows hull contact');
      assert(p.vy>0&&p.radius>0);
    }
    updateOceanEntry(.05,2000);
    const snapshot=Array.from(sprayMesh.instanceMatrix.array);
    updateOceanEntry(.075,2000);updateOceanEntry(.05,2000);
    assert.deepEqual(Array.from(sprayMesh.instanceMatrix.array),snapshot,'reverse scroll is reproducible');
    if(reduced){
      assert(!sprayMesh.visible&&!splashCrown.visible&&!foamMesh.visible);
      assert.equal(oceanUniforms.uTime.value,0);
      assert.equal(oceanUniforms.uAge.value,-1);
    }else{
      assert(sprayMesh.visible&&splashCrown.visible,'splash exists during impact');
      assert(snapshot.some((v,i)=>i%16===0&&v!==0),'live droplets have volume');
    }
    assert.equal(oceanMaterial.depthWrite,true,'water occludes submerged rigid hull');
    entryTime(0,0);
    const first=entryTime(.05,16);
    const later=entryTime(.05,48);
    if(reduced)assert.equal(first,later);
    else assert(later>first,'momentum clock advances without scrolling');
    const firstPose=entryPose(.05,first),laterPose=entryPose(.05,later);
    if(!reduced){
      assert(laterPose.z<firstPose.z,'forward coast continues after release');
      assert(laterPose.y<firstPose.y,'downward inertia continues after release');
    }
    const rewind=entryTime(.025,64);
    assert(Math.abs(rewind-(.025-.004)*ENTRY.clock)<1e-9,'reverse scroll resets the impact');
    entryTime(0,80);assert.equal(entryPlayback.time,0,'surface replay resets');
  `,context);
}
console.log('Ocean entry passed: impact continuity, descent, momentum after scroll release, water depth, finite geometry, rewind/replay, culling and reduced motion.');
