(() => {
    const canvas = document.getElementById('mb');
    const ctx = canvas.getContext('2d', { alpha: false });
  
    let cx = -0.75, cy = 0.0;
    let scale = 3.0;
    let maxIter = 256;
  
    function resize() {
      const dpr = devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    }
    addEventListener('resize', resize);
    resize();
  
    function render() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const img = ctx.createImageData(w, h);
      const data = img.data;
  
      // Precompute constants
      const x0 = cx - scale/2;
      const y0 = cy - scale * (h/w) / 2;
      const dx = scale / w;
      const dy = (scale * (h/w)) / h;
  
      let p = 0;
      for (let j=0; j<h; j++) {
        const ci = y0 + j * dy;
        for (let i=0; i<w; i++) {
          const cr = x0 + i * dx;
  
          let zr = 0, zi = 0, iter = 0;
          let zr2 = 0, zi2 = 0;
          while (zr2 + zi2 <= 4 && iter < maxIter) {
            zi = 2*zr*zi + ci;
            zr = zr2 - zi2 + cr;
            zr2 = zr*zr; zi2 = zi*zi;
            iter++;
          }
  
          let r,g,b;
          if (iter === maxIter) {
            r = g = b = 0; // black inside
          } else {
            // smooth coloring
            const mu = iter - Math.log(Math.log(Math.sqrt(zr2+zi2))) / Math.log(2);
            const t = mu / maxIter;
            // TODO: changeable pallette?
            r = Math.floor(255 * Math.pow(t, 0.35));
            g = Math.floor(255 * Math.pow(t, 0.6) * (0.55 + 0.45*Math.sin(3.0*t)));
            b = Math.floor(255 * Math.pow(1-t, 0.9));
          }
          data[p++] = r; data[p++] = g; data[p++] = b; data[p++] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
  
    const $ = (id) => document.getElementById(id);
    $('iters').oninput = e => { maxIter = +e.target.value; render(); };
    $('zoomIn').onclick = () => { scale *= 0.6; render(); };
    $('zoomOut').onclick = () => { scale /= 0.6; render(); };
  
    const pan = (dx,dy) => {
      const aspect = canvas.clientHeight / canvas.clientWidth;
      cx += dx * (scale / 6);
      cy += dy * (scale * aspect / 6);
      render();
    };
    $('upBtn').onclick = () => pan(0, -1);
    $('downBtn').onclick = () => pan(0, 1);
    $('leftBtn').onclick = () => pan(-1, 0);
    $('rightBtn').onclick = () => pan(1, 0);
  
    let dragging=false, startX=0, startY=0, startCx=0, startCy=0;
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true; startX=e.clientX; startY=e.clientY; startCx=cx; startCy=cy; canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const aspect = canvas.clientHeight / canvas.clientWidth;
      cx = startCx - dx / canvas.clientWidth * scale;
      cy = startCy - dy / canvas.clientHeight * (scale * aspect);
      render();
    });
    canvas.addEventListener('pointerup', () => dragging=false);
    canvas.addEventListener('pointercancel', () => dragging=false);

    render();
  })();
  