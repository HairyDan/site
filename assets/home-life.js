(() => {
  const canvas = document.getElementById('home-life');
  const ctx = canvas.getContext('2d');
  const size = 40;
  const cell = canvas.width / size;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pause = document.getElementById('life-pause');
  let grid = new Uint8Array(size * size);
  let running = !reducedMotion.matches;
  let visible = true;
  let timer;
  function draw() {
    const style = getComputedStyle(document.documentElement);
    ctx.fillStyle = style.getPropertyValue('--bg');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = style.getPropertyValue('--line');
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) ctx.fillRect(x * cell + 5, y * cell + 5, 2, 2);
    }
    ctx.fillStyle = style.getPropertyValue('--accent');
    grid.forEach((alive, i) => {
      if (alive) ctx.fillRect((i % size) * cell + 1, Math.floor(i / size) * cell + 1, cell - 2, cell - 2);
    });
  }
  function step() {
    const next = new Uint8Array(grid.length);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let neighbours = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx || dy) neighbours += grid[((y + dy + size) % size) * size + ((x + dx + size) % size)];
          }
        }
        const i = y * size + x;
        next[i] = Number(neighbours === 3 || (grid[i] && neighbours === 2));
      }
    }
    grid = next;
    draw();
  }
  function sync() {
    clearInterval(timer);
    if (running && visible && !document.hidden) timer = setInterval(step, 180);
    pause.textContent = running ? 'pause' : 'play';
    pause.setAttribute('aria-pressed', String(!running));
  }
  function seed() {
    grid = Uint8Array.from(grid, () => Number(Math.random() < .22));
    draw();
  }
  document.getElementById('life-shuffle').addEventListener('click', seed);
  pause.addEventListener('click', () => { running = !running; sync(); });
  document.addEventListener('themechange', draw);
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', () => { running = !reducedMotion.matches; sync(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(canvas);
  seed();
  sync();
})();
