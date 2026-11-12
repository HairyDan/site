(() => {
  function workerRuntime() {
    const emit=self.postMessage.bind(self);
    let mode,canvas,context,callbacks=new Map(),nextId=1;
    const styles={background:'#fff'};
    self.requestAnimationFrame=callback=>{const id=nextId++;callbacks.set(id,callback);return id;};
    self.cancelAnimationFrame=id=>callbacks.delete(id);
    const colour=(red=0,green=0,blue=0,alpha=1)=>'rgba('+(red|0)+','+(green|0)+','+(blue|0)+','+alpha+')';
    self.onmessage=({data:m})=>{
      try {
        if(m.type==='init') {
          mode=m.mode;const surface=m.canvas,rawContext=surface.getContext('2d'),methods=new Map();
          context=new Proxy(rawContext,{
            get:(target,key)=>{
              if(key==='canvas') return canvas;
              const value=Reflect.get(target,key,target);
              if(typeof value!=='function') return value;
              if(!methods.has(key)) methods.set(key,['drawImage','createPattern'].includes(key)
                ? (source,...args)=>value.call(target,source===canvas?surface:source,...args)
                : value.bind(target));
              return methods.get(key);
            },
            set:(target,key,value)=>Reflect.set(target,key,value,target)
          });
          const style=new Proxy(styles,{
            get:(target,key)=>target[key]||'',
            set:(target,key,value)=>{value=String(value);if(target[key]!==value){target[key]=value;emit({type:'style',key,value});}return true;}
          });
          canvas=new Proxy(surface,{
            get:(target,key)=>{
              if(key==='style') return style;
              if(key==='getContext') return kind=>kind==='2d' ? context:null;
              const value=Reflect.get(target,key,target);
              return typeof value==='function' ? value.bind(target):value;
            },
            set:(target,key,value)=>Reflect.set(target,key,value,target)
          });
          Object.assign(self,{c:canvas,x:context,S:Math.sin,C:Math.cos,T:Math.tan,R:colour,PI:Math.PI});
          self.document={
            getElementById:id=>['canvas','c'].includes(id) ? canvas:null,
            querySelector:selector=>['canvas','#canvas','#c'].includes(selector) ? canvas:null
          };
          if(mode==='source') self.u=new Function('t',m.source);
          else new Function(m.source)();
          emit({type:'ready'});return;
        }
        if(m.type==='frame') {
          const started=performance.now();
          if(mode==='source') self.u(m.time/1000);
          else {
            const queue=[...callbacks.values()];callbacks.clear();
            for(const callback of queue) callback(m.time);
          }
          emit({type:'frame',elapsed:performance.now()-started,width:canvas.width,height:canvas.height});
        }
      } catch(error) {emit({type:'error',message:error.name+': '+error.message});}
    };
    self.addEventListener('unhandledrejection',event=>emit({type:'error',message:String(event.reason)}));
  }
  function frameBootstrap(token,runtime) {
    const canvas=document.querySelector('canvas');
    const post=data=>parent.postMessage({dweet:true,token,...data},'*');
    let worker=null;
    addEventListener('message',event=>{
      if(event.source!==parent || event.data?.token!==token) return;
      const m=event.data;
      if(m.type==='init' && !worker) {
        try {
          if(!canvas.transferControlToOffscreen || !window.Worker) throw new Error('this browser needs OffscreenCanvas and web workers for the preview.');
          const url=URL.createObjectURL(new Blob(['('+runtime.toString()+')()'],{type:'text/javascript'}));
          worker=new Worker(url);URL.revokeObjectURL(url);
          worker.onmessage=({data})=>{
            if(data.type==='style') {
              if(['filter','background','backgroundColor','opacity','mixBlendMode','transform','transformOrigin','imageRendering'].includes(data.key)) canvas.style[data.key]=data.value;
            } else post(data);
          };
          worker.onerror=event=>post({type:'error',message:event.message||'preview worker failed.'});
          const offscreen=canvas.transferControlToOffscreen();
          worker.postMessage({type:'init',mode:m.mode,source:m.source,canvas:offscreen},[offscreen]);
        } catch(error) {post({type:'error',message:error.message});}
      } else if(m.type==='frame') worker?.postMessage(m);
      else if(m.type==='stop') {worker?.terminate();worker=null;post({type:'stopped'});}
    });
    post({type:'boot'});
  }
  function frameDocument(token) {
    const script='('+frameBootstrap.toString()+')('+JSON.stringify(token)+','+workerRuntime.toString()+');';
    return '<!doctype html><html><head><meta charset="utf-8">'+
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' \'unsafe-eval\' blob:; worker-src blob:; style-src \'unsafe-inline\'; img-src data: blob:; connect-src \'none\';">'+
      '<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#fff}canvas{display:block;width:100%;height:100%;object-fit:contain;background:#fff}</style>'+
      '</head><body><canvas id="canvas" width="1920" height="1080"></canvas><script>'+script.replace(/<\/script/gi,'<\\/script')+'<\/script></body></html>';
  }
  self.DweetRuntime={frameDocument,workerRuntime};
})();
