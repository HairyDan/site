importScripts('slime-project.js','engine.js','patterns.js');
const {Automata,parseRule,parseRLE}=self.AutomataCore;
let engine, pixels, timer, running=false, visible=true, speed=30, trails=false, epoch=0, saved, dirty=false, compute=0;
function present() {
  if(!engine) return;
  if(!pixels) { dirty=true; return; }
  const data=new Uint8ClampedArray(pixels);
  engine.raster(data,trails);
  self.postMessage({type:'frame',pixels,width:engine.width,height:engine.height,generation:engine.generation,population:engine.population,compute,epoch},[pixels]);
  pixels=null; dirty=false;
}
function schedule() {
  clearTimeout(timer);
  if(!running || !visible) return;
  timer=setTimeout(() => {
    const start=performance.now();
    if(engine.mode==='reaction') {
      let steps=0;
      do { engine.step(); steps++; } while(steps<8 && performance.now()-start<8);
    } else engine.step();
    compute=performance.now()-start;
    present(); schedule();
  },Math.max(0,1000/speed-compute));
}
function stamp(pattern,x,y) {
  for(const [dx,dy] of pattern.cells) engine.paint(x+dx,y+dy,1);
}
self.onmessage=({data:m}) => {
  try {
    if(m.type==='recycle') {
      if(engine && m.pixels.byteLength===engine.width*engine.height*4) pixels=m.pixels;
      if(dirty) present();
      return;
    }
    if(m.type==='configure') {
      epoch=m.epoch; saved=null; engine=new Automata(m.options); engine.seed(m.options.seed);
      pixels=new ArrayBuffer(engine.width*engine.height*4);
      if(engine.mode==='life') {
        engine.clear();
        const pattern=self.LifePatterns['gosper gun'];
        stamp(pattern,(engine.width-pattern.width)>>1,(engine.height-pattern.height)>>1);
      }
    }
    if(!engine) return;
    if(m.type==='run') { running=m.running; schedule(); return; }
    if(m.type==='visible') { visible=m.visible; schedule(); return; }
    if(m.type==='speed') { speed=m.speed; schedule(); return; }
    if(m.type==='step') { const start=performance.now(); engine.step(m.count||1); compute=performance.now()-start; }
    if(m.type==='clear') engine.clear();
    if(m.type==='seed') engine.seed(m.seed);
    if(m.type==='paint') for(let i=0;i<m.points.length;i+=2) engine.paint(m.points[i],m.points[i+1],m.value,m.radius);
    if(m.type==='pattern') {
      if(m.clear) engine.clear();
      const pattern=self.LifePatterns[m.name] || m.pattern;
      if(!pattern) throw new Error('unknown pattern.');
      stamp(pattern,m.x ?? ((engine.width-pattern.width)>>1),m.y ?? ((engine.height-pattern.height)>>1));
    }
    if(m.type==='rule') { Object.assign(engine,parseRule(m.rule)); engine.rule=m.rule; }
    if(m.type==='options') {
      for(const key of ['feed','kill','threshold','sensor','angle','decay','slimeView']) if(m[key]!==undefined) engine[key]=m[key];
      if(m.wrap!==undefined) engine.wrap=m.wrap;
      if(m.trails!==undefined) trails=m.trails;
    }
    if(m.type==='save') {
      saved={};
      for(const key of ['grid','age','u','v','trail','food','walls','ax','ay','heading']) saved[key]=engine[key].slice();
      if(engine.project) saved.project=engine.project.snapshot();
      saved.population=engine.population; saved.generation=engine.generation; saved.rngState=engine.rngState;
      self.postMessage({type:'message',text:'snapshot saved.'}); return;
    }
    if(m.type==='restore') {
      if(!saved) throw new Error('save a snapshot first.');
      for(const key of ['grid','age','u','v','trail','food','walls','ax','ay','heading']) engine[key].set(saved[key]);
      if(engine.project && saved.project) engine.project.restore(saved.project);
      engine.population=saved.population; engine.generation=saved.generation; engine.rngState=saved.rngState;
    }
    if(m.type==='export') { self.postMessage({type:'export',text:engine.exportRLE()}); return; }
    if(m.type==='import') {
      if(engine.mode!=='life') throw new Error('choose Life before importing an RLE pattern.');
      const pattern=parseRLE(m.text,engine.width,engine.height);
      if(pattern.rule) { Object.assign(engine,parseRule(pattern.rule)); engine.rule=pattern.rule; }
      engine.clear(); stamp(pattern,(engine.width-pattern.width)>>1,(engine.height-pattern.height)>>1);
      self.postMessage({type:'rule',rule:engine.rule});
    }
    present();
    if(m.type==='configure') schedule();
  } catch(error) { self.postMessage({type:'error',text:error.message}); }
};
