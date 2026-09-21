// The two floating shortcuts are decided entirely by whatsapp.js, and the rule
// is not obvious from reading it: the brochure appears on one more screen than
// the WhatsApp button does, because Contact already carries a WhatsApp call to
// action in the page body while the brochure PDF has no other entry point
// anywhere on the site.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'whatsapp.js'), 'utf8');

// A screen is described by where it is rather than by what it contains: which
// screen is mounted, whether the mobile menu is open, how far the footer is
// from the bottom of the viewport, and whether the hero still covers the view.
function render({ screen, menu = 'false', footerTop = 5000, heroBottom = null }) {
  const state = {};
  const link = className => ({
    className,
    classList: { contains: c => className.split(' ').includes(c) },
    set hidden(v) { state[className] = v; },
    get hidden() { return state[className]; },
  });
  const links = [link('lm-whatsapp lm-brochure'), link('lm-whatsapp')];

  const page = screen === null ? null : {
    getAttribute: a => (a === 'data-whatsapp-screen' ? screen : menu),
    querySelector: q => {
      if (q.includes('hero')) {
        return heroBottom === null ? null : { closest: () => ({ getBoundingClientRect: () => ({ bottom: heroBottom }) }) };
      }
      return { getBoundingClientRect: () => ({ top: footerTop }) };
    },
  };

  const sandbox = {
    document: { querySelectorAll: () => links, querySelector: () => page, body: {} },
    window: { addEventListener() {}, innerHeight: 900 },
    requestAnimationFrame: () => 0,
    MutationObserver: class { observe() {} },
  };
  sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);           // the IIFE ends with a synchronous update()
  return {
    brochure: state['lm-whatsapp lm-brochure'] ? 'hidden' : 'shown',
    whatsapp: state['lm-whatsapp'] ? 'hidden' : 'shown',
  };
}

for (const screen of ['About', 'Projects']) {
  assert.deepEqual(render({ screen }), { brochure: 'shown', whatsapp: 'shown' }, `${screen} shows both shortcuts`);
}

// Home only once the hero is behind you -- inside it the page is a film.
assert.deepEqual(render({ screen: 'Home', heroBottom: 600 }), { brochure: 'hidden', whatsapp: 'hidden' }, 'nothing floats over the hero');
assert.deepEqual(render({ screen: 'Home', heroBottom: -200 }), { brochure: 'shown', whatsapp: 'shown' }, 'both return once the hero is past');

// The rule this test exists for.
assert.deepEqual(render({ screen: 'Contact' }), { brochure: 'shown', whatsapp: 'hidden' }, 'Contact offers the brochure and not a second WhatsApp button');

// Shared suppressions still apply on Contact.
assert.deepEqual(render({ screen: 'Contact', menu: 'true' }), { brochure: 'hidden', whatsapp: 'hidden' }, 'an open mobile menu clears the shortcuts');
assert.deepEqual(render({ screen: 'Contact', footerTop: 100 }), { brochure: 'hidden', whatsapp: 'hidden' }, 'the footer takes the shortcuts back');

// update() also runs before React has mounted anything.
assert.deepEqual(render({ screen: null }), { brochure: 'hidden', whatsapp: 'hidden' }, 'no screen yet must not throw');

// And the button has to point at a file that ships.
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(index, /class="lm-whatsapp lm-brochure"[^>]*href="\/downloads\/longmotive-company-profile-2024\.pdf"/);
assert.ok(fs.existsSync(path.join(root, 'downloads', 'longmotive-company-profile-2024.pdf')));

console.log('PASS: floating shortcuts appear on the screens they belong on');
