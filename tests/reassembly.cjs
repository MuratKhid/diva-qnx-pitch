const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),root=path.resolve(__dirname,'..');
const ctx=vm.createContext({document:{},matchMedia:()=>({matches:false}),location:{hash:''},assert});
for(const file of ['utils','keyframes']){
  vm.runInContext(fs.readFileSync(path.join(root,'src',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
}
// Read the production chapter boundaries and navigation targets without
// booting the DOM/render loop, so this catches timing/section mismatches.
vm.runInContext(fs.readFileSync(path.join(root,'src/scenes-labels.js'),'utf8').split('const panelMap')[0],ctx);
const marks=fs.readFileSync(path.join(root,'src/main.js'),'utf8').match(/const MARKS = \[[\s\S]*?\n\];/)[0];
vm.runInContext(marks,ctx);
vm.runInContext(`
  const section=SCN.find(([name])=>name==='s7');
  const target=MARKS.find(({name})=>name==='REASSEMBLY').t;
  assert(target>section[1]&&target<section[2],'navigation lands inside the summary');
  assert.equal(paramsAt(target).e,0,'navigation shows a fully assembled robot');
  for(let p=section[1];p<section[2];p+=.0001){
    assert.equal(paramsAt(p).e,0,'DIVA is assembled throughout the summary');
    assert.equal(paramsAt(p).cool,0,'no remaining cooling demonstration offset');
    assert.equal(paramsAt(p).op,.6,'summary preserves transparency');
  }
  assert.equal(paramsAt(.880).e,.8,'preserve the wings exit pose');
  assert(paramsAt(.915).e>.3,'reassembly is still clearly in progress at the old endpoint');
  assert.equal(paramsAt(.945).e,0,'finish before handoff');
  assert.equal(paramsAt(.950).e,0);
  let previous=paramsAt(.880);
  for(let i=1;i<=650;i++){
    const p=.880+i*.0001,current=paramsAt(p);
    assert(current.e<=previous.e+1e-12,'parts close monotonically');
    assert(current.op<=previous.op+1e-12,'opacity never flashes back to solid');
    assert(current.op>=.6-1e-12);
    assert.deepEqual(paramsAt(p),current,'reverse scrolling is deterministic');
    previous=current;
  }
  for(const p of [.908,.915,.930,.945,.960,.975]){
    assert(Math.abs(paramsAt(p).op-.6)<1e-12,'hold a translucent assembled view');
  }
  for(const p of [.880,.908,.945,.975]){
    const a=paramsAt(p-1e-7),b=paramsAt(p+1e-7);
    for(const key of ['e','op','az','el','dist','ty'])
      assert(Math.abs(a[key]-b[key])<.001,'continuous '+key+' at '+p);
  }
  for(const p of [.880,.945]){
    const speed=Math.abs(paramsAt(p+1e-6).e-paramsAt(p-1e-6).e)/2e-6;
    assert(speed<.001,'closing motion eases gently to rest');
  }
  assert(Math.abs(paramsAt(1).op-.22)<1e-12,'preserve final handoff fade');
`,ctx);
console.log('Reassembly passed: extended closing, smooth endpoints, reversible motion, translucent hold and continuous handoff.');
