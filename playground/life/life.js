(() => {
    const canvas = document.getElementById('life');
    const ctx = canvas.getContext('2d', { alpha: false });
  
    const COLS = 400, ROWS = 225; // ~16:9
    let grid = new Uint8Array(COLS * ROWS);
    const idx = (x, y) => ((y + ROWS) % ROWS) * COLS + ((x + COLS) % COLS);
  
    // Camera window
    let camX = 0, camY = 0;
    const cellPx = 8;
    let running = false, lastTime = 0, acc = 0;
    let tps = 24;
  
    function resize() {
      const dpr = devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    addEventListener('resize', resize);
    resize();
  
    function neighbors(x, y) {
      let n = 0;
      for (let j=-1;j<=1;j++) for (let i=-1;i<=1;i++) {
        if (i||j) n += grid[idx(x+i, y+j)];
      }
      return n;
    }
  
    function step() {
      const next = new Uint8Array(COLS * ROWS);
      for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
        const alive = grid[idx(x,y)];
        const n = neighbors(x,y);
        next[idx(x,y)] = (alive ? (n===2||n===3) : (n===3)) ? 1 : 0;
      }
      grid = next;
    }
  
    function draw() {
      // white bg, black cells
      ctx.fillStyle = '#fff';
      ctx.fillRect(0,0,canvas.clientWidth,canvas.clientHeight);
  
      const visibleCols = Math.floor(canvas.clientWidth / cellPx);
      const visibleRows = Math.floor(canvas.clientHeight / cellPx);
  
      ctx.fillStyle = '#000';
      for (let vy=0; vy<visibleRows; vy++) {
        for (let vx=0; vx<visibleCols; vx++) {
          const gx = (camX + vx) % COLS;
          const gy = (camY + vy) % ROWS;
          if (grid[idx(gx, gy)]) {
            ctx.fillRect(vx*cellPx, vy*cellPx, cellPx, cellPx);
          }
        }
      }
  
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 1;
      for (let x=0; x<=visibleCols; x++) {
        ctx.beginPath();
        ctx.moveTo(x*cellPx + 0.5, 0);
        ctx.lineTo(x*cellPx + 0.5, visibleRows*cellPx);
        ctx.stroke();
      }
      for (let y=0; y<=visibleRows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y*cellPx + 0.5);
        ctx.lineTo(visibleCols*cellPx, y*cellPx + 0.5);
        ctx.stroke();
      }
    }
  
    function loop(ts) {
      if (document.hidden) { requestAnimationFrame(loop); return; }
      if (!lastTime) lastTime = ts;
      const dt = (ts - lastTime) / 1000;
      lastTime = ts;
      if (running) {
        acc += dt;
        const stepDur = 1 / tps;
        while (acc >= stepDur) { step(); acc -= stepDur; }
      }
      draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  
    // Controls
    const $ = (id) => document.getElementById(id);
    $('playBtn').onclick = () => {
      running = !running;
      $('playBtn').textContent = running ? 'pause' : 'play';
    };
    $('stepBtn').onclick = () => { if (!running) { step(); draw(); } };
    $('clearBtn').onclick = () => { grid.fill(0); draw(); };
    $('randomBtn').onclick = () => {
      for (let i=0;i<grid.length;i++) grid[i] = Math.random() < 0.22 ? 1 : 0;
      draw();
    };
    $('speed').oninput = (e) => { tps = +e.target.value; };
  
    const pan = (dx,dy) => { camX = (camX + dx + COLS) % COLS; camY = (camY + dy + ROWS) % ROWS; draw(); };
    $('upBtn').onclick = () => pan(0, -4);
    $('downBtn').onclick = () => pan(0, 4);
    $('leftBtn').onclick = () => pan(-4, 0);
    $('rightBtn').onclick = () => pan(4, 0);
  
    let painting = false;
    canvas.addEventListener('pointerdown', (e) => { painting = true; toggleAt(e); });
    canvas.addEventListener('pointerup',   () => painting = false);
    canvas.addEventListener('pointerleave',() => painting = false);
    canvas.addEventListener('pointermove', (e) => { if (painting) toggleAt(e); });
  
    function toggleAt(e){
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / cellPx);
      const y = Math.floor((e.clientY - rect.top) / cellPx);
      const gx = (camX + x + COLS) % COLS;
      const gy = (camY + y + ROWS) % ROWS;
      grid[idx(gx, gy)] ^= 1;
      draw();
    }
  
    $('randomBtn').click();
  })();
  