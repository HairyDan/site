(() => {
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  } catch {}
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : system.matches;
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('themeToggle');
    function sync() {
      if (!button) return;
      button.setAttribute('aria-pressed', String(isDark()));
      button.setAttribute('aria-label', `Switch to ${isDark() ? 'light' : 'dark'} theme`);
      document.dispatchEvent(new Event('themechange'));
    }
    button?.addEventListener('click', () => {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      try { localStorage.setItem('theme', root.dataset.theme); } catch {}
      sync();
    });
    system.addEventListener('change', sync);
    sync();
  });
})();
