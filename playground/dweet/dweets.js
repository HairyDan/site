(function () {
    const input = document.getElementById('dweetInput');
    let jsOut = document.getElementById('jsOut');
    const frame = document.getElementById('vizFrame');
    const runBtn = document.getElementById('runBtn');
    const exBtn = document.getElementById('exampleBtn');
    const clrBtn = document.getElementById('clearBtn');

    (function ensureEditor() {
        if (!jsOut) return;

        if (jsOut.tagName !== 'TEXTAREA') {
            const ta = document.createElement('textarea');
            ta.id = 'jsOut';
            ta.style.width = '100%';
            ta.style.minHeight = '220px';
            ta.style.resize = 'vertical';
            ta.style.font = '12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
            ta.style.background = 'var(--win-face)';
            ta.style.color = 'var(--text)';
            ta.style.border = '2px solid var(--win-light)';
            ta.style.borderRightColor = 'var(--win-dark)';
            ta.style.borderBottomColor = 'var(--win-dark)';
            ta.value = (jsOut.textContent || '').trim() || '// your JS will appear here';

            jsOut.replaceWith(ta);
            jsOut = ta;

            const leftContent = jsOut.closest('.win-content');
            if (leftContent) {
                leftContent.style.display = 'flex';
                leftContent.style.flexDirection = 'column';
            }
            jsOut.style.flex = '1 1 auto';

            const runEdited = document.createElement('button');
            runEdited.id = 'runEditedBtn';
            runEdited.className = 'btn';
            runEdited.textContent = 'Run edited code';
            jsOut.parentNode.appendChild(runEdited);

            runEdited.addEventListener('click', () => {
                const code = (jsOut.value || '').trim();
                if (!code) return;
                frame.srcdoc = buildPlainSandbox(code);
                setTimeout(syncHeights, 50);
            });
        }
    })();

    function syncHeights() {
        const leftContent = jsOut?.closest('.win-content');
        const rightContent = frame?.closest('section')?.querySelector('.win-content');
        if (!leftContent || !rightContent) return;

        leftContent.style.minHeight = '';
        jsOut.style.height = '';

        const target = rightContent.clientHeight;
        leftContent.style.minHeight = target + 'px';

        const children = Array.from(leftContent.children);
        const button = children.find(el => el.id === 'runEditedBtn');
        const buttonH = button ? (button.offsetHeight + 8) : 0;
        const padTop = parseFloat(getComputedStyle(leftContent).paddingTop) || 0;
        const padBottom = parseFloat(getComputedStyle(leftContent).paddingBottom) || 0;
        const usable = target - buttonH - padTop - padBottom;
        if (usable > 80) jsOut.style.height = usable + 'px';
    }
    window.addEventListener('resize', debounce(syncHeights, 50));

    const example = `c.width = 1920;
  for(i=0;i<9;i++){
    x.fillStyle = R(255,180,80,.9);
    x.fillRect(400+i*100+S(t)*300, 400, 50, 200);
  }`;

    exBtn?.addEventListener('click', () => { if (input) input.value = example; });
    clrBtn?.addEventListener('click', () => {
        if (input) input.value = '';
        if (jsOut) jsOut.value = '// your JS will appear here';
        if (frame) frame.srcdoc = '';
        setTimeout(syncHeights, 50);
    });

    runBtn?.addEventListener('click', () => {
        const body = (input?.value || '').trim();
        if (!body) return;
        if (jsOut) jsOut.value = toVanilla(body);
        if (frame) frame.srcdoc = buildSandbox(body);
        setTimeout(syncHeights, 50);
    });

    function toVanilla(code) {
        const INK = '#000';
        const BG = '#fff';

        let src = code.replace(/with\s*\(\s*x\s*\)\s*\{([\s\S]*?)\}/g, '$1');

        src = src
            .replace(/\bS\(/g, 'Math.sin(')
            .replace(/\bC\(/g, 'Math.cos(')
            .replace(/\bT\(/g, 'Math.tan(')
            .replace(/\bPI\b/g, 'Math.PI');


        src = src.replace(/\bR\s*\(\s*([^)]*?)\s*\)/g, (_, args) => rgbaExpr(args));

        src = src.replace(/\bc\./g, 'canvas.');
        src = src.replace(/\bx\./g, 'ctx.');

        const ctxMembers = [
            'beginPath', 'closePath', 'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'rect',
            'arc', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'translate', 'rotate',
            'scale', 'save', 'restore', 'fillText', 'strokeText', 'measureText', 'createLinearGradient',
            'createRadialGradient', 'putImageData', 'getImageData', 'drawImage', 'setTransform', 'transform',
            'globalAlpha', 'globalCompositeOperation', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
            'textAlign', 'textBaseline', 'font', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY',
            'imageSmoothingEnabled'
        ];
        function prefixBare(name, s) {
            const re = new RegExp('(^|[^.\\w$])' + name + '\\b', 'g');
            return s.replace(re, (m, pre) => pre + 'ctx.' + name);
        }
        for (const n of ctxMembers) src = prefixBare(n, src);

        return (
            `const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const WIDTH = 1920, HEIGHT = 1080;
  canvas.width  = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.background = '${BG}';
  
  let start;
  function frame(ts){
    if(!start) start = ts;
    const t = (ts - start) / 1000;
  
    ctx.fillStyle = '${INK}';
    ctx.strokeStyle = '${INK}';
    ctx.lineWidth = 1;
  
  ${src.split('\n').map(l => '  ' + l).join('\n')}
  
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);`
        ).trim();
    }

    function rgbaExpr(args) {
        const parts = [];
        let buf = '', depth = 0;
        for (let i = 0; i < args.length; i++) {
            const ch = args[i];
            if (ch === '(') { depth++; buf += ch; continue; }
            if (ch === ')') { depth--; buf += ch; continue; }
            if (ch === ',' && depth === 0) { parts.push(buf.trim()); buf = ''; continue; }
            buf += ch;
        }
        if (buf.trim()) parts.push(buf.trim());

        let [r, g, b, a] = parts;
        if (r != null && g == null) g = r, b = r;
        if (a == null) a = '1';

        r = r ?? '0'; g = g ?? '0'; b = b ?? '0';

        return `('rgba(' + (${r}) + ',' + (${g}) + ',' + (${b}) + ',' + (${a}) + ')')`;
    }

    function buildSandbox(code) {
        const esc = s => s.replace(/<\/script/gi, '<\\/script');
        const body = esc(code);

        return `<!doctype html><html><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    html,body{height:100%;margin:0}
    body{background:#fff;color:#000;font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
         display:flex;align-items:center;justify-content:center}
    .wrap{width:100%;max-width:100%}
    canvas{display:block;width:100%;height:auto;aspect-ratio:16/9;background:#fff}
  </style>
  </head>
  <body>
    <div class="wrap"><canvas id="c"></canvas></div>
    <script>
    (function(){
      const c = document.getElementById('c');
      const x = c.getContext('2d');
      const WIDTH = 1920, HEIGHT = 1080;
  
      // Pause/resume when hidden; keep time continuous
      let running = !document.hidden;
      let start, lastTs, pausedAt;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { running = false; pausedAt = performance.now(); }
        else { running = true; if (pausedAt && lastTs) start += performance.now() - pausedAt; requestAnimationFrame(loop); }
      });
  
      function fit(){ c.width = WIDTH; c.height = HEIGHT; }
      fit(); addEventListener('resize', fit);
  
      // Shorthands (dwitter)
      const S=Math.sin, C=Math.cos, T=Math.tan, PI=Math.PI;
      function R(r,g,b,a){
        if (arguments.length === 0) return Math.random();
        if (g == null) g = r, b = r;
        if (a == null) a = 1;
        return 'rgba(' + (r|0) + ',' + (g|0) + ',' + (b|0) + ',' + (+a) + ')';
      }
  
      // Defaults each frame
      function setInk(){ x.fillStyle='#000'; x.strokeStyle='#000'; x.lineWidth=1; c.style.background='#fff'; }
  
      // Proxy clears to restore ink after c.width/height resets
      const cProxy = new Proxy(c, {
        set(target, prop, value){
          target[prop] = value;
          if (prop === 'width' || prop === 'height') setInk();
          return true;
        },
        get(target, prop){ return target[prop]; }
      });
  
      function loop(ts){
        lastTs = ts;
        if(!start) start = ts;
        if(!running) return;
  
        const t = (ts - start) / 1000;
        setInk();
  
        try{
          const c = cProxy;
          with (x) { ${body} }
        }catch(e){
          x.setTransform(1,0,0,1,0,0);
          x.fillStyle='#a00'; x.fillRect(0,0,c.width,22);
          x.fillStyle='#fff'; x.font='12px ui-monospace,monospace';
          x.fillText(String(e), 6, 15);
          console.error(e);
        }
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    })();
    </script>
  </body></html>`;
    }

    function buildPlainSandbox(plainCode) {
        const esc = s => s.replace(/<\/script/gi, '<\\/script');
        const code = esc(plainCode);

        return `<!doctype html><html><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    html,body{height:100%;margin:0}
    body{background:#fff;color:#000;font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
         display:flex;align-items:center;justify-content:center}
    .wrap{width:100%;max-width:100%}
    canvas{display:block;width:100%;height:auto;aspect-ratio:16/9;background:#fff}
  </style>
  </head>
  <body>
    <div class="wrap"><canvas id="c"></canvas></div>
    <script>
    (function(){
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      const WIDTH = 1920, HEIGHT = 1080;
  
      function fit(){ canvas.width = WIDTH; canvas.height = HEIGHT; }
      fit(); addEventListener('resize', fit);
  
      // Pause/resume by dropping frames while hidden
      let running = !document.hidden;
      document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (running) requestAnimationFrame(()=>{}); // kick a frame
      });
  
      // Defaults helper
      function setDefaults(){
        canvas.style.background = '#fff';
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
      }
      setDefaults();
  
      // Wrap rAF callbacks: set defaults before/after and catch errors
      const _raf = window.requestAnimationFrame.bind(window);
      const _err = (e) => {
        try {
          ctx.setTransform(1,0,0,1,0,0);
          ctx.fillStyle='#a00'; ctx.fillRect(0,0,canvas.width,22);
          ctx.fillStyle='#fff'; ctx.font='12px ui-monospace,monospace';
          ctx.fillText(String(e), 6, 15);
        } catch(_) {}
        console.error(e);
      };
      window.requestAnimationFrame = (cb) => _raf(function wrapped(ts){
        if (!running) return;
        try { setDefaults(); cb(ts); setDefaults(); }
        catch (e) { _err(e); }
      });
  
      try {
  ${code.split('\n').map(l => '      ' + l).join('\n')}
      } catch(e){
        _err(e);
      }
    })();
    </script>
  </body></html>`;
    }

    function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }

    function autoboot() {
        if (!input) return;
        const current = (input.value || '').trim();
        if (current) return; 

        input.value = example;

        if (jsOut) jsOut.value = toVanilla(example);
        if (frame) frame.srcdoc = buildSandbox(example);

        setTimeout(syncHeights, 50);
    }
    window.addEventListener('DOMContentLoaded', autoboot);

    window.addEventListener('load', () => setTimeout(syncHeights, 50));
})();
