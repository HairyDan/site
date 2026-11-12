(() => {
  const stops=[
    [[5,14,24],[13,52,71],[21,119,130],[103,187,170],[237,220,169],[200,108,66],[5,14,24]],
    [[12,8,19],[65,24,63],[150,52,61],[231,126,67],[255,222,162],[100,46,66],[12,8,19]],
    [[12,19,23],[66,78,83],[154,170,173],[246,241,223],[154,170,173],[66,78,83],[12,19,23]]
  ];
  function palette(index) {
    const result=new Uint8Array(1024*4),colours=stops[index]||stops[0];
    for(let i=0;i<1024;i++) {
      const at=i/1024*6,k=Math.floor(at),t=at-k;
      for(let c=0;c<3;c++) result[i*4+c]=Math.round(colours[k][c]*(1-t)+colours[k+1][c]*t);
      result[i*4+3]=255;
    }
    return result;
  }
  function escape(x,y,kind,max,jx=-.8,jy=.156) {
    if(kind===5) return newton(x,y,max);
    if(kind===0) {
      const a=x-.25,q=a*a+y*y;
      if(q*(q+a)<=.25*y*y || (x+1)*(x+1)+y*y<=.0625) return -1;
    }
    let cr=kind===1 ? jx:x,ci=kind===1 ? jy:y;
    let zr=kind===1 ? x:0,zi=kind===1 ? y:0,n=0,zr2=zr*zr,zi2=zi*zi;
    while(n<max && zr2+zi2<=256) {
      if(kind===2) { zr=Math.abs(zr); zi=Math.abs(zi); }
      const real=kind===4 ? zr*(zr2-3*zi2)+cr:zr2-zi2+cr;
      zi=kind===4 ? zi*(3*zr2-zi2)+ci:(kind===3 ? -2:2)*zr*zi+ci;
      zr=real;
      zr2=zr*zr; zi2=zi*zi; n++;
    }
    return n===max ? -1:Math.max(0,n+1-Math.log2(Math.log2(Math.sqrt(zr2+zi2)))/(kind===4 ? Math.log2(3):1));
  }
  function newton(zr,zi,max) {
    for(let n=0;n<max;n++) {
      const root=zr>0 ? 0:zi>=0 ? 1:2;
      const rx=root===0 ? 1:-.5,ry=root===0 ? 0:root===1 ? Math.sqrt(3)/2:-Math.sqrt(3)/2;
      if((zr-rx)**2+(zi-ry)**2<1e-10) return 5+root*13+Math.min(n,60)*.1;
      const a=zr*zr-zi*zi,b=2*zr*zi,d=a*a+b*b;
      if(d<1e-24 || !Number.isFinite(d)) return -1;
      zr=(2*zr+a/d)/3;zi=(2*zi-b/d)/3;
    }
    return -1;
  }
  self.FractalCore={palette,escape,newton};
})();
