// THE SITE HAS MORE THAN ONE ADDRESS, AND ONLY ONE OF THEM IS THE SITE.
//
// Cloudflare Pages gives every project a permanent <project>.pages.dev and
// every branch a <branch>.<project>.pages.dev, all public, with no switch to
// turn them off. So www.longmotive-m.com has a twin serving byte-identical
// content at longmotive-web-demo-site-avm.pages.dev -- an address that names
// the project, the account and the fact that it started life as a demo.
//
// Cloudflare already sends x-robots-tag: noindex on BRANCH previews. It does
// not send it on the project host, which is the one that mirrors production,
// so that is the address search engines can index and people can find. The
// canonical tag points at www from every host, which is what has kept the
// duplicates out of the index so far, but a canonical is a hint and the
// address still answers.
//
// Branch previews are how work gets reviewed before it ships, so they keep
// serving. They only get a robots.txt that says no.
//
// SCOPE IS DELIBERATE: this touches our own project's addresses and nothing
// else. The custom domain falls through on the first comparison, and so does
// any other Pages project that happens to deploy this repository -- that is
// someone else's site to configure.

const CANONICAL_ORIGIN = 'https://www.longmotive-m.com';
const PROJECT_HOST = 'longmotive-web-demo-site-avm.pages.dev';

const DISALLOW_ALL = 'User-agent: *\nDisallow: /\n';

// A reader gets moved; a form post and an asset fetch do not. Redirecting a
// POST would break /api/contact, and redirecting assets would mean a branch
// preview quietly rendering with production's files.
function isDocumentRequest(method, dest, accept) {
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (dest) return dest === 'document';
  return (accept || '').includes('text/html');
}

export function decide({ host, method = 'GET', pathname = '/', search = '', dest = '', accept = '' }) {
  const ours = host === PROJECT_HOST || host.endsWith('.' + PROJECT_HOST);
  if (!ours) return { action: 'pass' };

  if (pathname === '/robots.txt') return { action: 'robots' };

  // The project host mirrors production and has no job of its own.
  if (host === PROJECT_HOST && isDocumentRequest(method, dest, accept)) {
    return { action: 'redirect', to: CANONICAL_ORIGIN + pathname + search };
  }

  // Branch previews stay readable, and stay out of the index.
  return { action: 'noindex' };
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  const plan = decide({
    host: url.hostname,
    method: request.method,
    pathname: url.pathname,
    search: url.search,
    dest: request.headers.get('sec-fetch-dest') || '',
    accept: request.headers.get('accept') || '',
  });

  if (plan.action === 'pass') return next();

  if (plan.action === 'robots') {
    return new Response(DISALLOW_ALL, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (plan.action === 'redirect') return Response.redirect(plan.to, 301);

  const res = await next();
  // Only a document carries an index entry worth suppressing, and rebuilding
  // an asset response would throw away its immutable caching headers.
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;
  const out = new Response(res.body, res);
  out.headers.set('x-robots-tag', 'noindex, nofollow');
  return out;
}
