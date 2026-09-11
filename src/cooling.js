"use strict";
/* Shared ballast / cooling plumbing, attached to the actual robot assemblies.
   All paths are in robot-local space, so they stay connected through the explode. */
const coolerG = new T.Group();
coolerG.position.set(-.10, .10, -.85);
const copperBase = box(.62,.065,.58, M(0xba7846,.26,.75));
const coolerBody = box(.59,.10,.55, matDark());
coolerBody.position.y = .065;
const coolerLid = box(.55,.018,.51, M(0xb0d9e5,.14,.15,{opacity:.34,depthWrite:false}));
coolerLid.position.y = .13;
coolerG.add(copperBase, coolerBody, coolerLid);
// A cutaway reveals the coolant passage above the copper contact plate.
const channelCurve = new T.CatmullRomCurve3([
  [-.25,.14,-.19],[-.17,.14,-.19],[-.17,.14,.16],[-.055,.14,.16],
  [-.055,.14,-.16],[.065,.14,-.16],[.065,.14,.16],[.19,.14,.16],[.25,.14,.19]
].map(p=>new T.Vector3(...p)),false,"catmullrom",.12);
const channelMat = M(0x64cde7,.16,.18,{emissive:0x236d93,emissiveIntensity:.8});
coolerG.add(new T.Mesh(new T.TubeGeometry(channelCurve,64,.022,8,false),channelMat));
for (const x of [-.25,.25]) for (const z of [-.23,.23]){
  const bolt=cyl(.022,.022,.025,matMetal(),12);
  bolt.position.set(x,.15,z);coolerG.add(bolt);
}
const coolingPorts=[new T.Vector3(-.31,.14,-.19),new T.Vector3(.31,.14,.19)];
for (const point of coolingPorts){
  const fitting=cyl(.032,.032,.16,matMetal());
  fitting.rotation.z=Math.PI/2;fitting.position.copy(point);coolerG.add(fitting);
  for (const offset of [-.035,.015,.055]){
    const barb=new T.Mesh(new T.TorusGeometry(.032,.005,8,16),matMetal());
    barb.rotation.y=Math.PI/2;barb.position.copy(point);barb.position.x+=Math.sign(point.x)*offset;coolerG.add(barb);
  }
}
addPart("cooler",coolerG,[.5,.85],new T.Vector3(0,-.5,-.25),new T.Vector3());
ANCH.coolingRadiator={obj:coolerG,local:new T.Vector3(0,.16,0)};
ANCH.coolingReservoir={obj:balG,local:new T.Vector3(0,.26,.55)};

const plumbingG=new T.Group();
robot.add(plumbingG);
const intakeG=new T.Group();
plumbingG.add(intakeG);
// Open tube end and hull bulkhead: the ocean-facing end remains visibly open.
const inletMouth=new T.Mesh(new T.TorusGeometry(.039,.009,10,24),matMetal());
inletMouth.rotation.y=Math.PI/2;intakeG.add(inletMouth);
const inletBore=cyl(.030,.030,.045,M(0x03101c,.6,0),24);
inletBore.rotation.z=Math.PI/2;intakeG.add(inletBore);
const sealG=new T.Group();plumbingG.add(sealG);
const gland=cyl(.065,.065,.07,matMetal(),24);gland.rotation.z=Math.PI/2;
const gasket=new T.Mesh(new T.TorusGeometry(.065,.012,10,24),matDark());gasket.rotation.y=Math.PI/2;
sealG.add(gland,gasket);
ANCH.coolingIntake={obj:intakeG,local:new T.Vector3()};

const hoseWall=M(0xcde9f0,.22,.02,{opacity:.30,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.1});
const hoseWater=M(0x45bfe3,.17,.05,{opacity:.37,depthWrite:false,emissive:0x125571,emissiveIntensity:.5});
const dummyCurve=new T.LineCurve3(new T.Vector3(),new T.Vector3(0,0,1));
const HOSE_OUTER_RADIUS=.035,HOSE_INNER_RADIUS=.025;
const coolingHoses=Array.from({length:2},()=>{
  const wall=new T.Mesh(new T.TubeGeometry(dummyCurve,48,HOSE_OUTER_RADIUS,10,false),hoseWall);
  const water=new T.Mesh(new T.TubeGeometry(dummyCurve,48,HOSE_INNER_RADIUS,8,false),hoseWater);
  wall.renderOrder=4;water.renderOrder=3;wall.castShadow=false;
  plumbingG.add(wall,water);
  return {wall,water,curve:dummyCurve};
});
const coolingFX=new T.Group();robot.add(coolingFX);
const flowMat=new T.MeshBasicMaterial({color:0xa1efff,transparent:true,depthWrite:false});
const flowGeo=new T.SphereGeometry(.019,10,8);
const flowDots=Array.from({length:30},()=>{
  const dot=new T.Mesh(flowGeo,flowMat);dot.renderOrder=5;coolingFX.add(dot);return dot;
});
const flowArrows=Array.from({length:4},()=>{
  const arrow=new T.Mesh(new T.ConeGeometry(.030,.095,12),flowMat);
  arrow.renderOrder=5;coolingFX.add(arrow);return arrow;
});
const heatG=new T.Group();coolerG.add(heatG);
const heatMat=new T.MeshBasicMaterial({color:0xffb454,transparent:true,depthWrite:false});
for(const x of [-.16,0,.16]){
  const stem=cyl(.011,.011,.24,heatMat,8);stem.position.set(x,-.27,-.23);
  const tip=new T.Mesh(new T.ConeGeometry(.034,.085,10),heatMat);tip.position.set(x,-.11,-.23);
  heatG.add(stem,tip);
}
const coolingV=new T.Vector3(),coolingUp=new T.Vector3(0,1,0),coolingInverse=new T.Matrix4();
let lastPlumbingShape="",lastCoolingPhase="";
function coolingPoint(obj,point){
  return point.clone().applyMatrix4(obj.matrixWorld).applyMatrix4(coolingInverse);
}
function updateCooling(explode,spread,progress,focus){
  coolingInverse.copy(robot.matrixWorld).invert();
  const shapeKey=[explode,spread].map(v=>v.toFixed(4)).join(":");
  if(shapeKey!==lastPlumbingShape){
    lastPlumbingShape=shapeKey;
    const inlet=new T.Vector3(-1.43-spread*.55,-.30-explode*.35,.85);
    const seal=new T.Vector3(-1.13-spread*.32,-.30-explode*.35,.85);
    intakeG.position.copy(inlet);sealG.position.copy(seal);
    const a=coolingPoint(coolerG,coolingPorts[0]);a.x-=.08;
    const b=coolingPoint(coolerG,coolingPorts[1]);b.x+=.08;
    const reservoir=coolingPoint(balG,new T.Vector3(0,-.28,1.04));
    // Follow the tray perimeter instead of looping out around the assemblies.
    // Short straight sections meet the barbs axially; the reservoir is entered
    // from below, along the axis of its existing downward-facing port.
    const leftRail=coolingPoint(trayG,new T.Vector3(-.91,.36,.50));
    const rightRail=coolingPoint(trayG,new T.Vector3(.91,.36,.75));
    leftRail.y+=spread*.50;rightRail.y+=spread*.50;
    const route1=[inlet,seal,leftRail,
      new T.Vector3(leftRail.x,a.y,a.z),
      new T.Vector3(a.x-.12,a.y,a.z),a];
    const reservoirSide=reservoir.x+.36;
    const route2=[b,new T.Vector3(b.x+.12,b.y,b.z),
      new T.Vector3(rightRail.x,b.y,b.z),rightRail,
      new T.Vector3(Math.max(rightRail.x,reservoirSide),reservoir.y+.12,reservoir.z-.80),
      new T.Vector3(reservoirSide,reservoir.y-.18,reservoir.z-.20),
      new T.Vector3(reservoir.x,reservoir.y-.18,reservoir.z),reservoir];
    [route1,route2].forEach((points,i)=>{
      const h=coolingHoses[i];h.curve=new T.CatmullRomCurve3(points,false,"centripetal");
      for(const [mesh,radius,sides] of [[h.wall,HOSE_OUTER_RADIUS,10],[h.water,HOSE_INNER_RADIUS,8]]){
        mesh.geometry.dispose();mesh.geometry=new T.TubeGeometry(h.curve,48,radius,sides,false);
      }
    });
  }
  // One full intake / discharge cycle is scrubbed by the cooling chapter.
  const stroke=(1-Math.cos(progress*Math.PI*2))/2;
  const filling=progress<.5;
  coolingFX.visible=focus>.04;
  heatG.visible=focus>.04;
  flowMat.opacity=focus;
  heatMat.opacity=focus*.9;
  hoseWall.opacity=.08+focus*.36;
  hoseWater.opacity=.08+focus*.40;
  for(let i=0;i<24;i++){
    const hose=coolingHoses[i<12?0:1];
    const fraction=((i%12)/12+stroke*1.8)%1;
    flowDots[i].position.copy(hose.curve.getPointAt(fraction));
  }
  for(let i=24;i<flowDots.length;i++){
    const fraction=((i-24)/6+stroke*1.8)%1;
    flowDots[i].position.copy(coolingPoint(coolerG,channelCurve.getPointAt(fraction)));
    flowDots[i].scale.setScalar(.55);
  }
  flowArrows.forEach((arrow,i)=>{
    const hose=coolingHoses[i<2?0:1],t=i%2?.72:.30;
    arrow.position.copy(hose.curve.getPointAt(t));
    coolingV.copy(hose.curve.getTangentAt(t)).multiplyScalar(filling?1:-1);
    arrow.quaternion.setFromUnitVectors(coolingUp,coolingV);
  });
  const phase=filling?"fill":"empty";
  if(phase!==lastCoolingPhase){
    lastCoolingPhase=phase;
    $("#cooling-flow-title").textContent=filling?"Fill · dive":"Empty · climb";
    $("#cooling-flow-note").textContent=filling?"Outside water → radiator → reservoir":"Reservoir → radiator → outside water";
  }
  return stroke;
}
