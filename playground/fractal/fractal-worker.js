importScripts('fractal-core.js');
let current=0;
const buffers=[];
self.onmessage=({data:m})=>{
  if(m.type==='recycle') { if(buffers.length<3) buffers.push(m.pixels); return; }
  current=m.id;
  if(m.type==='cancel') return;
  const id=m.id,{width,height,centerX,centerY,scale,kind,limit,jx,jy,palette}=m;
  const index=buffers.findIndex(buffer=>buffer.byteLength===width*height*4);
  const buffer=index>=0 ? buffers.splice(index,1)[0]:new ArrayBuffer(width*height*4);
  const out=new Uint32Array(buffer),colours=new Uint32Array(self.FractalCore.palette(palette).buffer);
  let row=0; const start=performance.now();
  function chunk() {
    if(id!==current) { if(buffers.length<3) buffers.push(buffer); return; }
    const deadline=performance.now()+6;
    do {
      const y=centerY+((row+.5)/height-.5)*scale*height/width;
      for(let x=0;x<width;x++) {
        const cr=centerX+((x+.5)/width-.5)*scale;
        const n=self.FractalCore.escape(cr,y,kind,limit,jx,jy);
        out[row*width+x]=n<0 ? 0xff160d08:colours[((n*25.6)|0)&1023];
      }
      row++;
    } while(row<height && performance.now()<deadline);
    if(row<height) setTimeout(chunk,0);
    else self.postMessage({id,pixels:buffer,width,height,elapsed:performance.now()-start},[buffer]);
  }
  chunk();
};
