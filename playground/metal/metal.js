(() => {
  const $=id=>document.getElementById(id),core=self.MetalCore;
  const sliders=['thorns','web','warp','weight','reach','symmetry'];
  const presets={
    roots:Object.fromEntries(sliders.map(key=>[key,core.defaults[key]])),
    web:{thorns:74,web:88,warp:58,weight:36,reach:80,symmetry:96},
    lost:{thorns:100,web:92,warp:88,weight:70,reach:96,symmetry:100}
  };
  const params=new URLSearchParams(location.search),initial={...core.defaults};
  for(const key of ['name','seed',...sliders]) if(params.has(key)) initial[key]=params.get(key);
  const state=core.normalise(initial);
  $('bandName').value=state.name;$('seed').value=state.seed;
  for(const key of sliders) $(key).value=state[key];
  $('ink').value=params.get('ink')==='black'?'black':'white';
  $('background').checked=params.get('background')==='1';
  let frame=0,urlTimer=0,logo=null,exporting=false;
  const message=text=>$('message').textContent=text;
  function read() {
    return core.normalise({name:$('bandName').value,seed:$('seed').value,...Object.fromEntries(sliders.map(key=>[key,$(key).value]))});
  }
  function url() {
    const query=new URLSearchParams(read());
    query.set('ink',$('ink').value);
    if($('background').checked) query.set('background','1');
    return location.origin+location.pathname+'?'+query;
  }
  function render() {
    frame=0;clearTimeout(urlTimer);
    if(!$('seed').checkValidity()) {
      $('saveSvg').disabled=$('savePng').disabled=$('share').disabled=true;
      message('seed must be a whole number from 0 to 4294967295.');return;
    }
    const settings=read(),start=performance.now();
    for(const key of sliders) {
      $(key+'Value').value=settings[key]+'%';
      $(key).setAttribute('aria-valuetext',settings[key]+'%');
    }
    $('preset').value=Object.keys(presets).find(name=>sliders.every(key=>presets[name][key]===settings[key]))||'custom';
    logo=core.generate(settings);
    $('metalStage').dataset.ink=$('ink').value;
    if(settings.name) $('preview').innerHTML=core.svg(logo,{dark:$('ink').value==='black'});
    else $('preview').innerHTML='<p>give it a name first.</p>';
    $('saveSvg').disabled=!settings.name;
    $('savePng').disabled=exporting||!settings.name;
    $('share').disabled=false;
    $('metalStats').textContent='seed '+settings.seed+' · '+logo.branches+' branches · '+logo.threads.length+' threads · '+(performance.now()-start).toFixed(1)+' ms';
    message(settings.name&&settings.name!==$('bandName').value.toUpperCase()?'drawing '+settings.name:'');
    urlTimer=setTimeout(()=>history.replaceState(null,'',url()),180);
  }
  function schedule() {if(!frame) frame=requestAnimationFrame(render);}
  for(const id of ['bandName','seed',...sliders]) $(id).addEventListener('input',schedule);
  $('ink').onchange=schedule;$('background').onchange=schedule;
  $('preset').onchange=()=>{
    const preset=presets[$('preset').value];if(!preset) return;
    for(const key of sliders) $(key).value=preset[key];schedule();
  };
  $('shuffle').onclick=()=>{
    $('seed').value=crypto.getRandomValues(new Uint32Array(1))[0];schedule();
  };
  $('reset').onclick=()=>{for(const key of sliders) $(key).value=core.defaults[key];schedule();};
  const exportSvg=()=>core.svg(logo,{dark:$('ink').value==='black',background:$('background').checked});
  function save(blob,extension,source=logo) {
    const link=document.createElement('a'),objectURL=URL.createObjectURL(blob);
    link.href=objectURL;link.download=(source.options.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'logo')+'-'+source.options.seed+'.'+extension;
    link.click();setTimeout(()=>URL.revokeObjectURL(objectURL),1000);
  }
  $('saveSvg').onclick=()=>{
    if(frame) {cancelAnimationFrame(frame);render();}
    if(!$('seed').checkValidity()) return;
    if(logo?.options.name) save(new Blob([exportSvg()],{type:'image/svg+xml'}),'svg');
  };
  $('savePng').onclick=()=>{
    if(frame) {cancelAnimationFrame(frame);render();}
    if(!$('seed').checkValidity()||exporting) return;
    if(!logo?.options.name) return;
    const exportedLogo=logo,source=URL.createObjectURL(new Blob([exportSvg()],{type:'image/svg+xml'})),image=new Image();
    exporting=true;$('savePng').disabled=true;
    const done=()=>{exporting=false;$('savePng').disabled=!logo?.options.name||!$('seed').checkValidity();};
    image.onload=()=>{
      URL.revokeObjectURL(source);
      const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1240;
      canvas.getContext('2d').drawImage(image,0,0,2400,1240);
      canvas.toBlob(blob=>{if(blob) save(blob,'png',exportedLogo);else message('could not make the png. try the svg.');done();},'image/png');
    };
    image.onerror=()=>{URL.revokeObjectURL(source);done();message('could not make the png. try the svg.');};
    image.src=source;
  };
  $('share').onclick=async()=>{
    try {await navigator.clipboard.writeText(url());message('setup link copied.');}
    catch {message(url());}
  };
  render();
})();
