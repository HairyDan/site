(() => {
  const dx=Int8Array.of(1,1,0,-1,-1,-1,0,1),dy=Int8Array.of(0,1,1,1,0,-1,-1,-1);
  class DissertationSlime {
    constructor(options) {
      this.width=options.width; this.height=options.height;
      this.variant=options.variant || 'local';
      this.competition=this.variant==='competition'; this.range=this.variant==='long-range' ? 24:0;
      const n=this.width*this.height;
      this.count=Math.min(options.agents ?? 6000,n);
      this.x=new Uint16Array(this.count); this.y=new Uint16Array(this.count);
      this.heading=new Uint8Array(this.count); this.team=new Uint8Array(this.count); this.alive=new Uint8Array(this.count);
      this.occupied=new Int32Array(n); this.order=new Uint32Array(n);
      this.a=new Float32Array(n); this.nextA=new Float32Array(n);
      this.b=new Float32Array(this.competition ? n:0); this.nextB=new Float32Array(this.competition ? n:0);
      this.food=new Uint8Array(n); this.walls=new Uint8Array(n);
      this.foodField=new Float32Array(n); this.foodScratch=new Float32Array(n);
      this.vectors=new Int16Array(48); this.sensorKey='';
      this.randomState=42; this.clear();
    }
    random() {
      let value=this.randomState; value^=value<<13; value^=value>>>17; value^=value<<5;
      this.randomState=value>>>0; return this.randomState/4294967296;
    }
    clear() {
      for(const field of [this.a,this.b,this.nextA,this.nextB,this.food,this.walls,this.foodField,this.occupied]) field.fill(0);
      this.generation=0; this.population=this.count; this.foodDirty=true;
      const n=this.order.length,w=this.width;
      for(let i=0;i<n;i++) this.order[i]=i;
      for(let i=0;i<this.count;i++) {
        const choice=i+Math.floor(this.random()*(n-i)),at=this.order[choice];
        this.order[choice]=this.order[i]; this.order[i]=at;
        this.x[i]=at%w; this.y[i]=Math.floor(at/w);
        this.heading[i]=(this.random()*8)|0;
        const colony=Math.floor(this.random()*2); this.team[i]=this.competition ? colony:0;
        this.alive[i]=1; this.occupied[at]=i+1;
      }
    }
    seed(seed) {
      this.randomState=(seed>>>0)||1; this.clear();
      for(const [fx,fy] of [[.25,.3],[.75,.3],[.5,.75]]) this.paint(Math.floor(this.width*fx),Math.floor(this.height*fy),3,1);
    }
    paint(x,y,value,radius=1) {
      const r=radius-1,w=this.width,h=this.height;
      for(let py=y-r;py<=y+r;py++) for(let px=x-r;px<=x+r;px++) {
        if(px<0 || px>=w || py<0 || py>=h || (px-x)*(px-x)+(py-y)*(py-y)>r*r) continue;
        const at=py*w+px;
        if(value===2) {
          const agent=this.occupied[at]-1;
          if(agent>=0) { this.alive[agent]=0; this.occupied[at]=0; this.population--; }
          this.walls[at]=1; this.food[at]=0; this.a[at]=0; if(this.competition) this.b[at]=0;
          this.foodDirty=true;
        } else {
          this.walls[at]=0;
          if(value===3) { this.food[at]=1; this.foodDirty=true; }
          else if(!value) { this.food[at]=0; this.a[at]=0; if(this.competition) this.b[at]=0; this.foodDirty=true; }
          else this.a[at]=32;
        }
      }
    }
    rebuildFood() {
      if(!this.foodDirty) return;
      const {width:w,height:h,range:r,food,foodField:field,foodScratch:scratch}=this;
      if(!r) {
        for(let i=0;i<food.length;i++) field[i]=food[i]*32;
      } else {
        if(!this.foodKernel) {
          this.foodKernel=new Float32Array(2*r+1);
          for(let d=-r;d<=r;d++) this.foodKernel[d+r]=Math.exp(-d*d/(2*(r/3)*(r/3)));
        }
        const kernel=this.foodKernel;
        for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
          let value=0;
          const start=x<r ? -x:-r,end=x+r<w ? r:w-1-x;
          for(let d=start;d<=end;d++) value+=food[y*w+x+d]*kernel[d+r]*32;
          scratch[y*w+x]=value;
        }
        for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
          let value=0;
          const start=y<r ? -y:-r,end=y+r<h ? r:h-1-y;
          for(let d=start;d<=end;d++) value+=scratch[(y+d)*w+x]*kernel[d+r];
          field[y*w+x]=value>32 ? 32:value;
        }
      }
      this.foodDirty=false;
    }
    sensorVectors(distance,angle) {
      const key=distance+','+angle;
      if(key===this.sensorKey) return;
      this.sensorKey=key;
      for(let heading=0;heading<8;heading++) {
        for(let sensor=0;sensor<3;sensor++) {
          const direction=(heading*45+(sensor-1)*angle)*Math.PI/180;
          const at=heading*6+sensor*2;
          this.vectors[at]=Math.round(Math.cos(direction)*distance);
          this.vectors[at+1]=Math.round(Math.sin(direction)*distance);
        }
      }
    }
    sample(x,y,team) {
      const {width:w,height:h,a,b,foodField:food,competition}=this;
      let value=0;
      const top=y>0 ? y-1:0,bottom=y+1<h ? y+1:h-1,left=x>0 ? x-1:0,right=x+1<w ? x+1:w-1;
      for(let py=top;py<=bottom;py++) {
        for(let px=left;px<=right;px++) {
          const at=py*w+px;
          value+=food[at]+(competition ? team ? b[at]-a[at]:a[at]-b[at]:a[at]);
        }
      }
      return value;
    }
    diffuse(retention) {
      const {width:w,height:h,a,b,nextA,nextB,walls,competition}=this;
      for(let y=0;y<h;y++) {
        const up=(y ? y-1:0)*w,down=(y<h-1 ? y+1:h-1)*w,row=y*w;
        for(let x=0;x<w;x++) {
          const l=x ? x-1:0,r=x<w-1 ? x+1:w-1,i=row+x;
          nextA[i]=walls[i] ? 0:(4*a[i]+2*(a[row+l]+a[row+r]+a[up+x]+a[down+x])+a[up+l]+a[up+r]+a[down+l]+a[down+r])*(retention/16);
          if(competition) nextB[i]=walls[i] ? 0:(4*b[i]+2*(b[row+l]+b[row+r]+b[up+x]+b[down+x])+b[up+l]+b[up+r]+b[down+l]+b[down+r])*(retention/16);
        }
      }
      this.a=nextA; this.nextA=a; this.b=nextB; this.nextB=b;
    }
    step(distance=8,angle=45,retention=.95) {
      this.rebuildFood(); this.sensorVectors(distance,angle);
      const {x,y,heading,alive,team,count,vectors,occupied,walls,width:w,height:h}=this;
      for(let i=0;i<count;i++) {
        if(!alive[i]) continue;
        const at=heading[i]*6,px=x[i],py=y[i],colony=team[i];
        const left=this.sample(px+vectors[at],py+vectors[at+1],colony);
        const front=this.sample(px+vectors[at+2],py+vectors[at+3],colony);
        const right=this.sample(px+vectors[at+4],py+vectors[at+5],colony);
        if(left===0 && front===0 && right===0) heading[i]=(this.random()*8)|0;
        else if(front<left || front<right) heading[i]=(heading[i]+(left===right ? this.random()<.5 ? -1:1 : left>right ? -1:1)+8)&7;
      }
      let i=count ? this.generation%count:0;
      for(let n=0;n<count;n++) {
        if(alive[i]) {
          const direction=heading[i],nx=x[i]+dx[direction],ny=y[i]+dy[direction];
          if(nx>=0 && nx<w && ny>=0 && ny<h) {
            const target=ny*w+nx;
            if(!occupied[target] && !walls[target]) {
              const old=y[i]*w+x[i];
              occupied[old]=0; occupied[target]=i+1; x[i]=nx; y[i]=ny;
              (team[i] ? this.b:this.a)[old]=32;
            }
          }
        }
        if(++i===count) i=0;
      }
      this.diffuse(retention); this.generation++;
    }
    raster(pixels,palette,view='trails') {
      const out=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4);
      if(view==='food') this.rebuildFood();
      for(let i=0;i<out.length;i++) {
        let colour=0xff20170c;
        if(view==='food') colour=palette[Math.min(255,(this.foodField[i]*7.96)|0)];
        else if(view==='trails') {
          if(this.competition) {
            const a=Math.min(1,this.a[i]/16),b=Math.min(1,this.b[i]/16);
            const r=12+Math.min(243,(a*220+b*40)|0),g=23+Math.min(232,(a*160+b*160)|0),blue=32+Math.min(223,(a*50+b*220)|0);
            colour=(255<<24)|(blue<<16)|(g<<8)|r;
          } else colour=palette[Math.min(255,(this.a[i]*7.96)|0)];
        }
        if(this.walls[i]) colour=0xff7d838a;
        if(this.food[i]) colour=0xffa4f5d2;
        out[i]=colour;
      }
      if(view==='agents') {
        for(let i=0;i<this.count;i++) if(this.alive[i]) out[this.y[i]*this.width+this.x[i]]=this.team[i] ? 0xffe6bc55:0xff97dbf6;
      }
    }
    snapshot() {
      const saved={generation:this.generation,population:this.population,randomState:this.randomState};
      for(const key of ['x','y','heading','team','alive','a','b','food','walls']) saved[key]=this[key].slice();
      return saved;
    }
    restore(saved) {
      for(const key of ['x','y','heading','team','alive','a','b','food','walls']) this[key].set(saved[key]);
      this.generation=saved.generation; this.population=saved.population; this.randomState=saved.randomState;
      this.occupied.fill(0);
      for(let i=0;i<this.count;i++) if(this.alive[i]) this.occupied[this.y[i]*this.width+this.x[i]]=i+1;
      this.foodDirty=true;
    }
  }
  self.DissertationSlime=DissertationSlime;
})();
