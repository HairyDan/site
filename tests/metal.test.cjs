const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const context={self:{}};
vm.runInNewContext(fs.readFileSync('playground/metal/metal-core.js','utf8'),context);
const {generate,svg,normalise,cleanName}=context.self.MetalCore;
test('same settings give byte-identical vector output',()=>{
  assert.equal(svg(generate({name:'MORTAL COIL',seed:42})),svg(generate({name:'MORTAL COIL',seed:42})));
});
test('seeds change geometry',()=>{
  assert.notEqual(svg(generate({seed:0})),svg(generate({seed:1})));
});
test('every supported glyph has a drawable outline',()=>{
  for(const name of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&-\'') {
    const logo=generate({name,thorns:0,web:0});
    assert.ok(logo.outlines.length>0,name);
  }
});
test('names normalise safely and empty input stays empty',()=>{
  assert.equal(cleanName('  Mörtal   Cöil!  '),'MORTAL COIL');
  assert.equal(cleanName('a'.repeat(100)).length,24);
  const empty=generate({name:'🐸   '});assert.equal(empty.options.name,'');
  assert.equal(empty.outlines.length,0);assert.equal(empty.threads.length,0);
});
test('parameters clamp and reject non-finite values',()=>{
  const options=normalise({seed:-5,thorns:999,web:-12,warp:NaN,weight:Infinity,symmetry:1000});
  assert.equal(options.seed,0);assert.equal(options.thorns,100);assert.equal(options.web,0);
  assert.ok(Number.isFinite(options.warp));assert.ok(Number.isFinite(options.weight));assert.equal(options.symmetry,100);
});
test('bare lettering has no branches or webbing',()=>{
  const logo=generate({thorns:0,web:0});
  assert.equal(logo.branches,0);assert.equal(logo.threads.length,0);assert.ok(logo.outlines.length>0);
});
test('webbing can be removed without changing the underlying branches',()=>{
  const a=generate({web:0}),b=generate({web:100});
  assert.equal(a.threads.length,0);assert.ok(b.threads.length>0);
  assert.deepEqual(a.outlines,b.outlines);
});
test('geometry is finite and stays inside the export',()=>{
  for(const name of ['I','MORTAL COIL','WWWW WWWW WWWW WWWW WWWW']) for(const seed of [0,42,4294967295]) {
    const logo=generate({name,seed,thorns:100,web:100,reach:100,warp:100});
    assert.ok(logo.branches<=650);assert.ok(logo.outlines.length<=1500);
    const points=[...logo.outlines.flat(),...logo.threads.flatMap(line=>[line.a,line.b,line.c])];
    for(const [x,y] of points) {assert.ok(Number.isFinite(x)&&x>=0&&x<=1200);assert.ok(Number.isFinite(y)&&y>=0&&y<=620);}
  }
});
test('changing weight leaves the web connections and branch counts intact',()=>{
  const a=generate({weight:0}),b=generate({weight:100});
  assert.equal(a.branches,b.branches);assert.deepEqual(a.threads,b.threads);assert.notDeepEqual(a.outlines,b.outlines);
});
test('SVG contains paths with no fonts, scripts or external assets',()=>{
  const output=svg(generate({name:"BONE & ASH"}));
  assert.ok(output.includes('BONE &amp; ASH'));
  assert.ok(output.includes('<path'));assert.ok(output.endsWith('</svg>'));
  assert.equal(/<(text|script|image|foreignObject)\b|url\(|NaN|Infinity/.test(output),false);
});
test('export background is opt-in and ink can be inverted',()=>{
  const logo=generate({name:'VOID'});
  assert.equal(svg(logo).includes('M0 0H1200V620H0Z'),false);
  assert.ok(svg(logo,{background:true}).includes('M0 0H1200V620H0Z'));
  assert.ok(svg(logo,{dark:true}).includes('#161616'));
});
