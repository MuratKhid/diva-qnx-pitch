"use strict";
/* Real-time, reduced-order water entry: deep-water dispersion, free fall,
   drag-limited immersion, ballistic spray and gravity-driven splash sheets.
   Model units are visual metres, not a validated hydrodynamics/CFD solver.
   Entry time is scroll-scrubbed; ambient waves use wall time. */
const ENTRY = {waterY:2.4, height:9.5, gravity:9.81, contact:1.10, clock:32};
function entryPose(progress,simulationTime){
  const time=simulationTime===undefined?Math.max(0,(progress-.004)*ENTRY.clock):simulationTime;
  const hit=ENTRY.contact, speed=ENTRY.gravity*hit;
  const contactY=ENTRY.height-.5*ENTRY.gravity*hit*hit;
  const drag=speed/contactY;
  const y=time<hit ? ENTRY.height-.5*ENTRY.gravity*time*time
    : contactY*Math.exp(-drag*(time-hit));
  const age=Math.max(0,time-hit);
  // An underdamped pitch response: nose brakes, tail follows, then a small
  // overshoot settles. Forward momentum is lost to drag, not stopped at impact.
  const pitch=-.55*Math.exp(-age*1.7)*(Math.cos(age*3.2)+1.7/3.2*Math.sin(age*3.2));
  const z=-1.9*(1-Math.exp(-age*.70))**2;
  const roll=.065*Math.sin(age*4.2)*Math.exp(-age*1.35);
  return {time,y,pitch,z,roll};
}
const entryPlayback={progress:0,time:0,now:null};
function entryTime(progress,now){
  const target=Math.max(0,(progress-.004)*ENTRY.clock);
  const dt=entryPlayback.now===null?0:clamp((now-entryPlayback.now)/1000,0,.05);
  const reversing=progress<entryPlayback.progress-.000015;
  if(reduced||progress<.006||reversing||target<ENTRY.contact)entryPlayback.time=target;
  else entryPlayback.time=Math.max(target,entryPlayback.time+dt);
  entryPlayback.progress=progress;entryPlayback.now=now;
  return entryPlayback.time;
}
const entryOcean=new T.Group();
scene.add(entryOcean);
const oceanUniforms={uTime:{value:0},uAge:{value:-1},uFade:{value:1}};
const oceanMaterial=new T.ShaderMaterial({
  uniforms:oceanUniforms,transparent:true,depthWrite:true,side:T.DoubleSide,
  vertexShader:`
    uniform float uTime,uAge;
    varying vec3 vWorld,vNormal;
    varying float vRing;
    float swell(vec2 p){
      // omega = sqrt(g*k): longer swells travel faster than short chop.
      return .12*sin(dot(p,vec2(.85,.35))-3.003*uTime)
        +.075*sin(dot(p,vec2(-.45,1.5))-3.920*uTime+1.7)
        +.034*sin(dot(p,vec2(2.8,.9))-5.371*uTime)
        +.016*sin(dot(p,vec2(-4.2,3.7))-7.410*uTime);
    }
    float ring(vec2 p){
      float r=length(p*vec2(.72,1.));
      float age=max(uAge,0.);
      float front=r-2.7*age;
      return step(0.,uAge)*sin(front*7.)*exp(-front*front/1.8)
        *.20*exp(-age*.68)*(1.-exp(-age*9.));
    }
    float height(vec2 p){
      float age=max(0.,uAge);
      float cavity=-.34*exp(-dot(p*vec2(.55,.85),p*vec2(.55,.85)))
        *sin(min(age*4.5,3.14159))*exp(-age*.7)*step(0.,uAge);
      return swell(p)+ring(p)+cavity;
    }
    void main(){
      vec2 p=position.xz;
      float h=height(p),e=.045;
      vNormal=normalize(vec3(height(p-vec2(e,0.))-height(p+vec2(e,0.)),2.*e,
        height(p-vec2(0.,e))-height(p+vec2(0.,e))));
      vRing=ring(p);
      vec4 world=modelMatrix*vec4(p.x,position.y+h,p.y,1.);
      vWorld=world.xyz;
      gl_Position=projectionMatrix*viewMatrix*world;
    }`,
  fragmentShader:`
    uniform float uFade,uTime,uAge;
    varying vec3 vWorld,vNormal;
    varying float vRing;
    void main(){
      vec3 detail=vec3(.05*sin(vWorld.x*11.-uTime*4.+sin(vWorld.z*7.)),0.,
        .04*cos(vWorld.z*13.-uTime*3.+sin(vWorld.x*9.)));
      vec3 n=normalize(vNormal+detail)*(gl_FrontFacing?1.:-1.);
      vec3 eye=normalize(cameraPosition-vWorld);
      float fresnel=.025+.975*pow(1.-max(dot(n,eye),0.),5.);
      vec3 reflected=reflect(-eye,n);
      float sky=clamp(reflected.y*.6+.4,0.,1.);
      vec3 reflection=mix(vec3(.025,.10,.15),vec3(.24,.43,.51),sky);
      vec3 water=mix(vec3(.006,.055,.085),reflection,fresnel*.65+.10);
      vec3 sun=normalize(vec3(-.5,.65,-.6));
      float glint=pow(max(dot(reflected,sun),0.),180.);
      water+=vec3(1.,.94,.79)*glint*.85;
      float foam=smoothstep(.085,.19,abs(vRing));
      float grain=.65+.35*sin(vWorld.x*27.+sin(vWorld.z*19.));
      water=mix(water,vec3(.77,.91,.92),foam*grain*.7);
      if(!gl_FrontFacing)water=mix(vec3(.04,.28,.36),water,.4);
      float distanceFade=1.-smoothstep(28.,70.,distance(cameraPosition,vWorld));
      gl_FragColor=vec4(water,uFade*distanceFade);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`
});
const oceanGeo=new T.PlaneGeometry(150,150,192,192);
oceanGeo.rotateX(-Math.PI/2);
// Concentrate vertices around DIVA; the distant horizon needs less geometry.
const oceanPositions=oceanGeo.attributes.position;
for(let i=0;i<oceanPositions.count;i++){
  for(const axis of [0,2]){
    const v=oceanPositions.array[i*3+axis]/75;
    oceanPositions.array[i*3+axis]=Math.sign(v)*Math.pow(Math.abs(v),1.65)*75;
  }
}
const oceanSurface=new T.Mesh(oceanGeo,oceanMaterial);
oceanSurface.renderOrder=-2;
oceanSurface.position.y=ENTRY.waterY;
oceanSurface.frustumCulled=false;
entryOcean.add(oceanSurface);

// Fixed seed and analytic trajectories make reverse scrolling deterministic.
let entrySeed=941;
const entryRandom=()=>((entrySeed=entrySeed*48271%2147483647)/2147483647);
const sprayCount=620;
const sprayMaterial=new T.MeshStandardMaterial({color:0xc5ecf3,roughness:.16,
  metalness:.12,transparent:true,opacity:.82,depthWrite:false,envMapIntensity:1.8});
const sprayMesh=new T.InstancedMesh(new T.SphereGeometry(1,8,6),sprayMaterial,sprayCount);
sprayMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
sprayMesh.frustumCulled=false;
sprayMesh.renderOrder=2;
entryOcean.add(sprayMesh);
const sprayTransform=new T.Object3D();
const sprayUp=new T.Vector3(0,1,0),sprayVelocity=new T.Vector3();
const spraySeeds=Array.from({length:sprayCount},()=>{
  const angle=entryRandom()*Math.PI*2;
  // Broad lateral wing slaps, narrower bow/tail jets, rather than a fountain.
  const wing=entryRandom()<.64;
  const x=wing?(entryRandom()<.5?-1:1)*(1.4+entryRandom()*2.15):Math.cos(angle)*1.15;
  const z=wing?-.85+entryRandom()*1.35:Math.sin(angle)*2.05;
  // Find when this part of the pitched hull crosses the mean water plane.
  let lo=.8,hi=2.5;
  for(let i=0;i<24;i++){
    const mid=(lo+hi)/2,pose=entryPose(mid/ENTRY.clock+.004);
    if(pose.y-Math.sin(pose.pitch)*z>ENTRY.waterY)lo=mid;else hi=mid;
  }
  const hit=(lo+hi)/2;
  const pose=entryPose(hit/ENTRY.clock+.004);
  const speed=Math.max(1,(entryPose((hit-.005)/ENTRY.clock+.004).y-pose.y)/.005);
  const kick=Math.sqrt(speed)*(.75+entryRandom()*.95);
  const fan=wing?Math.sign(x):Math.cos(angle);
  return {x,z:z*Math.cos(pose.pitch)+pose.z,hit:hit+entryRandom()*.09,
    vx:fan*kick*(wing?1.3:.65),vz:Math.sin(angle)*kick*.55-.35,
    vy:.8+kick*(.45+entryRandom()*.85),radius:.008+entryRandom()**2*.031};
});

// A thin, scalloped water sheet rises along the displaced hull perimeter.
const crownSegments=96,crownRows=6;
const crownGeo=new T.BufferGeometry();
const crownPositions=new Float32Array((crownSegments+1)*crownRows*3);
const crownIndices=[];
for(let j=0;j<crownRows-1;j++)for(let i=0;i<crownSegments;i++){
  const a=j*(crownSegments+1)+i,b=a+crownSegments+1;
  crownIndices.push(a,b,a+1,a+1,b,b+1);
}
crownGeo.setAttribute('position',new T.BufferAttribute(crownPositions,3));
crownGeo.setIndex(crownIndices);
const crownMaterial=new T.MeshStandardMaterial({color:0xaddfe8,roughness:.20,
  metalness:.12,transparent:true,opacity:.45,side:T.DoubleSide,depthWrite:false});
const splashCrown=new T.Mesh(crownGeo,crownMaterial);
splashCrown.frustumCulled=false;
entryOcean.add(splashCrown);

// Broken aerated patches linger where the displaced water falls back, not a
// perfect white ring. Low ellipsoids remain actual 3D geometry on the surface.
const foamMaterial=new T.MeshBasicMaterial({color:0xc9e8eb,transparent:true,opacity:.6,depthWrite:false});
const foamMesh=new T.InstancedMesh(new T.SphereGeometry(1,6,4),foamMaterial,120);
foamMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);foamMesh.frustumCulled=false;
foamMesh.renderOrder=1;entryOcean.add(foamMesh);

function updateOceanEntry(progress,now,simulationTime){
  const pose=entryPose(progress,simulationTime);
  entryOcean.visible=progress<.155;
  if(!entryOcean.visible)return;
  // After immersion, the presentation's frame follows the glider downward:
  // the surface recedes overhead instead of intersecting later camera orbits.
  entryOcean.position.y=5*sstep((pose.time-1.43)/1.15);
  const fade=1-sstep((progress-.092)/.06);
  const age=pose.time-1.23;
  oceanUniforms.uTime.value=reduced?0:now*.001;
  oceanUniforms.uAge.value=reduced?-1:age;
  oceanUniforms.uFade.value=fade;
  oceanMaterial.depthWrite=fade>.995;
  foamMesh.visible=!reduced&&age>.05&&age<2.7;
  if(foamMesh.visible){
    for(let i=0;i<120;i++){
      const p=spraySeeds[i],t=pose.time-p.hit-.15;
      const r=t>0?(.045+p.radius*2)*(1-sstep((t-1.1)/1.3))*sstep(t/.12):0;
      const travel=(1-Math.exp(-Math.max(0,t)*.7))*.8;
      sprayTransform.position.set(p.x+p.vx*travel,ENTRY.waterY+.04+Math.sin(i*1.7+pose.time*2)*.022,p.z+p.vz*travel);
      sprayTransform.rotation.set(0,i*2.4,0);
      sprayTransform.scale.set(r*1.7,r*.22,r);
      sprayTransform.updateMatrix();foamMesh.setMatrixAt(i,sprayTransform.matrix);
    }
    foamMesh.instanceMatrix.needsUpdate=true;foamMaterial.opacity=.62*fade;
  }
  sprayMesh.visible=!reduced&&age>-.15&&age<2.4;
  if(sprayMesh.visible){
    spraySeeds.forEach((p,i)=>{
      const t=pose.time-p.hit,drag=.65;
      const travel=(1-Math.exp(-drag*Math.max(0,t)))/drag;
      const y=ENTRY.waterY+p.vy*t-.5*ENTRY.gravity*t*t;
      const alive=t>0&&y>=ENTRY.waterY-.03;
      sprayTransform.position.set(p.x+p.vx*travel,y,p.z+p.vz*travel);
      sprayVelocity.set(p.vx*Math.exp(-drag*t),p.vy-ENTRY.gravity*t,p.vz*Math.exp(-drag*t));
      sprayTransform.quaternion.setFromUnitVectors(sprayUp,sprayVelocity.normalize());
      const r=alive?p.radius:0;
      sprayTransform.scale.set(r,r*(1+Math.min(2,Math.abs(p.vy-ENTRY.gravity*t)*.16)),r);
      sprayTransform.updateMatrix();
      sprayMesh.setMatrixAt(i,sprayTransform.matrix);
    });
    sprayMesh.instanceMatrix.needsUpdate=true;
    sprayMaterial.opacity=.82*fade;
  }
  splashCrown.visible=!reduced&&age>0&&age<.9;
  if(splashCrown.visible){
    for(let j=0;j<crownRows;j++)for(let i=0;i<=crownSegments;i++){
      const a=i/crownSegments*Math.PI*2,s=j/(crownRows-1);
      // Each patch lifts when that hull section hits. The wing sheets fan out
      // lower and wider; the bow throws a taller, ragged leading splash.
      const localAge=Math.max(0,age-.10*Math.sin(a)-.045*Math.cos(a*3));
      const scallop=1+.24*Math.sin(a*11)+.15*Math.cos(a*17);
      const rise=Math.max(0,(3.5-.7*Math.cos(a*2))*localAge-.5*ENTRY.gravity*localAge*localAge)*scallop;
      const r=1+localAge*1.65+s*(.22+localAge*.48);
      const k=(j*(crownSegments+1)+i)*3;
      crownPositions[k]=Math.cos(a)*r*(1.65+.5*Math.abs(Math.cos(a)));
      crownPositions[k+1]=ENTRY.waterY+.025+Math.sin(s*Math.PI/2)*rise;
      crownPositions[k+2]=Math.sin(a)*r*1.25-.25*localAge;
    }
    crownGeo.attributes.position.needsUpdate=true;
    crownGeo.computeVertexNormals();
    crownMaterial.opacity=.4*(1-sstep((age-.45)/.4))*fade;
  }
}
