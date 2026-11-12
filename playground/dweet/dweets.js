(() => {
  const $=id=>document.getElementById(id);
  const input=$('dweetInput'),output=$('jsOut'),frame=$('vizFrame');
  const examples={
    bars:'c.width=1920;for(i=0;i<9;i++)x.fillRect(400+i*100+S(t)*300,400,50,200)',
    spiral:'c.width=1920;for(i=600;i--;)x.fillStyle=R(30+i/3,120,180),x.fillRect(960+S(i/12+t)*i,540+C(i/12+t)*i,4,4)',
    waves:'c.width=1920;for(i=120;i--;)x.fillStyle=R(180+75*S(i/9+t),90,130),x.fillRect(i*16,540+S(i/12+t)*160,10,10)'
  };
  const draftKey='dweet-unpacker-v2',motion=matchMedia('(prefers-reduced-motion: reduce)');
  let token='',serial=0,ready=false,busy=false,running=false,active=false,onscreen=true;
  let elapsed=0,lastRendered=0,lastTimestamp=null,raf=0,watchdog=0,saveTimer=0,snapshot=null;
  const error=$('previewError'),status=$('previewStatus'),note=$('conversionNote');
  const visible=()=>!document.hidden&&onscreen;
  function controls() {
    $('pauseBtn').disabled=!ready;$('pauseBtn').textContent=running?'pause':'resume';
    $('stepBtn').disabled=!ready||running||busy;
    $('restartBtn').disabled=!snapshot;$('stopBtn').disabled=!active;
  }
  function cancel() {cancelAnimationFrame(raf);raf=0;clearTimeout(watchdog);busy=false;lastTimestamp=null;}
  function stop(message='preview stopped') {
    if(active) frame.contentWindow.postMessage({token,type:'stop'},'*');
    cancel();active=false;ready=false;running=false;token='';status.textContent=message;controls();
  }
  function fail(message) {stop('preview stopped');error.textContent=message;error.hidden=false;}
  function schedule() {
    if(!raf&&ready&&running&&!busy&&visible()) raf=requestAnimationFrame(pump);
  }
  function pump(timestamp) {
    raf=0;
    if(!ready||!running||!visible()) {lastTimestamp=null;return;}
    if(lastTimestamp!==null) elapsed+=Math.min(timestamp-lastTimestamp,100);
    lastTimestamp=timestamp;
    if(elapsed-lastRendered>=1000/60-.2) render();else schedule();
  }
  function render() {
    if(!ready||busy) return;
    busy=true;lastRendered=elapsed;controls();
    watchdog=setTimeout(()=>fail('frame took too long; stopped. try fewer iterations.'),1000);
    frame.contentWindow.postMessage({token,type:'frame',time:elapsed},'*');
  }
  function start(mode,source,animate=true) {
    stop();snapshot={mode,source};elapsed=0;lastRendered=0;active=true;running=animate;
    token='dweet-'+(++serial);error.hidden=true;error.textContent='';status.textContent='starting preview…';
    frame.srcdoc=DweetRuntime.frameDocument(token);
    watchdog=setTimeout(()=>fail('preview did not start. this browser needs OffscreenCanvas and web workers.'),4000);
    controls();
  }
  addEventListener('message',event=>{
    const m=event.data;
    if(event.source!==frame.contentWindow||!active||!m?.dweet||m.token!==token) return;
    if(m.type==='boot') frame.contentWindow.postMessage({token,type:'init',...snapshot},'*');
    else if(m.type==='ready') {
      clearTimeout(watchdog);ready=true;render();
    } else if(m.type==='frame') {
      clearTimeout(watchdog);busy=false;
      status.textContent=(snapshot.mode==='source'?'dweet':'edited js')+' · '+(running?'playing':'paused')+' · '+(elapsed/1000).toFixed(2)+'s · '+m.width+' × '+m.height;
      controls();schedule();
    } else if(m.type==='error') fail(m.message);
  });
  function save() {
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{try{localStorage.setItem(draftKey,JSON.stringify({source:input.value,output:output.value}));}catch{}},200);
  }
  function count() {
    const length=[...input.value].length;
    $('charCount').textContent=length+' chars'+(length>140?' · no limit here':'');
  }
  function runSource(animate=true) {
    if(!input.value.trim()) {fail('paste a dweet first.');return;}
    try {
      const result=DweetCore.unpack(input.value);
      new Function('t',result.body);
      new Function(result.code);
      output.value=result.code;
      output.setSelectionRange(0,0);output.scrollTop=0;output.scrollLeft=0;
      note.textContent=(result.changes.length?'expanded '+result.changes.join(', ')+'. ':'spaced out the original code. ')+result.notes.join(' ');
      save();start('source',result.body,animate);
    } catch(problem) {fail(problem.name+': '+problem.message);}
  }
  function runEdited() {
    if(!output.value.trim()) {fail('unpack a dweet or paste some javascript first.');return;}
    try {new Function(output.value);start('plain',output.value);}
    catch(problem) {fail(problem.name+': '+problem.message);}
  }
  $('runBtn').onclick=()=>runSource();
  $('runEditedBtn').onclick=runEdited;
  $('exampleBtn').onclick=()=>{input.value=examples[$('example').value];count();runSource();};
  $('clearBtn').onclick=()=>{
    stop();snapshot=null;input.value='';output.value='';note.textContent='';error.hidden=true;count();controls();save();input.focus();
  };
  input.addEventListener('input',()=>{count();note.textContent='source changed. unpack & run to update the readable version.';save();});
  output.addEventListener('input',()=>{note.textContent='readable version edited. run edited javascript to preview it.';save();});
  for(const editor of [input,output]) editor.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key==='Enter') {event.preventDefault();editor===input?runSource():runEdited();}
    else if(event.key==='Tab'&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey) {
      event.preventDefault();editor.setRangeText('  ',editor.selectionStart,editor.selectionEnd,'end');
      editor.dispatchEvent(new Event('input'));
    }
  });
  $('pauseBtn').onclick=()=>{
    running=!running;lastTimestamp=null;
    if(!running) {cancelAnimationFrame(raf);raf=0;} else schedule();
    status.textContent=status.textContent.replace(/playing|paused/,running?'playing':'paused');controls();
  };
  $('stepBtn').onclick=()=>{if(ready&&!running&&!busy) {elapsed+=1000/60;render();}};
  $('restartBtn').onclick=()=>{if(snapshot) start(snapshot.mode,snapshot.source,running);};
  $('stopBtn').onclick=()=>stop();
  $('copyBtn').onclick=async()=>{
    if(!output.value) return;
    try {await navigator.clipboard.writeText(output.value);note.textContent='copied.';}
    catch {output.focus();output.select();note.textContent='select all is ready; ctrl + c to copy.';}
  };
  $('downloadBtn').onclick=()=>{
    if(!output.value) return;
    const url=URL.createObjectURL(new Blob([output.value+'\n'],{type:'text/javascript'})),link=document.createElement('a');
    link.href=url;link.download='dweet.js';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const visibility=()=>{
    lastTimestamp=null;
    if(!visible()) {cancelAnimationFrame(raf);raf=0;} else schedule();
  };
  document.addEventListener('visibilitychange',visibility);
  if('IntersectionObserver' in window) new IntersectionObserver(entries=>{onscreen=entries[0].isIntersecting;visibility();}).observe(frame);
  motion.addEventListener('change',()=>{if(motion.matches&&running) $('pauseBtn').click();});
  addEventListener('pagehide',()=>{stop();clearTimeout(saveTimer);try{localStorage.setItem(draftKey,JSON.stringify({source:input.value,output:output.value}));}catch{}});
  let draft;
  try {draft=JSON.parse(localStorage.getItem(draftKey));}catch{}
  input.value=typeof draft?.source==='string'?draft.source:examples.bars;
  count();
  if(typeof draft?.output==='string'&&draft.output) {
    output.value=draft.output;note.textContent='restored your editors. run either one to preview it.';
  } else if(input.value.trim()) runSource(!motion.matches);
})();
