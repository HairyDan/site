(() => {
  const WIDTH=1200,HEIGHT=620;
  const defaults={name:'MORTAL COIL',seed:42,thorns:82,web:62,warp:68,weight:68,reach:82,symmetry:95};
  const alphabet={
    A:'0,1 .48,0 1,1|.2,.62 .8,.62',B:'0,1 0,0 .65,0 1,.2 .65,.48 0,.48|.65,.48 1,.73 .7,1 0,1',
    C:'1,.12 .72,0 .15,.12 0,.5 .15,.88 .72,1 1,.88',D:'0,1 0,0 .6,0 1,.3 1,.7 .6,1 0,1',
    E:'1,0 0,0 0,1 1,1|0,.48 .8,.48',F:'0,1 0,0 1,0|0,.48 .8,.48',
    G:'1,.12 .7,0 .15,.12 0,.5 .15,.88 .75,1 1,.75 1,.5 .58,.5',H:'0,0 0,1|1,0 1,1|0,.5 1,.5',
    I:'0,0 1,0|.5,0 .5,1|0,1 1,1',J:'0,0 1,0 1,.8 .65,1 .2,.9 0,.65',
    K:'0,0 0,1|1,0 0,.54 1,1',L:'0,0 0,1 1,1',M:'0,1 0,0 .5,.55 1,0 1,1',
    N:'0,1 0,0 1,1 1,0',O:'.5,0 1,.2 1,.8 .5,1 0,.8 0,.2 .5,0',
    P:'0,1 0,0 .7,0 1,.24 .7,.5 0,.5',Q:'.5,0 1,.2 1,.8 .5,1 0,.8 0,.2 .5,0|.55,.65 1.1,1.1',
    R:'0,1 0,0 .7,0 1,.24 .7,.5 0,.5|.5,.5 1,1',
    S:'1,.12 .7,0 .1,.15 0,.35 1,.65 .9,.9 .3,1 0,.88',
    T:'0,0 1,0|.5,0 .5,1',U:'0,0 0,.8 .5,1 1,.8 1,0',
    V:'0,0 .5,1 1,0',W:'0,0 .2,1 .5,.48 .8,1 1,0',X:'0,0 1,1|1,0 0,1',
    Y:'0,0 .5,.5 1,0|.5,.5 .5,1',Z:'0,0 1,0 0,1 1,1',
    '0':'.5,0 1,.2 1,.8 .5,1 0,.8 0,.2 .5,0|.15,.85 .85,.15',
    '1':'0,.2 .55,0 .55,1|0,1 1,1','2':'0,.15 .5,0 1,.2 .9,.45 0,1 1,1',
    '3':'0,0 1,0 .5,.48 1,.7 .7,1 0,.9|.25,.48 .5,.48',
    '4':'.8,1 .8,0 0,.65 1,.65','5':'1,0 0,0 0,.5 .7,.5 1,.7 .8,1 0,.9',
    '6':'.9,0 .2,.12 0,.7 .25,1 .8,1 1,.7 .75,.5 .05,.5',
    '7':'0,0 1,0 .2,1','8':'.5,0 1,.2 .5,.5 0,.2 .5,0|.5,.5 1,.78 .5,1 0,.78 .5,.5',
    '9':'1,.5 .25,.5 0,.25 .25,0 .8,0 1,.3 1,.9 .2,1',
    '&':'1,1 .1,.25 .3,0 .7,.05 .8,.3 0,.7 .15,1 .65,.9 1,.55',
    '-':'0,.5 1,.5',"'":'.6,0 .4,.22'
  };
  const glyphs=Object.fromEntries(Object.entries(alphabet).map(([key,value])=>[key,value.split('|').map(path=>path.split(' ').map(pair=>pair.split(',').map(Number)))]));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const cleanName=value=>String(value).normalize('NFKD').toUpperCase().replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 &'-]/g,'').replace(/\s+/g,' ').trim().slice(0,24).trim();
  function normalise(input={}) {
    const result={name:cleanName(input.name??defaults.name)};
    for(const key of ['seed','thorns','web','warp','weight','reach','symmetry']) {
      const value=input[key]===undefined ? defaults[key]:Number(input[key]);
      result[key]=Math.round(clamp(Number.isFinite(value)?value:defaults[key],0,key==='seed'?4294967295:100));
    }
    return result;
  }
  function random(seed) {
    let state=seed>>>0;
    return ()=>{
      let t=state+=0x6D2B79F5;
      t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function generate(input) {
    const options=normalise(input),rng=random(options.seed),outlines=[],threads=[],nodes=[],tips=[];
    const phase=rng()*Math.PI*2,warp=options.warp/100;
    const widthOf=letter=>letter===' '? .55:letter==='I'||letter==="'"?.48:letter==='M'||letter==='W'?1.2:1;
    const units=[...options.name].reduce((sum,letter)=>sum+widthOf(letter)+.13,0)-.13;
    if(!options.name) return {options,outlines,threads,branches:0,width:WIDTH,height:HEIGHT};
    const unit=Math.min(96,880/units),height=Math.min(190,unit*2.1),left=(WIDTH-units*unit)/2,top=310-height/2;
    const weight=2.5+options.weight*.15,reach=35+options.reach*1.6;
    let group=0,branches=0;
    const shape=(x,y)=>{
      const u=(x-600)/440,v=(y-310)/190;
      return [x+warp*(10*Math.sin(y*.043+phase)+5*Math.sin(x*.071+y*.019)),
        y+warp*(15*Math.sin(x*.023+phase)+7*Math.sin(x*.071-phase)+18*u*u*(v>0?1:-1))];
    };
    const bound=([x,y])=>[clamp(x,22,1178),clamp(y,22,598)];
    function ribbon(points,radius,taper=true) {
      if(outlines.length>=1500) return;
      const a=[],b=[],length=points.length;
      for(let i=0;i<length;i++) {
        const before=points[Math.max(0,i-1)],after=points[Math.min(length-1,i+1)];
        const dx=after[0]-before[0],dy=after[1]-before[1],d=Math.hypot(dx,dy)||1,t=i/(length-1);
        const r=radius*(taper?Math.pow(1-t,.85):(.58+.42*Math.sin(Math.PI*t)))*(1+.15*Math.sin(i*2.3+phase));
        a.push(bound([points[i][0]-dy/d*r,points[i][1]+dx/d*r]));
        b.push(bound([points[i][0]+dy/d*r,points[i][1]-dx/d*r]));
      }
      outlines.push([...a,...b.reverse()]);
    }
    let cursor=left;
    for(const letter of options.name) {
      const w=unit*widthOf(letter);
      for(const path of glyphs[letter]||[]) {
        const points=[],id=group++;
        for(let j=1;j<path.length;j++) {
          const a=path[j-1],b=path[j],steps=Math.max(2,Math.ceil(Math.hypot((b[0]-a[0])*w,(b[1]-a[1])*height)/8));
          for(let k=0;k<steps;k++) {
            const t=k/steps;
            points.push(shape(cursor+(a[0]+(b[0]-a[0])*t)*w,top+(a[1]+(b[1]-a[1])*t)*height));
          }
        }
        const last=path.at(-1);points.push(shape(cursor+last[0]*w,top+last[1]*height));
        ribbon(points,weight/2,false);
        for(let i=0;i<points.length;i+=3) nodes.push({p:points[i],group:id});
      }
      cursor+=w+unit*.13;
    }
    const roots=nodes.slice(),density=options.thorns/100;
    function branch(origin,angle,length,radius,seed,depth=0,mirror=false) {
      if(branches>=650) return;
      const noise=random(seed),points=[origin],bend=(noise()-.5)*1.4;
      for(let i=1;i<=9;i++) {
        const t=i/9,a=angle+bend*t+Math.sin(t*5+seed%13)*.26;
        points.push(bound([points.at(-1)[0]+Math.cos(a)*length/9,points.at(-1)[1]+Math.sin(a)*length/9]));
      }
      ribbon(points,radius);branches++;
      const id=group++;tips.push({p:points.at(-1),group:id});tips.push({p:points[5],group:id});
      if(mirror&&branches<650) {
        const symmetry=options.symmetry/100;
        const mirrored=points.map(([x,y],i)=>bound([WIDTH-x+(1-symmetry)*Math.sin(i*.7+seed)*length*.35,y+(1-symmetry)*Math.sin(i*.9+phase)*length*.25]));
        ribbon(mirrored,radius);branches++;
        const id=group++;tips.push({p:mirrored.at(-1),group:id});tips.push({p:mirrored[5],group:id});
      }
      if(depth<2&&noise()<density*.72) {
        const i=4+Math.floor(noise()*3),p=points[i],q=points[i-1];
        branch(p,Math.atan2(p[1]-q[1],p[0]-q[0])+(noise()>.5?1:-1)*(.45+noise()*.65),
          length*(.38+noise()*.22),radius*.55,seed+1777,depth+1,mirror);
      }
    }
    for(let i=0;i<roots.length;i++) {
      const {p}=roots[i],chance=rng(),seed=(rng()*4294967296)>>>0;
      const outer=(p[0]-600)/(units*unit/2),up=p[1]<310;
      const angle=(up?-Math.PI/2:Math.PI/2)+outer*(up?.8:-.8)+(rng()-.5)*.9;
      const length=reach*(.25+rng()*.65),radius=weight*(.15+rng()*.2);
      if(chance<density*.5) branch(p,angle,length,radius,seed);
    }
    for(let i=0;i<14;i++) {
      const seed=(rng()*4294967296)>>>0,root=roots[Math.floor(rng()*roots.length)].p;
      const origin=[Math.min(root[0],WIDTH-root[0]),root[1]];
      const angle=(i%2?-Math.PI/2:Math.PI/2)-(i%2?1:-1)*(.3+rng()*.7);
      const length=reach*(.8+rng()*.45);
      if(i/14<density) {
        for(const p of [origin,[WIDTH-origin[0],origin[1]]]) {
          let nearest=roots[0].p,best=Infinity;
          for(const root of roots) {
            const d=(root.p[0]-p[0])**2+(root.p[1]-p[1])**2;
            if(d<best) {best=d;nearest=root.p;}
          }
          if(best>4) ribbon([nearest,p],weight*.16,false);
        }
        branch(origin,angle,length,weight*.3,seed,0,true);
      }
    }
    const webNodes=[...tips,...nodes.filter((_,i)=>i%3===0)],buckets=new Map(),cell=90;
    for(let i=0;i<webNodes.length;i++) {
      const [x,y]=webNodes[i].p,key=Math.floor(x/cell)+','+Math.floor(y/cell);
      if(!buckets.has(key)) buckets.set(key,[]);
      buckets.get(key).push(i);
    }
    for(let i=0;i<webNodes.length;i++) {
      const a=webNodes[i],noise=random((options.seed+i*7919)>>>0);
      const gx=Math.floor(a.p[0]/cell),gy=Math.floor(a.p[1]/cell),near=[];
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) for(const j of buckets.get((gx+dx)+','+(gy+dy))||[]) {
        if(j<=i||webNodes[j].group===a.group) continue;
        const b=webNodes[j],d=Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1]);
        if(d>12&&d<90) near.push({j,d});
      }
      near.sort((a,b)=>a.d-b.d);
      for(const {j,d} of near.slice(0,3)) {
        const chance=noise(),sag=(noise()-.5)*d*.6,width=.4+noise()*.8;
        if(chance>=options.web/100) continue;
        const b=webNodes[j].p;
        threads.push({a:bound(a.p),b:bound(b),c:bound([(a.p[0]+b[0])/2,(a.p[1]+b[1])/2+sag]),width});
      }
    }
    return {options,outlines,threads,branches,width:WIDTH,height:HEIGHT};
  }
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const number=value=>Number(value.toFixed(2));
  const point=p=>number(p[0])+','+number(p[1]);
  function svg(logo,{dark=false,background=false}={}) {
    const ink=dark?'#161616':'#f3f1e8',paper=dark?'#fffdf5':'#101112';
    let output='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+WIDTH+' '+HEIGHT+'" width="'+WIDTH+'" height="'+HEIGHT+'" role="img" aria-labelledby="logo-title"><title id="logo-title">'+escape(logo.options.name||'empty logo')+'</title>';
    if(background) output+='<path fill="'+paper+'" d="M0 0H1200V620H0Z"/>';
    output+='<g fill="'+ink+'">';
    for(const polygon of logo.outlines) output+='<path d="M'+polygon.map(point).join('L')+'Z"/>';
    output+='</g><g fill="none" stroke="'+ink+'" stroke-linecap="round">';
    for(const line of logo.threads) output+='<path stroke-width="'+number(line.width)+'" d="M'+point(line.a)+'Q'+point(line.c)+' '+point(line.b)+'"/>';
    return output+'</g></svg>';
  }
  self.MetalCore={defaults,normalise,cleanName,generate,svg};
})();
