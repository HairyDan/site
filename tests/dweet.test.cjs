const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const root=process.cwd();
const context={self:{}};
vm.runInNewContext(fs.readFileSync(root+'/playground/dweet/unpack.js','utf8'),context);
const core=context.self.DweetCore;
const runtimeContext={self:{}};
vm.runInNewContext(fs.readFileSync(root+'/playground/dweet/runtime.js','utf8'),runtimeContext);
const runtime=runtimeContext.self.DweetRuntime;
function environment() {
  const trace=[],queue=[];
  const ctx=new Proxy({},{has:(target,key)=>['fillStyle','fillRect','fillText'].includes(key)||key in target,get:(target,key)=>key===Symbol.unscopables?undefined:key in target?target[key]:(...args)=>trace.push([key,...args]),set:(target,key,value)=>{target[key]=value;trace.push([key,value]);return true;}});
  const canvas={width:1920,height:1080,style:{},getContext:()=>ctx};
  const rgba=(r=0,g=0,b=0,a=1)=>'rgba('+(r|0)+','+(g|0)+','+(b|0)+','+a+')';
  const env={c:canvas,x:ctx,S:Math.sin,C:Math.cos,T:Math.tan,R:rgba,PI:Math.PI,document:{getElementById:()=>canvas},requestAnimationFrame:fn=>queue.push(fn)};
  const sandbox=vm.createContext(env);
  return {trace,queue,canvas,sandbox};
}
function equivalent(source) {
  const result=core.unpack(source),a=environment(),b=environment();
  vm.runInContext('globalThis.u=function(t){'+result.body+'\n}',a.sandbox);
  vm.runInContext(result.code,b.sandbox);
  for(const timestamp of [0,1000/60,500,1000]) {
    vm.runInContext('u('+timestamp/1000+')',a.sandbox);
    const callbacks=b.queue.splice(0);for(const callback of callbacks) callback(timestamp);
  }
  const comparable=trace=>trace.map(row=>row.map(value=>typeof value==='function'?String(value):value));
  assert.deepEqual(comparable(b.trace),comparable(a.trace),result.formatted);
  assert.equal(b.canvas.width,a.canvas.width);
  assert.equal(b.canvas.height,a.canvas.height);
  return result;
}
const cases=[
  ['bars','c.width=1920;for(i=0;i<9;i++)x.fillRect(400+i*100+S(t)*300,400,50,200)'],
  ['nested colours','x.fillStyle=R(255*S(t+C(t)),128+S(t)*50,10,.5);x.fillRect(t,0,2,3)'],
  ['literal text','x.fillText("S(t) x.fillRect R(1,2,3)",0,0);x.fillText(\'c S R t\',1,2)'],
  ['regular expressions','x.fillText(/S[(]t[)]|[}/]/g.test("S(t)"),0,0)'],
  ['regex after control','if(t>=0)/R(.*)/.test("R()")&&x.fillRect(1,2,3,4)'],
  ['comments at property access','x./* S(t) */fillRect(0,0,3,4);x.fillText(Math./* hi */S,0,0)'],
  ['scope shadowing','[1,2].forEach(x=>globalThis.x.fillText(x,0,0));let S=()=>9;x.fillRect(S(t),0,1,1)'],
  ['objects and shorthand','a={S,R,t};x.fillText(a.S(a.t),0,0)'],
  ['template interpolation','x.fillText(`S(t): ${S(t)} / ${R(1,2,3)}`,0,0)'],
  ['alias reassignment','S=()=>7;x.fillRect(S(t),0,1,1)'],
  ['time reassignment','t+=2;x.fillRect(S(t),t,1,1)'],
  ['global name collisions','canvas=1;context=2;time=3;rgba=4;animate=5;startedAt=6;x.fillRect(S(t),canvas,context,time)'],
  ['with context','with(x){fillStyle=R(100,0,0);fillRect(1,2,3,4)}'],
  ['eval scope','x.fillText(eval("S(t)"),0,0)'],
  ['function division','a=function(){return 1}/2;x.fillRect(Number.isNaN(a),0,1,1)'],
  ['arrow division','a=(()=>{})/2;x.fillRect(Number.isNaN(a),0,1,1)'],
  ['ASI return','if(t){return\nx.fillRect(9,9,9,9)}\nx.fillRect(0,0,1,1)'],
  ['multiline update','a=1\na++\nx.fillRect(a,0,1,1)'],
  ['numeric members','x.fillText(1..toString(),0,0)'],
  ['optional chaining','x?.fillRect(S?.(t),0,1,1)'],
  ['whole function','function u(t){c.width=1920;x.fillRect(S(t),0,1,1)}'],
  ['drawing state','t===0&&(x.fillStyle=R(255));x.fillRect(t,0,1,1)'],
  ['colours default','x.fillText(R(),0,0);x.fillText(R(255),0,0)'],
  ['ternary alias values','x.fillText(t?S:C,0,0);x.fillText(t?t:0,0,0)'],
  ['nested templates','x.fillText(`a ${`b ${S(t)}`}`,0,0)'],
  ['label','S:for(i=0;i<3;i++){if(i===1)break S;x.fillRect(i,0,1,1)}']
];
for(const [name,source] of cases) test('unpack preserves '+name,()=>equivalent(source));
test('rejects malformed input',()=>{
  for(const source of ['x.fillRect(','"unfinished','/* unfinished','`unfinished']) assert.throws(()=>core.unpack(source));
  assert.throws(()=>core.unpack('a'.repeat(50001)));
});
test('reports ambiguous aliases',()=>{
  const result=core.unpack('let S=()=>1;x.fillRect(S(t),0,1,1)');
  assert.equal(result.changes.length,0);assert.ok(result.notes.length);
});
test('preserves literal spelling',()=>{
  const source='x.fillText("S(t) R(1)",0,0);x.fillText(/R\\(.*\\)/.source,0,0)';
  assert.ok(core.unpack(source).code.includes('"S(t) R(1)"'));
});
function worker(mode,source) {
  const env=environment(),messages=[];
  Object.assign(env.sandbox,{performance:{now:()=>0},postMessage:m=>messages.push(m),addEventListener:()=>{}});
  env.sandbox.self=env.sandbox;
  vm.runInContext('('+runtime.workerRuntime.toString()+')()',env.sandbox);
  env.sandbox.onmessage({data:{type:'init',mode,source,canvas:env.canvas}});
  return {...env,messages,send:time=>env.sandbox.onmessage({data:{type:'frame',time}})};
}
test('source and edited workers share a virtual clock',()=>{
  const source='x.fillRect(t,0,1,1)',a=worker('source',source),b=worker('plain',core.unpack(source).code);
  for(const time of [0,1000/60,1000,1016.6666666666666]) {a.send(time);b.send(time);}
  assert.deepEqual(a.trace,b.trace);
  assert.equal(a.messages.filter(m=>m.type==='frame').length,4);
});
test('worker keeps drawing state and exposes style',()=>{
  const a=worker('source','t===0&&(x.fillStyle=R(255));c.style.filter="blur(1px)";x.fillRect(t,0,1,1)');
  a.send(0);a.send(1000);
  assert.equal(a.trace.filter(t=>t[0]==='fillStyle').length,1);
  assert.ok(a.messages.some(m=>m.type==='style'&&m.value==='blur(1px)'));
});
test('worker surfaces runtime errors',()=>{
  const a=worker('source','throw new Error("bad dweet")');a.send(0);
  assert.ok(a.messages.some(m=>m.type==='error'&&m.message==='Error: bad dweet'));
});
test('worker unwraps canvas feedback sources',()=>{
  const a=worker('source','x.drawImage(c,1,2);x.drawImage(x.canvas,3,4);x.createPattern(c,"repeat")');a.send(0);
  assert.equal(a.messages.some(m=>m.type==='error'),false);
  for(const operation of a.trace) assert.equal(operation[1],a.canvas);
});
test('frame shell contains trusted bootstrap and no source input',()=>{
  const html=runtime.frameDocument('test-token');
  assert.ok(html.endsWith('</script></body></html>'));
  assert.ok(html.includes("connect-src 'none'"));assert.ok(html.includes('test-token'));
});
