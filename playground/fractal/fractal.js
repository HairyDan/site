(() => {
  const $=id=>document.getElementById(id),stage=$('fractalStage'),canvas=$('mb'),cpu=$('cpu');
  const cpuContext=cpu.getContext('2d',{alpha:false});
  const view={x:-.7435,y:.1314,scale:.009,kind:0,limit:512,palette:0,jx:-.8,jy:.156};
  const params=new URLSearchParams(location.search);
  for(const key of ['x','y','scale','kind','limit','palette','jx','jy']) {
    if(params.has(key) && Number.isFinite(+params.get(key))) view[key]=+params.get(key);
  }
  view.x=Math.max(-4,Math.min(4,view.x)); view.y=Math.max(-4,Math.min(4,view.y));
  view.scale=Math.max(1e-11,Math.min(6,view.scale));
  view.kind=Math.max(0,Math.min(5,Math.round(view.kind)));
  view.palette=Math.max(0,Math.min(2,Math.round(view.palette)));
  view.limit=Math.max(64,Math.min(2048,Math.round(view.limit/64)*64));
  view.jx=Math.max(-2,Math.min(2,view.jx)); view.jy=Math.max(-2,Math.min(2,view.jy));
  let gl,program,uniforms,texture,gpuReady=false,fence=null,worker=null,serial=0,raf=0,refine,previewWanted=true;
  const pointers=new Map();
  const places=self.FractalPlaces,home=['overview','julia','ship','tricorn','cubic','newton'];
  const detours=['newton','rabbit','ship-detail','cubic','tricorn','dust','seahorse','spiral','basilica'];
  let detour=0,mandelbrotReturn=null;
  function message(text) { $('fractalMessage').textContent=text; }
  function initGPU() {
    gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
    if(!gl) return;
    const vertex=`#version 300 es
      void main() {
        vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
        gl_Position=vec4(p*2.0-1.0,0.0,1.0);
      }`;
    const fragment=`#version 300 es
      precision highp float;
      precision highp int;
      uniform vec2 resolution,center,julia;
      uniform float scale;
      uniform int kind,limit;
      uniform sampler2D colours;
      out vec4 outputColour;
      float newton(vec2 z) {
        for(int n=0;n<2048;n++) {
          if(n>=limit) break;
          int root=z.x>0.0 ? 0:z.y>=0.0 ? 1:2;
          vec2 r=root==0 ? vec2(1.0,0.0):vec2(-.5,root==1 ? .866025403784:-.866025403784);
          if(dot(z-r,z-r)<1e-10) return 5.0+float(root)*13.0+float(min(n,60))*.1;
          vec2 square=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y);
          float d=dot(square,square);
          if(d<1e-24 || isinf(d) || isnan(d)) return -1.0;
          z=(2.0*z+vec2(square.x,-square.y)/d)/3.0;
        }
        return -1.0;
      }
      void main() {
        vec2 pos=center+vec2((gl_FragCoord.x/resolution.x-.5)*scale,(.5-gl_FragCoord.y/resolution.y)*scale*resolution.y/resolution.x);
        if(kind==5) {
          float basin=newton(pos);
          outputColour=basin<0.0 ? vec4(.03137,.05098,.08627,1.0):texture(colours,vec2(fract(basin*.025),.5));
          return;
        }
        vec2 z=kind==1 ? pos:vec2(0.0);
        vec2 c=kind==1 ? julia:pos;
        bool inside=false;
        if(kind==0) {
          float a=pos.x-.25,q=a*a+pos.y*pos.y;
          inside=q*(q+a)<=.25*pos.y*pos.y || dot(pos+vec2(1.0,0.0),pos+vec2(1.0,0.0))<=.0625;
        }
        if(inside) { outputColour=vec4(.03137,.05098,.08627,1.0); return; }
        int n=0;
        for(int i=0;i<2048;i++) {
          if(i>=limit || dot(z,z)>256.0) break;
          if(kind==2) z=abs(z);
          if(kind==3) z.y=-z.y;
          if(kind==4) z=vec2(z.x*(z.x*z.x-3.0*z.y*z.y),z.y*(3.0*z.x*z.x-z.y*z.y))+c;
          else z=vec2(z.x*z.x-z.y*z.y,2.0*z.x*z.y)+c;
          n++;
        }
        if(n>=limit) outputColour=vec4(.03137,.05098,.08627,1.0);
        else {
          float mu=max(0.0,float(n)+1.0-log2(log2(length(z)))/(kind==4 ? log2(3.0):1.0));
          outputColour=texture(colours,vec2(fract(mu*.025),.5));
        }
      }`;
    function shader(type,source) {
      const result=gl.createShader(type); gl.shaderSource(result,source); gl.compileShader(result);
      if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)) { gl.deleteShader(result); throw new Error('shader unavailable'); }
      return result;
    }
    const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
    program=gl.createProgram(); gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('GPU program unavailable');
    uniforms={};
    for(const name of ['resolution','center','julia','scale','kind','limit','colours']) uniforms[name]=gl.getUniformLocation(program,name);
    texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gpuReady=true; updatePalette();
  }
  function updatePalette() {
    if(!gpuReady) return;
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1024,1,0,gl.RGBA,gl.UNSIGNED_BYTE,self.FractalCore.palette(view.palette));
  }
  try { initGPU(); } catch { gpuReady=false; }
  canvas.addEventListener('webglcontextlost',e=>{ e.preventDefault(); gpuReady=false; fence=null; message('GPU context lost; using the worker.'); schedule(); });
  canvas.addEventListener('webglcontextrestored',()=>{ try { initGPU(); } catch { gpuReady=false; } schedule(); });
  function syncControls() {
    $('kind').value=String(view.kind); $('iters').value=view.limit; $('iterValue').value=view.limit;
    $('palette').value=String(view.palette);
    $('juliaX').value=view.jx; $('juliaY').value=view.jy; $('juliaControls').hidden=view.kind!==1;
    $('juliaHere').hidden=view.kind!==0;
    $('backToMap').hidden=view.kind!==1||!mandelbrotReturn;
  }
  function status(renderer,elapsed,preview) {
    $('stats').textContent=renderer+' · '+elapsed.toFixed(1)+' ms / frame · '+(3.4/view.scale).toExponential(2)+'×'+(preview ? ' · preview':'');
  }
  function getWorker() {
    if(worker) return worker;
    worker=new Worker('fractal-worker.js');
    worker.onmessage=({data:m})=>{
      if(m.id===serial) {
        if(cpu.width!==m.width) cpu.width=m.width;
        if(cpu.height!==m.height) cpu.height=m.height;
        cpuContext.putImageData(new ImageData(new Uint8ClampedArray(m.pixels),m.width,m.height),0,0);
        status('CPU worker',m.elapsed,cpu.dataset.preview==='true');
      }
      worker.postMessage({type:'recycle',pixels:m.pixels},[m.pixels]);
    };
    worker.onerror=()=>message('renderer couldn’t start. reload to try again.');
    return worker;
  }
  function draw(preview) {
    const id=++serial,dpr=Math.min(devicePixelRatio||1,1.5),ratio=preview ? .5:1;
    const width=Math.max(1,Math.round(stage.clientWidth*dpr*ratio)),height=Math.max(1,Math.round(stage.clientHeight*dpr*ratio));
    const useGPU=gpuReady && view.scale>=.0005;
    canvas.hidden=!useGPU; cpu.hidden=useGPU;
    if(useGPU) {
      if(worker) worker.postMessage({type:'cancel',id});
      if(canvas.width!==width) canvas.width=width;
      if(canvas.height!==height) canvas.height=height;
      gl.viewport(0,0,width,height); gl.useProgram(program);
      gl.uniform2f(uniforms.resolution,width,height); gl.uniform2f(uniforms.center,view.x,view.y);
      gl.uniform2f(uniforms.julia,view.jx,view.jy); gl.uniform1f(uniforms.scale,view.scale);
      gl.uniform1i(uniforms.kind,view.kind); gl.uniform1i(uniforms.limit,preview ? Math.min(256,view.limit):view.limit);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture); gl.uniform1i(uniforms.colours,0);
      const start=performance.now();
      gl.drawArrays(gl.TRIANGLES,0,3);
      if(fence) gl.deleteSync(fence);
      fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0); gl.flush();
      const check=()=>{
        if(id!==serial || !gpuReady) return;
        const result=gl.clientWaitSync(fence,0,0);
        if(result===gl.TIMEOUT_EXPIRED) { requestAnimationFrame(check); return; }
        gl.deleteSync(fence); fence=null;
        if(result===gl.WAIT_FAILED) { gpuReady=false; schedule(); return; }
        status('GPU',performance.now()-start,preview);
      };
      requestAnimationFrame(check);
    } else {
      cpu.dataset.preview=String(preview);
      message(gpuReady ? 'deep zoom · double precision':'');
      getWorker().postMessage({id,width,height,centerX:view.x,centerY:view.y,scale:view.scale,kind:view.kind,limit:preview ? Math.min(256,view.limit):view.limit,jx:view.jx,jy:view.jy,palette:view.palette});
    }
    if(useGPU) message('');
    if(!preview) history.replaceState(null,'',viewURL());
  }
  function schedule() {
    const place=Object.keys(places).find(name=>{ const p=places[name]; return p.kind===view.kind && p.x===view.x && p.y===view.y && p.scale===view.scale && (p.jx===undefined || (p.jx===view.jx && p.jy===view.jy)); });
    $('place').value=place||'custom';
    const story=place ? places[place].note:self.FractalNotes[view.kind];
    if($('fractalStory').textContent!==story) $('fractalStory').textContent=story;
    previewWanted=true;
    if(!raf) raf=requestAnimationFrame(()=>{ raf=0; draw(previewWanted); });
    clearTimeout(refine);
    refine=setTimeout(()=>{
      previewWanted=false;
      if(!raf) raf=requestAnimationFrame(()=>{ raf=0; draw(false); });
    },130);
  }
  function viewURL() {
    const query=new URLSearchParams();
    for(const key of ['x','y','scale','kind','limit','palette','jx','jy']) query.set(key,String(view[key]));
    return location.origin+location.pathname+'?'+query;
  }
  function setPlace(name) {
    const {note,...settings}=places[name]||places.overview;
    Object.assign(view,settings);
    syncControls(); schedule();
  }
  $('place').onchange=()=>{ if($('place').value!=='custom') setPlace($('place').value); };
  $('kind').onchange=()=>setPlace(home[+$('kind').value]);
  $('detour').onclick=()=>setPlace(detours[detour++%detours.length]);
  function enterJulia(x,y) {
    mandelbrotReturn={...view};
    Object.assign(view,{x:0,y:0,scale:3.2,kind:1,jx:x,jy:y});syncControls();schedule();
  }
  $('juliaHere').onclick=()=>enterJulia(view.x,view.y);
  $('backToMap').onclick=()=>{Object.assign(view,mandelbrotReturn);syncControls();schedule();};
  $('iters').oninput=()=>{ view.limit=+$('iters').value; $('iterValue').value=view.limit; schedule(); };
  $('palette').onchange=()=>{ view.palette=+$('palette').value; updatePalette(); schedule(); };
  for(const id of ['juliaX','juliaY']) $(id).oninput=()=>{
    if(!$(id).checkValidity()) return;
    view[id==='juliaX' ? 'jx':'jy']=+$(id).value; schedule();
  };
  function zoomAt(px,py,factor) {
    const scale=Math.max(1e-11,Math.min(6,view.scale*factor)),w=stage.clientWidth,h=stage.clientHeight;
    view.x+=(px/w-.5)*(view.scale-scale);
    view.y+=(py/h-.5)*(view.scale-scale)*h/w;
    view.scale=scale; schedule();
    if(scale===1e-11) message('double-precision zoom limit reached.');
  }
  const zoom=factor=>zoomAt(stage.clientWidth/2,stage.clientHeight/2,factor);
  $('zoomIn').onclick=()=>zoom(.5); $('zoomOut').onclick=()=>zoom(2);
  $('reset').onclick=()=>setPlace(home[view.kind]);
  $('share').onclick=async()=>{
    const url=viewURL();
    try { await navigator.clipboard.writeText(url); message('view link copied.'); }
    catch { message(url); }
  };
  function point(e) { const r=stage.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  stage.addEventListener('wheel',e=>{ e.preventDefault(); const p=point(e); zoomAt(p.x,p.y,Math.exp(Math.max(-1,Math.min(1,e.deltaY*.0015)))); },{passive:false});
  stage.addEventListener('dblclick',e=>{ const p=point(e); zoomAt(p.x,p.y,.4); });
  stage.addEventListener('pointerdown',e=>{
    if(e.button!==0) return;
    if(e.shiftKey&&view.kind===0) {
      e.preventDefault();const p=point(e);
      enterJulia(view.x+(p.x/stage.clientWidth-.5)*view.scale,view.y+(p.y/stage.clientHeight-.5)*view.scale*stage.clientHeight/stage.clientWidth);return;
    }
    stage.focus(); e.preventDefault(); stage.setPointerCapture(e.pointerId); pointers.set(e.pointerId,point(e));
  });
  stage.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)) return;
    const old=[...pointers.values()],previous=pointers.get(e.pointerId),next=point(e);
    pointers.set(e.pointerId,next);
    if(pointers.size===1) {
      view.x-=(next.x-previous.x)/stage.clientWidth*view.scale;
      view.y-=(next.y-previous.y)/stage.clientWidth*view.scale; schedule();
    } else if(pointers.size===2) {
      const points=[...pointers.values()];
      const oldDistance=Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y);
      const distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
      const mx=(points[0].x+points[1].x)/2,my=(points[0].y+points[1].y)/2;
      if(distance>1 && oldDistance>1) zoomAt(mx,my,oldDistance/distance);
      view.x-=(mx-(old[0].x+old[1].x)/2)/stage.clientWidth*view.scale;
      view.y-=(my-(old[0].y+old[1].y)/2)/stage.clientWidth*view.scale;
    }
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']) stage.addEventListener(type,e=>pointers.delete(e.pointerId));
  stage.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key)) return;
    e.preventDefault();
    if(e.key==='0') { $('reset').click(); return; }
    if(e.key==='+' || e.key==='=') { zoom(.5); return; }
    if(e.key==='-') { zoom(2); return; }
    const delta=view.scale*.08;
    view.x+=e.key==='ArrowLeft' ? -delta:e.key==='ArrowRight' ? delta:0;
    view.y+=e.key==='ArrowUp' ? -delta:e.key==='ArrowDown' ? delta:0; schedule();
  });
  new ResizeObserver(schedule).observe(stage);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) schedule(); });
  syncControls(); schedule();
})();
