/* Mobile section navigation shared by the SPA and News & Events.
   A short section advances one screen per swipe. A tall section (forms, maps
   and card lists) keeps normal reading scroll until its top or bottom edge. */
(() => {
  const mobile = () => window.matchMedia('(max-width: 760px)').matches;
  const selector = [
    'main > div > section',
    '.about-gallery-screen', '.about-philosophy-screen',
    '.lm-projects-filter-bar', '.lm-project-pair',
    // News & Events is a standalone document that loads this script too
    '.ne-hero-banner', '.ne-subbar', '.ne-section-header', '.ne-content-section .ne-card-pair', '.ne-footer'
  ].join(',');
  let touch = null;

  const headerHeight = () => document.querySelector('header')?.getBoundingClientRect().height || 0;
  const sections = () => [...document.querySelectorAll(selector)].filter((node) => {
    const style = window.getComputedStyle(node);
    return style.display !== 'none'
      && !node.matches('.lm-about-story, .lm-projects-list-section')
      && node.getBoundingClientRect().height > 0;
  }).map((node) => ({
    node,
    top: window.scrollY + node.getBoundingClientRect().top,
    height: node.getBoundingClientRect().height
  })).sort((a, b) => a.top - b.top);

  const step = (direction) => {
    const list = sections();
    if (!list.length) return false;
    const y = window.scrollY + headerHeight();
    let index = 0;
    list.forEach((section, i) => { if (section.top <= y + 10) index = i; });
    const current = list[index];
    const viewport = window.innerHeight;

    // Preserve normal scrolling while the user is reading a long section.
    if (current.height > viewport + 20) {
      const bottom = current.top + current.height;
      if (direction > 0 && y < bottom - viewport - 10) return false;
      if (direction < 0 && window.scrollY > current.top + 10) return false;
    }

    const target = list[index + direction];
    if (!target) return false;
    window.scrollTo({ top: Math.max(0, target.top - headerHeight()), behavior: 'smooth' });
    return true;
  };

  window.addEventListener('touchstart', (event) => {
    if (!mobile() || event.touches.length !== 1) return;
    if (event.target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
    touch = { x: event.touches[0].clientX, y: event.touches[0].clientY, handled: false };
  }, { passive: true });

  window.addEventListener('touchmove', (event) => {
    if (!touch || touch.handled || !mobile() || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - touch.x;
    const dy = event.touches[0].clientY - touch.y;
    if (Math.abs(dy) < 44 || Math.abs(dy) < Math.abs(dx) * 1.25) return;
    if (step(dy < 0 ? 1 : -1)) {
      touch.handled = true;
      event.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('touchend', () => { touch = null; }, { passive: true });
  window.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
})();
