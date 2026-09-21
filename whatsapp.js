/* Contextual contact shortcut: no timer tied to video duration. */
(() => {
  const links = document.querySelectorAll('.lm-whatsapp');
  if (!links.length) return;
  let frame = 0;
  function update() {
    frame = 0;
    const page = document.querySelector('#dc-root [data-whatsapp-screen]');
    const screen = page?.getAttribute('data-whatsapp-screen');
    const hero = page?.querySelector('.lm-hero-stage')?.closest('section');
    const footer = page?.querySelector('footer');
    const inHero = screen === 'Home' && (!hero || hero.getBoundingClientRect().bottom > 72);
    const inFooter = footer && footer.getBoundingClientRect().top < window.innerHeight;
    // update() also runs before React mounts, when there is no page yet.
    const clear = page?.getAttribute('data-whatsapp-menu') !== 'true' && !inHero && !inFooter;
    const show = ['Home', 'About', 'Projects'].includes(screen) && clear;
    // Contact already puts a WhatsApp call to action in the page body, so a
    // floating one there would say the same thing twice. The brochure has no
    // other way in anywhere on the site, and Contact is where someone is most
    // likely to want the company profile -- so that one alone joins it.
    const showBrochure = clear && (show || screen === 'Contact');
    links.forEach(link => {
      link.hidden = link.classList.contains('lm-brochure') ? !showBrochure : !show;
    });
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  // React mounts and changes screens after boot. Ignore animation style changes.
  new MutationObserver(schedule).observe(document.body, {
    subtree:true, childList:true, attributes:true,
    attributeFilter:['data-whatsapp-screen','data-whatsapp-menu']
  });
  update();
})();
