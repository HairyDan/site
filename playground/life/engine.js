(() => {
  const tau = Math.PI * 2;
  const cos = Float32Array.from({length:1024}, (_, i) => Math.cos(i * tau / 1024));
  const sin = Float32Array.from({length:1024}, (_, i) => Math.sin(i * tau / 1024));
  function parseRule(text) {
    const match = /^B([0-8]*)\/S([0-8]*)$/i.exec(text.trim());
    if (!match) throw new Error('use B3/S23 notation; neighbour counts are 0–8.');
    return {birth: [...match[1]].reduce((a, n) => a | (1 << n), 0), survive: [...match[2]].reduce((a, n) => a | (1 << n), 0)};
  }
  function line(x0, y0, x1, y1, visit) {
    let dx = Math.abs(x1-x0), sx = x0<x1 ? 1 : -1;
    let dy = -Math.abs(y1-y0), sy = y0<y1 ? 1 : -1, error = dx+dy;
    for (;;) {
      visit(x0, y0);
      if (x0===x1 && y0===y1) break;
      const twice = 2*error;
      if (twice>=dy) { error+=dy; x0+=sx; }
      if (twice<=dx) { error+=dx; y0+=sy; }
    }
  }
  function parseRLE(text, maxWidth=512, maxHeight=320) {
    if (text.length > 1000000) throw new Error('pattern file is too large.');
    const clean = text.split(/\r?\n/).filter(s => !s.startsWith('#')).join('\n');
    const header = /x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)(?:\s*,\s*rule\s*=\s*(B[0-8]*\/S[0-8]*))?/i.exec(clean);
    if (!header) throw new Error('missing RLE dimensions.');
    const width=+header[1], height=+header[2];
    if (width<1 || height<1 || width>maxWidth || height>maxHeight) throw new Error('pattern is larger than this grid.');
    const body=clean.slice(header.index+header[0].length).replace(/\s/g,'');
    const cells=[]; let x=0,y=0,count='',ended=false;
    for (const c of body) {
      if (/\d/.test(c)) { count+=c; if (count.length>6) throw new Error('invalid run.'); continue; }
      const n=count ? +count : 1; count='';
      if (c==='!') { ended=true; break; }
      if (c==='$') { y+=n; x=0; if (y>height) throw new Error('too many rows.'); continue; }
      if (c!=='b' && c!=='o') throw new Error('only two-state RLE patterns are supported.');
      if (x+n>width || y>=height) throw new Error('pattern exceeds its dimensions.');
      if(c==='o') for(let i=0;i<n;i++) cells.push([x+i,y]);
      x+=n;
    }
    if (!ended) throw new Error('missing RLE end marker.');
    return {width,height,cells,rule:header[3] || null};
  }
  class Automata {
    constructor(options={}) { this.configure(options); }
    configure(options) {
      this.width=options.width || 256; this.height=options.height || 160;
      this.mode=options.mode || 'life'; this.wrap=options.wrap !== false;
      this.slimeVariant=options.slimeVariant || 'sketch'; this.slimeView=options.slimeView || 'trails';
      this.rule=options.rule || 'B3/S23'; Object.assign(this,parseRule(this.rule));
      this.feed=options.feed ?? .0367; this.kill=options.kill ?? .0649;
      this.threshold=options.threshold ?? 1; this.states=options.states ?? (this.mode==='excitable' ? 16 : 12);
      this.sensor=options.sensor ?? 9; this.angle=options.angle ?? 45;
      this.decay=options.decay ?? .95; this.agentCount=options.agents ?? 6000;
      this.rngState=(options.seed >>> 0) || 123456789;
      this.project=this.mode==='slime' && this.slimeVariant!=='sketch' ? new self.DissertationSlime({width:this.width,height:this.height,agents:this.agentCount,variant:this.slimeVariant}):null;
      const n=this.width*this.height;
      const discrete=!['reaction','slime'].includes(this.mode),chemical=this.mode==='reaction' ? n:0,slime=this.mode==='slime' && !this.project ? n:0;
      this.grid=new Uint8Array(discrete ? n:0); this.next=new Uint8Array(discrete ? n:0); this.age=new Uint8Array(this.mode==='life' ? n:0);
      this.u=new Float32Array(chemical); this.v=new Float32Array(chemical);
      this.nu=new Float32Array(chemical); this.nv=new Float32Array(chemical);
      this.trail=new Float32Array(slime); this.trailNext=new Float32Array(slime);
      this.food=new Uint8Array(slime); this.walls=new Uint8Array(slime);
      this.left=new Int32Array(this.width); this.right=new Int32Array(this.width);
      this.up=new Int32Array(this.height); this.down=new Int32Array(this.height);
      for(let x=0;x<this.width;x++) { this.left[x]=x ? x-1 : this.width-1; this.right[x]=x+1===this.width ? 0 : x+1; }
      for(let y=0;y<this.height;y++) { this.up[y]=(y ? y-1 : this.height-1)*this.width; this.down[y]=(y+1===this.height ? 0 : y+1)*this.width; }
      const agents=this.mode==='slime' && !this.project ? this.agentCount:0;
      this.ax=new Float32Array(agents); this.ay=new Float32Array(agents); this.heading=new Uint16Array(agents);
      this.palette=new Uint32Array(256); this.makePalette(); this.clear();
    }
    random() {
      let x=this.rngState; x^=x<<13; x^=x>>>17; x^=x<<5;
      this.rngState=x>>>0; return this.rngState/4294967296;
    }
    makePalette() {
      const pack=(r,g,b) => (255<<24)|(b<<16)|(g<<8)|r;
      this.palette[0]=pack(12,23,32);
      for(let i=1;i<256;i++) {
        const t=i/255;
        this.palette[i]=pack(Math.round(24+221*t),Math.round(65+155*Math.sqrt(t)),Math.round(90+70*t));
      }
      if(this.mode==='life') this.palette[255]=pack(246,219,151);
      if(this.mode==='brain') { this.palette[1]=pack(246,219,151); this.palette[2]=pack(44,111,133); }
      if(this.mode==='cyclic' || this.mode==='excitable') {
        for(let i=0;i<this.states;i++) {
          const t=i/this.states;
          this.palette[i]=pack(Math.round(125+105*Math.cos(t*tau)),Math.round(130+100*Math.cos(t*tau-2.1)),Math.round(140+100*Math.cos(t*tau-4.2)));
        }
        if(this.mode==='excitable') this.palette[0]=pack(12,23,32);
      }
    }
    clear() {
      if(this.project) { this.project.clear(); this.generation=0; this.population=this.project.population; return; }
      this.grid.fill(0); this.next.fill(0); this.age.fill(0);
      this.u.fill(1); this.v.fill(0); this.trail.fill(0); this.food.fill(0); this.walls.fill(0);
      this.generation=0; this.population=0;
      for(let i=0;i<this.ax.length;i++) {
        this.ax[i]=this.random()*this.width;
        this.ay[i]=this.random()*this.height;
        this.heading[i]=(this.random()*1024)|0;
      }
    }
    seed(seed=1) {
      if(this.project) { this.project.seed(seed); this.generation=0; this.population=this.project.population; return; }
      this.rngState=(seed>>>0)||1; this.clear();
      const n=this.grid.length;
      if(this.mode==='reaction') {
        for(let i=0;i<18;i++) this.paint((this.random()*this.width)|0,(this.random()*this.height)|0,1,3);
      } else if(this.mode==='slime') {
        for(let i=0;i<7;i++) {
          const a=i*tau/7;
          this.paint(Math.round(this.width/2+Math.cos(a)*this.width*.3),Math.round(this.height/2+Math.sin(a)*this.height*.3),3,2);
        }
      } else {
        for(let i=0;i<n;i++) this.grid[i]=this.mode==='cyclic' ? (this.random()*this.states)|0 : this.mode==='excitable' ? (this.random()<.15 ? (1+this.random()*(this.states-1))|0 : 0) : +(this.random()<.22);
      }
    }
    paint(x,y,value,radius=1) {
      if(this.project) { this.project.paint(x,y,value,radius); return; }
      const r=Math.max(0,radius-1);
      for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++) {
        if(dx*dx+dy*dy>r*r) continue;
        const px=x+dx,py=y+dy;
        if(px<0 || px>=this.width || py<0 || py>=this.height) continue;
        const i=py*this.width+px;
        if(this.mode==='reaction') { this.u[i]=value ? .5 : 1; this.v[i]=value ? .5 : 0; }
        else if(this.mode==='slime') {
          if(value===2) { this.walls[i]=1; this.trail[i]=0; this.food[i]=0; }
          else { this.walls[i]=0; this.trail[i]=value ? 15 : 0; this.food[i]=value===3 ? 1 : 0; }
        } else { this.grid[i]=value ? 1 : 0; this.age[i]=0; }
      }
    }
    discreteStep() {
      const {width:w,height:h,grid:a,next:b,mode,up,down,left,right}=this;
      let population=0;
      for(let y=0;y<h;y++) {
        const row=y*w,u=up[y],d=down[y];
        for(let x=0;x<w;x++) {
          const i=row+x,l=left[x],r=right[x],s=a[i];
          let n=0,target=1;
          if(mode==='cyclic') target=(s+1)%this.states;
          if(!this.wrap && (x===0||x===w-1||y===0||y===h-1)) {
            for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
              if((dx||dy) && x+dx>=0 && x+dx<w && y+dy>=0 && y+dy<h) n+=+(a[(y+dy)*w+x+dx]===target);
            }
          } else {
            n=+(a[u+l]===target) + +(a[u+x]===target) + +(a[u+r]===target)
              + +(a[row+l]===target) + +(a[row+r]===target)
              + +(a[d+l]===target) + +(a[d+x]===target) + +(a[d+r]===target);
          }
          let value;
          if(mode==='life') value=+(((s ? this.survive : this.birth) >> n)&1);
          else if(mode==='brain') value=s===1 ? 2 : s===2 ? 0 : +(n===2);
          else if(mode==='cyclic') value=n>=this.threshold ? target : s;
          else value=s ? (s+1)%this.states : +(n>=this.threshold);
          b[i]=value;
          if(value) population++;
          if(mode==='life') this.age[i]=value ? 255 : this.age[i]>18 ? this.age[i]-18:0;
        }
      }
      this.grid=b; this.next=a; this.population=population; this.generation++;
    }
    reactionStep() {
      const {width:w,height:h,u,v,nu,nv,up,down,left,right,feed:f,kill:k}=this;
      let total=0;
      for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
        const i=y*w+x,l=y*w+left[x],r=y*w+right[x],t=up[y]+x,b=down[y]+x;
        const a=u[i],c=v[i],reaction=a*c*c;
        const lapU=.2*(u[l]+u[r]+u[t]+u[b])+.05*(u[up[y]+left[x]]+u[up[y]+right[x]]+u[down[y]+left[x]]+u[down[y]+right[x]])-a;
        const lapV=.2*(v[l]+v[r]+v[t]+v[b])+.05*(v[up[y]+left[x]]+v[up[y]+right[x]]+v[down[y]+left[x]]+v[down[y]+right[x]])-c;
        const nextU=a+lapU-reaction+f*(1-a),nextV=c+.5*lapV+reaction-(f+k)*c;
        nu[i]=nextU<0 ? 0:nextU>1 ? 1:nextU;
        nv[i]=nextV<0 ? 0:nextV>1 ? 1:nextV;
        total+=nv[i]>.1;
      }
      this.u=nu; this.nu=u; this.v=nv; this.nv=v; this.population=total; this.generation++;
    }
    sample(x,y) {
      const w=this.width,h=this.height;
      x=x<0 ? x+w : x>=w ? x-w : x; y=y<0 ? y+h : y>=h ? y-h : y;
      return this.trail[(y|0)*w+(x|0)];
    }
    slimeStep() {
      const {width:w,height:h,ax,ay,heading,trail,trailNext,food,walls,left,right,up,down}=this;
      const angle=Math.round(this.angle*1024/360),turn=64,distance=this.sensor;
      for(let i=0;i<ax.length;i++) {
        let a=heading[i],x=ax[i],y=ay[i];
        if(walls[(y|0)*w+(x|0)]) {
          let attempts=0;
          do { x=this.random()*w; y=this.random()*h; attempts++; } while(walls[(y|0)*w+(x|0)] && attempts<32);
          ax[i]=x; ay[i]=y;
          if(walls[(y|0)*w+(x|0)]) continue;
        }
        const la=(a-angle)&1023,ra=(a+angle)&1023;
        const f=this.sample(x+cos[a]*distance,y+sin[a]*distance);
        const l=this.sample(x+cos[la]*distance,y+sin[la]*distance);
        const r=this.sample(x+cos[ra]*distance,y+sin[ra]*distance);
        if(f<l || f<r) a=(a+(l===r ? (this.random()<.5 ? -turn:turn) : l>r ? -turn:turn))&1023;
        let nx=x+cos[a],ny=y+sin[a];
        if(nx<0) nx+=w; else if(nx>=w) nx-=w;
        if(ny<0) ny+=h; else if(ny>=h) ny-=h;
        const at=(ny|0)*w+(nx|0);
        if(walls[at]) { heading[i]=(a+300+(this.random()*400)|0)&1023; continue; }
        ax[i]=nx; ay[i]=ny; heading[i]=a; trail[at]=Math.min(32,trail[at]+3);
      }
      let occupied=0;
      for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
        const i=y*w+x;
        const value=walls[i] ? 0 : food[i] ? 32 : (trail[i]*.6+.1*(trail[y*w+left[x]]+trail[y*w+right[x]]+trail[up[y]+x]+trail[down[y]+x]))*this.decay;
        trailNext[i]=value; occupied+=value>1;
      }
      this.trail=trailNext; this.trailNext=trail; this.population=occupied; this.generation++;
    }
    step(count=1) {
      if(this.project) {
        for(let i=0;i<count;i++) this.project.step(this.sensor,this.angle,this.decay);
        this.generation=this.project.generation; this.population=this.project.population; return;
      }
      for(let i=0;i<count;i++) {
        if(this.mode==='reaction') this.reactionStep();
        else if(this.mode==='slime') this.slimeStep();
        else this.discreteStep();
      }
    }
    raster(pixels,trails=false) {
      if(this.project) { this.project.raster(pixels,this.palette,this.slimeView); this.population=this.project.population; return; }
      const out=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4),palette=this.palette;
      let active=0;
      for(let i=0;i<out.length;i++) {
        let value=this.grid[i];
        if(this.mode==='life') value=value ? 255 : trails ? this.age[i]>>2 : 0;
        else if(this.mode==='reaction') value=Math.min(255,(this.v[i]*650)|0);
        else if(this.mode==='slime') value=Math.min(255,(this.trail[i]*15)|0);
        active+=this.mode==='reaction' ? this.v[i]>.1:this.mode==='slime' ? this.trail[i]>1:this.grid[i]!==0;
        out[i]=palette[value];
        if(this.mode==='slime' && this.walls[i]) out[i]=0xff7d838a;
        if(this.mode==='slime' && this.food[i]) out[i]=0xffa4f5d2;
      }
      this.population=active;
    }
    exportRLE() {
      if(this.mode!=='life') throw new Error('RLE is for two-state Life-like rules.');
      let body='';
      for(let y=0;y<this.height;y++) {
        let run=0,previous='';
        for(let x=0;x<this.width;x++) {
          const token=this.grid[y*this.width+x] ? 'o':'b';
          if(token===previous) run++;
          else { if(run) body+=(run>1 ? run:'')+previous; previous=token; run=1; }
        }
        if(run) body+=(run>1 ? run:'')+previous;
        body+=y===this.height-1 ? '!' : '$';
      }
      return 'x = '+this.width+', y = '+this.height+', rule = '+this.rule+'\n'+body+'\n';
    }
  }
  self.AutomataCore={Automata,parseRule,parseRLE,line};
})();
