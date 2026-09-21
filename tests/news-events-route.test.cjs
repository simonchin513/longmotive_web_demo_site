const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const news = fs.readFileSync(path.join(root, 'news-events.html'), 'utf8');
const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const css = fs.readFileSync(path.join(root, 'news-events.css'), 'utf8');

assert.match(html, /'News & Events':'\/news-events\?v=20260917-1'/);
assert.match(html, /if\(n==='News & Events'\)\{ window\.location\.href=NAV_PATH\[n\]/);
assert.match(news, /<link rel="canonical" href="https:\/\/www\.longmotive-m\.com\/news-events">/);
for (const href of ['/', '/about', '/projects', '/news-events?v=20260917-1', '/contact']) {
  assert.ok(news.includes(`href="${href}"`), `News navigation must link to ${href}`);
}
assert.doesNotMatch(redirects, /^\/news-events\s+/m);
assert.doesNotMatch(redirects, /^\/news-events\s+\/\s+301$/m);
assert.match(sitemap, /<loc>https:\/\/www\.longmotive-m\.com\/news-events<\/loc>/);
assert.match(fs.readFileSync(path.join(root, '_headers'), 'utf8'), /\/news-events\s+Cache-Control: no-store, max-age=0/s);
assert.match(css, /\.ne-card-img\s*\{[^}]*object-fit:\s*cover/s);
assert.match(css, /\.ne-modal-header-img\s*\{[^}]*width:\s*100%[^}]*height:\s*auto[^}]*object-fit:\s*contain/s);
assert.doesNotMatch(css, /\.ne-modal-carousel::before/);
assert.doesNotMatch(news, /--ne-modal-image/);
assert.doesNotMatch(news, /class="ne-breadcrumb"/);
assert.match(news, /const modalWidth = Math\.min\(640, Math\.max\(320, naturalWidth\)\)/);
assert.match(css, /max-width:\s*var\(--ne-modal-natural-width, 640px\)/);
assert.match(news, /const galleryAssetVersion = '20260919-2'/);
assert.match(news, /assets\/events\/gallery\/\$\{file\}\?v=\$\{galleryAssetVersion\}/);

console.log('PASS: News & Events follows the shared URL and standalone-head pattern');
