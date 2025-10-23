(function(){
  const root = document.documentElement;
  const btn  = document.getElementById('themeToggle');
  const KEY  = 'theme'; // 'light' | 'dark' | (unset = follow system)

  function apply(mode){
    if (mode === 'light' || mode === 'dark') {
      root.setAttribute('data-theme', mode);
    } else {
      root.removeAttribute('data-theme'); // follow system
    }
    btn.setAttribute('aria-pressed', (root.getAttribute('data-theme') === 'dark'));
  }

  // boot: load saved preference, else follow system
  const saved = localStorage.getItem(KEY); // null | 'light' | 'dark'
  apply(saved);

  btn.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || 'system';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    apply(next);
  });
})();
