const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');
function core() {
  const context=vm.createContext({self:{},performance,Math});
  for(const file of ['slime-project.js','engine.js','patterns.js']) vm.runInContext(fs.readFileSync('playground/life/'+file,'utf8'),context);
  return {...context.self.AutomataCore,patterns:context.self.LifePatterns};
}
const {Automata,parseRule,parseRLE,line,patterns}=core();
function live(engine) {
  const points=[];
  engine.grid.forEach((value,i)=>{if(value) points.push([i%engine.width,Math.floor(i/engine.width)]);});
  return points;
}
function place(engine,pattern,x,y) { for(const [dx,dy] of pattern.cells) engine.paint(x+dx,y+dy,1); }
test('Life blinker has period two and reuses its buffers',()=>{
  const e=new Automata({width:20,height:20}),a=e.grid,b=e.next;
  place(e,patterns.blinker,8,9);
  e.step(); assert.deepEqual(live(e),[[9,8],[9,9],[9,10]]);
  e.step(); assert.deepEqual(live(e),[[8,9],[9,9],[10,9]]);
  assert.equal(e.grid,a); assert.equal(e.next,b);
});
test('a glider translates by one cell after four generations',()=>{
  const e=new Automata({width:20,height:20});
  place(e,patterns.glider,5,5); e.step(4);
  const expected=patterns.glider.cells.map(([x,y])=>[x+6,y+6]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
  assert.deepEqual(live(e),Array.from(expected,p=>Array.from(p)));
});
test('wrapped and finite boundaries behave differently',()=>{
  const wrap=new Automata({width:8,height:8}),finite=new Automata({width:8,height:8,wrap:false});
  for(const e of [wrap,finite]) for(const x of [7,0,1]) e.paint(x,0,1);
  wrap.step(); finite.step();
  assert.equal(wrap.grid[7*8],1); assert.equal(finite.grid[7*8],0);
});
test('revisiting a cell during a draw or erase stroke is idempotent',()=>{
  const e=new Automata({width:16,height:16});
  for(let i=0;i<50;i++) e.paint(4,4,1);
  assert.equal(e.grid[4*16+4],1);
  for(let i=0;i<50;i++) e.paint(4,4,0);
  assert.equal(e.grid[4*16+4],0);
});
test('stroke interpolation fills gaps in all directions',()=>{
  for(const end of [[10,2],[2,10],[-10,2],[2,-10],[-10,-10]]) {
    const points=[]; line(0,0,...end,(x,y)=>points.push([x,y]));
    assert.deepEqual(points[0],[0,0]); assert.deepEqual(points.at(-1),end);
    for(let i=1;i<points.length;i++) assert.equal(Math.max(Math.abs(points[i][0]-points[i-1][0]),Math.abs(points[i][1]-points[i-1][1])),1);
  }
});
test('Life-like masks include empty survival and reject invalid rules',()=>{
  assert.equal(parseRule('B2/S').survive,0);
  assert.equal(parseRule('B36/S23').birth,(1<<3)|(1<<6));
  assert.equal(parseRule('B0/S8').birth,1);
  for(const rule of ['B9/S23','23/3','B3/S-2','B3/S23<script>']) assert.throws(()=>parseRule(rule));
  const e=new Automata({width:8,height:8,rule:'B0/S'}); e.step(); assert.equal(live(e).length,64);
});
test('Brain fires with two neighbours, then recovers',()=>{
  const e=new Automata({width:10,height:10,mode:'brain'});
  e.paint(4,4,1); e.paint(6,4,1); e.step();
  assert.equal(e.grid[4*10+5],1); assert.equal(e.grid[4*10+4],2);
  e.step(); assert.equal(e.grid[4*10+4],0); assert.equal(e.grid[4*10+5],2);
});
test('cyclic cells only advance when their successor threshold is met',()=>{
  const e=new Automata({width:10,height:10,mode:'cyclic',states:5,threshold:2});
  e.grid.fill(4); e.grid[55]=1; e.grid[54]=2; e.step(); assert.equal(e.grid[55],1);
  e.grid.fill(4); e.grid[55]=1; e.grid[54]=2; e.grid[56]=2; e.step(); assert.equal(e.grid[55],2);
});
test('excitable cells progress through the refractory states',()=>{
  const e=new Automata({width:10,height:10,mode:'excitable',states:4,threshold:2});
  e.paint(4,4,1); e.paint(6,4,1); e.step(); assert.equal(e.grid[45],1);
  e.step(); assert.equal(e.grid[45],2); e.step(); assert.equal(e.grid[45],3); e.step(); assert.equal(e.grid[45],0);
});
test('reaction diffusion remains finite and bounded',()=>{
  const e=new Automata({width:48,height:32,mode:'reaction'}); e.seed(42); const a=e.u,b=e.nu;
  e.step(100);
  for(const field of [e.u,e.v]) for(const value of field) assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
  assert.equal(e.u,a); assert.equal(e.nu,b); assert.ok(e.v.some(value=>value>.1));
});
test('slime agents and fields stay finite; food persists and walls block deposits',()=>{
  const e=new Automata({width:48,height:32,mode:'slime',agents:100});
  e.seed(42); e.paint(2,2,3); e.paint(0,0,2); e.step(100);
  assert.equal(e.trail[2*48+2],32); assert.equal(e.trail[0],0);
  for(const value of e.trail) assert.ok(Number.isFinite(value)&&value>=0&&value<=32);
  for(let i=0;i<e.ax.length;i++) { assert.ok(e.ax[i]>=0&&e.ax[i]<48); assert.ok(e.ay[i]>=0&&e.ay[i]<32); }
});
test('seeded experiments reproduce exactly',()=>{
  for(const mode of ['life','brain','cyclic','excitable','reaction','slime']) {
    const a=new Automata({width:48,height:32,mode,agents:100}),b=new Automata({width:48,height:32,mode,agents:100});
    a.seed(72); b.seed(72); a.step(10); b.step(10);
    for(const key of ['grid','u','v','trail','ax','ay']) assert.deepEqual(Array.from(a[key]),Array.from(b[key]));
  }
});
test('RLE import/export round-trips cells and rule',()=>{
  const e=new Automata({width:48,height:32,rule:'B36/S23'}); place(e,patterns.glider,3,4);
  const parsed=parseRLE(e.exportRLE(),48,32);
  assert.equal(parsed.rule,e.rule); assert.equal(parsed.width,48);
  assert.deepEqual(Array.from(parsed.cells,p=>Array.from(p)),live(e));
});
test('malformed and oversized RLE fails before allocating a grid',()=>{
  for(const text of ['x = 999999, y = 999999\no!','x = 2, y = 2\n999999o!','x = 2, y = 2\n2o$2o','x = 2, y = 2\n4$o!']) assert.throws(()=>parseRLE(text,48,32));
});
test('a worker snapshot restores the exact simulation and random stream',()=>{
  const messages=[],context=vm.createContext({self:{postMessage:m=>messages.push(m)},performance,setTimeout:()=>1,clearTimeout:()=>{}});
  context.importScripts=(...files)=>{for(const file of files) vm.runInContext(fs.readFileSync('playground/life/'+file,'utf8'),context);};
  vm.runInContext(fs.readFileSync('playground/life/simulation-worker.js','utf8'),context);
  const send=data=>context.self.onmessage({data});
  send({type:'configure',epoch:1,options:{mode:'slime',width:48,height:32,agents:100,seed:42}});
  send({type:'save'}); send({type:'step',count:10});
  const expected=vm.runInContext('Array.from(engine.trail)',context);
  send({type:'restore'}); send({type:'step',count:10});
  assert.deepEqual(vm.runInContext('Array.from(engine.trail)',context),expected);
  assert.equal(messages.filter(m=>m.type==='error').length,0);
});
const fractalContext=vm.createContext({self:{}});
vm.runInContext(fs.readFileSync('playground/fractal/fractal-core.js','utf8'),fractalContext);
const {escape,palette}=fractalContext.self.FractalCore;
test('Mandelbrot interior shortcuts and escaping points',()=>{
  assert.equal(escape(0,0,0,384),-1); assert.equal(escape(-1,0,0,384),-1);
  assert.ok(escape(2,2,0,384)>0); assert.ok(escape(-2,2,0,384)>0);
});
test('all three fractals match an unoptimised double-precision reference',()=>{
  function reference(x,y,kind,max,jx=-.8,jy=.156) {
    let zr=kind===1?x:0,zi=kind===1?y:0,cr=kind===1?jx:x,ci=kind===1?jy:y,n=0;
    while(n<max&&zr*zr+zi*zi<=256) {
      if(kind===2) {zr=Math.abs(zr);zi=Math.abs(zi);}
      const next=zr*zr-zi*zi+cr;zi=2*zr*zi+ci;zr=next;n++;
    }
    return n===max?-1:Math.max(0,n+1-Math.log2(Math.log2(Math.hypot(zr,zi))));
  }
  for(let kind=0;kind<3;kind++) for(let y=-2;y<=2;y+=.25) for(let x=-2;x<=2;x+=.25) {
    const a=escape(x,y,kind,256),b=reference(x,y,kind,256);
    assert.ok(Math.abs(a-b)<1e-9);
  }
});
test('fractal palettes have valid opaque colours',()=>{
  for(let i=0;i<3;i++) {
    const p=palette(i); assert.equal(p.length,4096);
    for(let j=3;j<p.length;j+=4) assert.equal(p[j],255);
  }
});
test('benchmark default 256 x 160 Life and continuous models',t=>{
  for(const mode of ['life','brain','cyclic','excitable','reaction','slime']) {
    const e=new Automata({mode}); e.seed(42); e.step(5);
    const count=mode==='slime'?30:100,start=performance.now(); e.step(count);
    t.diagnostic(mode+': '+((performance.now()-start)/count).toFixed(3)+' ms / generation');
  }
});
test('pointer strokes keep one paint value, bridge gaps and end on cancellation',()=>{
  const fields={model:'life',resolution:'256',seed:'42',rule:'B3/S23',rulePreset:'B3/S23',states:'12',threshold:'1',feed:'.0367',kill:'.0649',agents:'6000',sensor:'9',angle:'45',decay:'95',speed:'30',brush:'1',tool:'draw',pattern:'glider'};
  const elements=new Map(),handlers={};
  function element(id) {
    if(elements.has(id)) return elements.get(id);
    const result={value:fields[id]||'',checked:id==='wrap',clientWidth:1000,clientHeight:600,options:[],hidden:false,
      addEventListener(type,fn){(this.events ||= {})[type]=fn;},setAttribute(){},checkValidity(){return true;},focus(){},setPointerCapture(){},
      getBoundingClientRect(){return {left:0,top:0};},getContext(){return {setTransform(){},fillRect(){},drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};}};
    elements.set(id,result); return result;
  }
  element('rulePreset').options=[{value:'B3/S23'},{value:'B36/S23'},{value:'custom'}];
  element('tool').options=['draw','erase','pan','stamp','food','wall'].map(value=>({value}));
  class FakeWorker {
    constructor(){this.engine=null;FakeWorker.instance=this;}
    postMessage(m){
      if(m.type==='configure') this.engine=new Automata(m.options);
      if(m.type==='paint') for(let i=0;i<m.points.length;i+=2) this.engine.paint(m.points[i],m.points[i+1],m.value,m.radius);
    }
  }
  class Observer {constructor(callback){this.callback=callback;}observe(target){if(target===element('life')) this.callback([{isIntersecting:true}]);}}
  const context=vm.createContext({
    self:{AutomataCore:{line,parseRule},LifePatterns:patterns},
    document:{getElementById:element,createElement:()=>element('raster'),querySelectorAll:()=>[],addEventListener(){}},
    Worker:FakeWorker,ResizeObserver:class {constructor(callback){this.callback=callback;}observe(){this.callback();}},
    IntersectionObserver:Observer,matchMedia:()=>({matches:false}),URLSearchParams,location:{search:'',origin:'http://localhost',pathname:'/playground/life/'},
    history:{replaceState(){}},requestAnimationFrame:()=>1,devicePixelRatio:1,setTimeout,clearTimeout,console
  });
  vm.runInContext(fs.readFileSync('playground/life/life.js','utf8'),context);
  const canvas=element('life'),e=FakeWorker.instance.engine;
  const event=(x,y,extra={})=>({pointerId:1,button:0,clientX:20+(x+.5)*3.75,clientY:(y+.5)*3.75,preventDefault(){},...extra});
  canvas.events.pointerdown(event(4,4));
  for(let i=0;i<50;i++) canvas.events.pointermove(event(4+(i%3)*.03,4));
  canvas.events.pointerup(event(4,4));
  assert.equal(e.grid[4*256+4],1);
  canvas.events.pointerdown(event(4,4));canvas.events.pointerup(event(4,4));
  assert.equal(e.grid[4*256+4],1);
  canvas.events.pointerdown(event(4,4,{shiftKey:true}));canvas.events.pointerup(event(4,4));
  assert.equal(e.grid[4*256+4],0);
  canvas.events.pointerdown(event(4,4));canvas.events.pointermove(event(20,20));canvas.events.pointercancel(event(20,20));
  for(let i=4;i<=20;i++) assert.equal(e.grid[i*256+i],1);
  canvas.events.pointermove(event(40,40));assert.equal(e.grid[40*256+40],0);
});

test('dissertation sensors follow the rounded Java vector geometry',()=>{
  const e=new Automata({mode:'slime',slimeVariant:'local',width:32,height:32,agents:0}).project;
  e.sensorVectors(8,45);
  assert.deepEqual(Array.from(e.vectors.slice(36,42)),[-6,-6,0,-8,6,-6]);
});
test('dissertation diffusion uses the reported Gaussian kernel',()=>{
  const e=new Automata({mode:'slime',slimeVariant:'local',width:32,height:32,agents:0}).project;
  e.a[16*32+16]=16; const original=e.a;
  e.diffuse(1);
  assert.equal(e.a[16*32+16],4); assert.equal(e.a[16*32+17],2); assert.equal(e.a[17*32+17],1);
  assert.equal(e.a.reduce((a,b)=>a+b,0),16);
  e.diffuse(1); assert.equal(e.a,original);
});
test('dissertation cells cannot overlap or leave the closed board',()=>{
  const engine=new Automata({mode:'slime',slimeVariant:'local',width:48,height:32,agents:220,sensor:8,angle:45});
  engine.seed(42); const e=engine.project;
  for(let step=0;step<40;step++) {
    engine.step(); const positions=new Set();
    for(let i=0;i<e.count;i++) {
      assert.ok(e.x[i]<e.width && e.y[i]<e.height);
      const at=e.y[i]*e.width+e.x[i];
      assert.ok(!positions.has(at)); positions.add(at); assert.equal(e.occupied[at],i+1);
    }
  }
});
test('local and competitive experiments start with the same cells for the same seed',()=>{
  const a=new Automata({mode:'slime',slimeVariant:'local',width:48,height:32,agents:200});
  const b=new Automata({mode:'slime',slimeVariant:'competition',width:48,height:32,agents:200});
  a.seed(42); b.seed(42);
  for(const key of ['x','y','heading','food']) assert.deepEqual(Array.from(a.project[key]),Array.from(b.project[key]));
  assert.ok(b.project.team.some(value=>value===1));
});
test('competition senses own trail plus food minus the opposing trail',()=>{
  const e=new Automata({mode:'slime',slimeVariant:'competition',width:32,height:32,agents:0}).project;
  const at=10*32+10; e.a[at]=3; e.b[at]=1; e.foodField[at]=4;
  assert.equal(e.sample(10,10,0),6); assert.equal(e.sample(10,10,1),2);
});
test('long-range food changes the sensing field without mixing it into cell trails',()=>{
  const local=new Automata({mode:'slime',slimeVariant:'local',width:48,height:32,agents:0}).project;
  const wide=new Automata({mode:'slime',slimeVariant:'long-range',width:48,height:32,agents:0}).project;
  for(const e of [local,wide]) {e.paint(24,16,3);e.rebuildFood();}
  const food=16*48+24,nearby=16*48+30;
  assert.equal(local.foodField[food],32); assert.equal(wide.foodField[food],32);
  assert.equal(local.foodField[nearby],0); assert.ok(wide.foodField[nearby]>0);
  assert.equal(wide.a[food],0); assert.equal(wide.a[nearby],0);
});
test('density caps at grid capacity; walls remove covered agents safely',()=>{
  const engine=new Automata({mode:'slime',slimeVariant:'local',width:16,height:16,agents:2000});
  engine.seed(42); const e=engine.project; assert.equal(e.count,256);
  e.paint(e.x[0],e.y[0],2,1); engine.step(5);
  assert.equal(e.population,255);
  for(let i=0;i<e.count;i++) if(e.alive[i]) assert.equal(e.walls[e.y[i]*e.width+e.x[i]],0);
});
test('competitive snapshots preserve both fields, cells and the random stream',()=>{
  const engine=new Automata({mode:'slime',slimeVariant:'competition',width:48,height:32,agents:200,sensor:8,angle:45});
  engine.seed(42); engine.step(5); const e=engine.project,snapshot=e.snapshot();
  engine.step(8); const expected=e.snapshot();
  e.restore(snapshot); engine.step(8);
  for(const key of ['x','y','heading','alive','a','b']) assert.deepEqual(Array.from(e[key]),Array.from(expected[key]));
  assert.equal(e.randomState,expected.randomState);
});
test('all dissertation views render opaque pixels without altering the model',()=>{
  for(const variant of ['local','long-range','competition']) {
    const e=new Automata({mode:'slime',slimeVariant:variant,width:48,height:32,agents:100});
    e.seed(42);e.step(3);
    const pixels=new Uint8ClampedArray(48*32*4);
    for(const view of ['trails','agents','food']) {
      e.slimeView=view;e.raster(pixels);
      for(let i=3;i<pixels.length;i+=4) assert.equal(pixels[i],255);
      assert.equal(e.generation,3);
    }
  }
});
test('benchmark dissertation variants at the default 6000 cells',t=>{
  for(const variant of ['local','long-range','competition']) {
    const e=new Automata({mode:'slime',slimeVariant:variant,sensor:8,angle:45});
    e.seed(42);e.step(5);const start=performance.now();e.step(20);
    t.diagnostic(variant+': '+((performance.now()-start)/20).toFixed(3)+' ms / generation');
  }
});

test('tricorn and cubic multibrot match direct complex iteration',()=>{
  function reference(x,y,kind,max) {
    let re=0,im=0,n=0;
    while(n<max&&re*re+im*im<=256) {
      if(kind===3) im=-im;
      const a=re*re-im*im,b=2*re*im;
      const next=kind===4 ? a*re-b*im+x:a+x;
      im=kind===4 ? a*im+b*re+y:b+y;re=next;n++;
    }
    return n===max ? -1:Math.max(0,n+1-Math.log2(Math.log2(Math.hypot(re,im)))/(kind===4 ? Math.log2(3):1));
  }
  for(const kind of [3,4]) for(let y=-2;y<=2;y+=.25) for(let x=-2;x<=2;x+=.25) {
    assert.ok(Math.abs(escape(x,y,kind,256)-reference(x,y,kind,256))<1e-8);
  }
});
test('newton identifies all three roots and handles the singular origin',()=>{
  const roots=[[1,0],[-.5,Math.sqrt(3)/2],[-.5,-Math.sqrt(3)/2]];
  roots.forEach(([x,y],i)=>{
    assert.equal(escape(x,y,5,256),5+i*13);
    assert.equal(Math.floor((escape(x+.01,y+.01,5,256)-5)/13),i);
  });
  assert.equal(escape(0,0,5,256),-1);
  assert.equal(escape(.01,.01,5,1),-1);
});
test('newton shortcut matches the polynomial and derivative formulation',()=>{
  function reference(x,y,max) {
    for(let n=0;n<max;n++) {
      const roots=[[1,0],[-.5,Math.sqrt(3)/2],[-.5,-Math.sqrt(3)/2]];
      for(let r=0;r<3;r++) if((x-roots[r][0])**2+(y-roots[r][1])**2<1e-10) return 5+r*13+Math.min(n,60)*.1;
      const fr=x*x*x-3*x*y*y-1,fi=3*x*x*y-y*y*y;
      const dr=3*(x*x-y*y),di=6*x*y,d=dr*dr+di*di;
      if(d<9e-24||!Number.isFinite(d)) return -1;
      x-=(fr*dr+fi*di)/d;y-=(fi*dr-fr*di)/d;
    }
    return -1;
  }
  for(let y=-1.9;y<2;y+=.31) for(let x=-1.9;x<2;x+=.31) assert.ok(Math.abs(escape(x,y,5,256)-reference(x,y,256))<1e-8);
});
test('every bookmarked fractal view has visible detail',()=>{
  vm.runInContext(fs.readFileSync('playground/fractal/fractal-places.js','utf8'),fractalContext);
  for(const [name,p] of Object.entries(fractalContext.self.FractalPlaces)) {
    let coloured=0;const values=new Set();
    for(let py=0;py<20;py++) for(let px=0;px<32;px++) {
      const value=escape(p.x+((px+.5)/32-.5)*p.scale,p.y+((py+.5)/20-.5)*p.scale*20/32,p.kind,512,p.jx,p.jy);
      if(value>=0) {coloured++;values.add(Math.floor(value*25.6));}
    }
    assert.ok(coloured>0,name+' is blank');assert.ok(values.size>3,name+' lacks detail');
  }
});
