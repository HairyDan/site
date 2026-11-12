(() => {
  const $=id=>document.getElementById(id);
  const canvas=$('life'),ctx=canvas.getContext('2d',{alpha:false});
  const raster=document.createElement('canvas'),rasterCtx=raster.getContext('2d',{alpha:false});
  const worker=new Worker('simulation-worker.js');
  const {line,parseRule}=self.AutomataCore;
  const params=new URLSearchParams(location.search);
  const modes=['life','brain','cyclic','excitable','reaction','slime'];
  if(modes.includes(params.get('model'))) $('model').value=params.get('model');
  if($('model').value==='excitable') $('states').value=16;
  if(params.has('rule')) { try { parseRule(params.get('rule')); $('rule').value=params.get('rule').toUpperCase(); } catch {} }
  if(params.has('seed') && +params.get('seed')>0) $('seed').value=Math.min(4294967295,+params.get('seed'));
  let width=256,height=160,zoom=1,ox=0,oy=0,dpr=1,epoch=0,running=false,stroke=null,frame=0;
  let lastStats='',currentMode=$('model').value;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function message(text) { $('message').textContent=text; }
  function send(type,data={}) { worker.postMessage({type,...data}); }
  function requestDraw() { if(!frame) frame=requestAnimationFrame(draw); }
  function draw() {
    frame=0;
    const w=canvas.clientWidth,h=canvas.clientHeight;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#0c1720'; ctx.fillRect(0,0,w,h);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(raster,ox,oy,width*zoom,height*zoom);
    if($('showGrid').checked && zoom>=5) {
      ctx.strokeStyle='rgba(190,210,225,.14)'; ctx.lineWidth=1/dpr;
      ctx.beginPath();
      for(let x=Math.max(0,Math.ceil(-ox/zoom));x<=Math.min(width,(w-ox)/zoom);x++) { const p=ox+x*zoom; ctx.moveTo(p,Math.max(0,oy)); ctx.lineTo(p,Math.min(h,oy+height*zoom)); }
      for(let y=Math.max(0,Math.ceil(-oy/zoom));y<=Math.min(height,(h-oy)/zoom);y++) { const p=oy+y*zoom; ctx.moveTo(Math.max(0,ox),p); ctx.lineTo(Math.min(w,ox+width*zoom),p); }
      ctx.stroke();
    }
  }
  function fit() {
    zoom=Math.min(canvas.clientWidth/width,canvas.clientHeight/height);
    ox=(canvas.clientWidth-width*zoom)/2; oy=(canvas.clientHeight-height*zoom)/2; requestDraw();
  }
  new ResizeObserver(() => {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr); fit();
  }).observe(canvas);
  worker.onmessage=({data:m}) => {
    if(m.type==='frame') {
      if(m.epoch===epoch) {
        if(raster.width!==m.width || raster.height!==m.height) { raster.width=m.width; raster.height=m.height; }
        rasterCtx.putImageData(new ImageData(new Uint8ClampedArray(m.pixels),m.width,m.height),0,0);
        requestDraw();
        const label={life:'live',brain:'firing / refractory',cyclic:'nonzero',excitable:'non-resting',reaction:'V > .1',slime:'trail > 1'}[currentMode];
        const populationLabel=currentMode==='slime' && $('slimeVariant').value!=='sketch' ? 'agents':label+' cells';
        const text='step '+m.generation.toLocaleString()+' · '+m.population.toLocaleString()+' '+populationLabel+' · '+m.compute.toFixed(2)+' ms / tick';
        if(text!==lastStats) { $('stats').textContent=text; lastStats=text; }
      }
      worker.postMessage({type:'recycle',pixels:m.pixels},[m.pixels]);
    } else if(m.type==='error' || m.type==='message') message(m.text);
    else if(m.type==='rule') { $('rule').value=m.rule; syncRulePreset(); }
    else if(m.type==='export') {
      const url=URL.createObjectURL(new Blob([m.text],{type:'text/plain'}));
      const link=document.createElement('a'); link.href=url; link.download='pattern.rle'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  };
  worker.onerror=() => { setRunning(false); message('simulation couldn’t start. reload to try again.'); };
  function syncRulePreset() {
    const value=$('rule').value.toUpperCase();
    $('rulePreset').value=[...$('rulePreset').options].some(option=>option.value===value) ? value:'custom';
  }
  function setupURL() {
    const query=new URLSearchParams({model:currentMode,seed:$('seed').value});
    if(currentMode==='life') query.set('rule',$('rule').value.toUpperCase());
    if(currentMode==='reaction') { query.set('feed',$('feed').value); query.set('kill',$('kill').value); }
    if(currentMode==='cyclic' || currentMode==='excitable') { query.set('states',$('states').value); query.set('threshold',$('threshold').value); }
    if(currentMode==='slime') for(const key of ['agents','sensor','angle','decay']) query.set(key,$(key).value);
    if(currentMode==='slime') { query.set('variant',$('slimeVariant').value); query.set('view',$('slimeView').value); }
    query.set('grid',$('resolution').value);
    query.set('speed',$('speed').value);
    if(currentMode==='life') query.set('wrap',String(+$('wrap').checked));
    return location.origin+location.pathname+'?'+query;
  }
  function updateURL() { history.replaceState(null,'',setupURL()); }
  for(const [param,id,min,max] of [['feed','feed',0,.1],['kill','kill',0,.1],['states','states',3,32],['threshold','threshold',1,8],['agents','agents',2000,12000],['sensor','sensor',2,24],['angle','angle',10,100],['decay','decay',85,99]]) {
    if(params.has(param) && Number.isFinite(+params.get(param))) $(id).value=Math.max(min,Math.min(max,+params.get(param)));
  }
  if(['local','long-range','competition','sketch'].includes(params.get('variant'))) $('slimeVariant').value=params.get('variant');
  if(['trails','agents','food'].includes(params.get('view'))) $('slimeView').value=params.get('view');
  if(params.has('wrap')) $('wrap').checked=params.get('wrap')!=='0';
  if(params.has('speed')) { $('speed').value=Math.max(1,Math.min(60,+params.get('speed')||30)); $('speedValue').value=$('speed').value+'/s'; send('speed',{speed:+$('speed').value}); }
  if(['128','256','512'].includes(params.get('grid'))) $('resolution').value=params.get('grid');
  function configure() {
    try { parseRule($('rule').value); } catch(error) {
      if($('model').value==='life') { message(error.message); return false; }
      $('rule').value='B3/S23';
    }
    currentMode=$('model').value;
    width=+$('resolution').value; height=width*5/8; epoch++;
    raster.width=width; raster.height=height;
    document.querySelectorAll('[data-for]').forEach(el=>el.hidden=!el.dataset.for.split(' ').includes(currentMode));
    document.querySelectorAll('[data-note]').forEach(el=>el.hidden=el.dataset.note!==currentMode);
    document.querySelectorAll('[data-variant]').forEach(el=>el.hidden=currentMode!=='slime'||el.dataset.variant!==$('slimeVariant').value);
    for(const option of $('tool').options) {
      option.hidden=(option.value==='stamp' && currentMode!=='life') || (['food','wall'].includes(option.value) && currentMode!=='slime');
    }
    $('tool').value='draw'; $('brush').value=['slime','reaction'].includes(currentMode) ? 4:1;
    $('slimeView').disabled=$('slimeVariant').value==='sketch';
    if($('slimeView').disabled) $('slimeView').value='trails';
    message(''); syncRulePreset();
    send('configure',{epoch,options:{mode:currentMode,width,height,seed:+$('seed').value,rule:$('rule').value.toUpperCase(),wrap:currentMode==='life' ? $('wrap').checked:true,feed:+$('feed').value,kill:+$('kill').value,states:+$('states').value,threshold:+$('threshold').value,agents:+$('agents').value,slimeVariant:$('slimeVariant').value,slimeView:$('slimeView').value,sensor:+$('sensor').value,angle:+$('angle').value,decay:+$('decay').value/100}});
    fit(); updateURL(); return true;
  }
  function setRunning(value) {
    running=value; $('playBtn').textContent=value ? 'pause':'play';
    $('playBtn').setAttribute('aria-pressed',String(value));
    $('stepBtn').disabled=value; send('run',{running:value});
  }
  $('playBtn').onclick=()=>setRunning(!running);
  $('stepBtn').onclick=()=>send('step');
  $('clearBtn').onclick=()=>{ setRunning(false); send('clear'); message(''); };
  $('randomBtn').onclick=()=>{ if(!$('seed').checkValidity()) { message('seed must be a whole number from 1 to 4294967295.'); return; } send('seed',{seed:+$('seed').value||1}); updateURL(); message('same seed, same starting state.'); };
  $('model').onchange=()=>{ setRunning(false); if($('model').value==='excitable') $('states').value=16; if(configure() && !reduced.matches) setRunning(true); };
  $('resolution').onchange=configure;
  $('agents').onchange=configure;
  $('slimeVariant').onchange=()=>{
    $('sensor').value=8; $('angle').value=45; $('sensorValue').value='8'; $('angleValue').value='45°'; configure();
  };
  $('slimeView').onchange=()=>{ send('options',{slimeView:$('slimeView').value}); updateURL(); };
  $('applyStates').onclick=()=>{
    if(!$('states').checkValidity() || !$('threshold').checkValidity()) { message('states: 3–32; neighbours: 1–8.'); return; }
    configure();
  };
  $('rulePreset').onchange=()=>{
    if($('rulePreset').value==='custom') { $('rule').focus(); return; }
    $('rule').value=$('rulePreset').value; applyRule();
  };
  function applyRule() {
    try { parseRule($('rule').value); $('rule').value=$('rule').value.toUpperCase(); send('rule',{rule:$('rule').value}); syncRulePreset(); updateURL(); message('rule applied; existing cells kept.'); }
    catch(error) { message(error.message); }
  }
  $('applyRule').onclick=applyRule;
  $('rule').onkeydown=e=>{ if(e.key==='Enter') applyRule(); };
  $('wrap').onchange=()=>{ send('options',{wrap:$('wrap').checked}); updateURL(); };
  $('trails').onchange=()=>send('options',{trails:$('trails').checked});
  $('showGrid').onchange=requestDraw;
  $('fit').onclick=fit;
  $('speed').oninput=()=>{ $('speedValue').value=$('speed').value+'/s'; send('speed',{speed:+$('speed').value}); };
  $('recipe').onchange=()=>{
    const [feed,kill]=$('recipe').value.split(',');
    $('feed').value=feed; $('kill').value=kill;
    send('options',{feed:+feed,kill:+kill}); send('seed',{seed:+$('seed').value||1}); updateURL();
  };
  for(const id of ['feed','kill','sensor','angle','decay']) {
    const control=$(id);
    control.addEventListener('input',()=>{
      if(!control.checkValidity()) return;
      send('options',{[id]:id==='decay' ? +control.value/100:+control.value});
      if($(id+'Value')) $(id+'Value').value=control.value+(id==='angle' ? '°':id==='decay' ? '%':'');
      updateURL();
    });
    if($(id+'Value')) $(id+'Value').value=control.value+(id==='angle' ? '°':id==='decay' ? '%':'');
  }
  $('save').onclick=()=>send('save');
  $('restore').onclick=()=>{ setRunning(false); send('restore'); };
  $('loadPattern').onclick=()=>{
    setRunning(false);
    if($('pattern').value==='replicator') { $('rule').value='B36/S23'; applyRule(); }
    send('pattern',{name:$('pattern').value,clear:true});
    message($('pattern').value==='replicator' ? 'HighLife replicator. press play.':'pattern loaded. press play or step.');
  };
  $('stampPattern').onclick=()=>{ $('tool').value='stamp'; message('click the grid to place the selected pattern.'); };
  $('export').onclick=()=>send('export');
  $('import').onchange=async()=>{
    const file=$('import').files[0]; if(!file) return;
    if(file.size>1000000) { message('pattern file is too large.'); return; }
    setRunning(false); send('import',{text:await file.text()}); $('import').value='';
  };
  $('share').onclick=async()=>{
    const url=setupURL();
    try { await navigator.clipboard.writeText(url); message('setup link copied. cells and snapshots aren’t included.'); }
    catch { message(url); }
  };
  function zoomAt(x,y,factor) {
    const next=Math.max(Math.min(canvas.clientWidth/width,canvas.clientHeight/height)*.5,Math.min(64,zoom*factor));
    ox=x-(x-ox)*next/zoom; oy=y-(y-oy)*next/zoom; zoom=next; requestDraw();
  }
  canvas.addEventListener('wheel',e=>{
    e.preventDefault(); const rect=canvas.getBoundingClientRect();
    zoomAt(e.clientX-rect.left,e.clientY-rect.top,Math.exp(-e.deltaY*.0015));
  },{passive:false});
  function position(e) {
    const rect=canvas.getBoundingClientRect(); return {x:e.clientX-rect.left,y:e.clientY-rect.top};
  }
  function cellAt(p) { return {x:Math.floor((p.x-ox)/zoom),y:Math.floor((p.y-oy)/zoom)}; }
  function paintTo(cell) {
    const points=[];
    line(stroke.last.x,stroke.last.y,cell.x,cell.y,(x,y)=>{ if(x>=0&&x<width&&y>=0&&y<height) points.push(x,y); });
    if(points.length) send('paint',{points,value:stroke.value,radius:+$('brush').value});
    stroke.last=cell;
  }
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
    if(stroke || ![0,1,2].includes(e.button)) return;
    e.preventDefault(); canvas.focus(); canvas.setPointerCapture(e.pointerId);
    const p=position(e),cell=cellAt(p),tool=$('tool').value;
    const pan=e.button===1 || tool==='pan';
    stroke={id:e.pointerId,pan,start:p,ox,oy,last:cell,value:e.shiftKey||e.button===2||tool==='erase' ? 0 : tool==='wall' ? 2:tool==='food' ? 3:1};
    if(!pan) send('run',{running:false});
    if(tool==='stamp' && !pan) {
      const pattern=self.LifePatterns[$('pattern').value];
      send('pattern',{name:$('pattern').value,x:cell.x-Math.floor(pattern.width/2),y:cell.y-Math.floor(pattern.height/2)});
      stroke.stamp=true;
    } else if(!pan) paintTo(cell);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!stroke || stroke.id!==e.pointerId) return;
    const p=position(e);
    if(stroke.pan) { ox=stroke.ox+p.x-stroke.start.x; oy=stroke.oy+p.y-stroke.start.y; requestDraw(); }
    else if(!stroke.stamp) paintTo(cellAt(p));
  });
  function endStroke(e) {
    if(!stroke || stroke.id!==e.pointerId) return;
    stroke=null; send('run',{running});
  }
  for(const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event,endStroke);
  canvas.addEventListener('keydown',e=>{
    if([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key)) e.preventDefault(); else return;
    if(e.key===' ') setRunning(!running);
    else if(e.key==='0') fit();
    else if(e.key==='+'||e.key==='='||e.key==='-') zoomAt(canvas.clientWidth/2,canvas.clientHeight/2,e.key==='-' ? .8:1.25);
    else { ox+=e.key==='ArrowLeft' ? zoom*8:e.key==='ArrowRight' ? -zoom*8:0; oy+=e.key==='ArrowUp' ? zoom*8:e.key==='ArrowDown' ? -zoom*8:0; requestDraw(); }
  });
  let onScreen=true;
  function visibility() { send('visible',{visible:!document.hidden&&onScreen}); }
  document.addEventListener('visibilitychange',visibility);
  new IntersectionObserver(([entry])=>{ onScreen=entry.isIntersecting; visibility(); }).observe(canvas);
  configure(); visibility();
  if(currentMode!=='life' && !reduced.matches) setRunning(true);
})();
