/**
 * Walks a live Express 4 app and recovers, per route: the method, the full path, the mount
 * prefix it came from, the handler names, and — via the `__allowedRoles` tag added to
 * src/middleware/authorizeRoles.js — the roles the route *declares*.
 *
 * Why runtime introspection rather than grepping the routers: authorization in this codebase
 * is applied two different ways. Fifteen routers call `router.use(authorizeRoles(...))` once at
 * the top, which covers every route in the file; others guard individual routes; and
 * studentRoutes.js does both, so its effective policy is an intersection that no single grep
 * can see. Walking the stack is the only way to get the authorization the app really has, as
 * opposed to the one the source suggests.
 *
 * The one thing that does NOT survive a naive stack walk is handler identity: authorizeRoles
 * used to return an anonymous arrow, so a histogram of handler names over all 169 routes came
 * back as `189 <anonymous>, 5 authenticateJWT, 3 multerMiddleware`. Hence the tag.
 */

/**
 * Recover a mount prefix from the regexp Express compiled for `app.use('/prefix', router)`.
 * Express stores e.g. /^\/api\/attendance\/?(?=\/|$)/i — strip the anchors and un-escape.
 * `fast_slash` marks a router mounted at the root (`app.use(fn)`), which contributes no prefix.
 */
const prefixFromLayer = (layer) => {
  if (!layer.regexp || layer.regexp.fast_slash) return '';
  const match = layer.regexp.source.match(/^\^\\\/(.*?)\\\/\?\(\?=\\\/\|\$\)\$?$/);
  if (!match) return '';
  return '/' + match[1].replace(/\\\//g, '/').replace(/\\\./g, '.');
};

/** `//api//foo` -> `/api/foo`; `/api/` -> `/api`. Root stays `/`. */
const normalizePath = (p) => {
  const collapsed = ('/' + p).replace(/\/{2,}/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : '/';
};

const handlerName = (fn) => fn.name || '<anonymous>';

/**
 * Mirrors the allowlist in src/middleware/authMiddleware.js:8-16 exactly, including the fact
 * that two of the five checks are `startsWith` prefix matches rather than equality. Kept as a
 * literal transcription so the matrix suite can diff intent against behaviour; if the
 * middleware changes and this does not, the suite fails — which is the point.
 */
const isPublicPath = (p) =>
  p.startsWith('/api-docs') ||
  p === '/api/auth/login' ||
  p === '/api/auth/reset-password' ||
  p === '/api/health' ||
  p.startsWith('/api/samples');

/** Every guard has to pass, so the effective policy is the intersection of all of them. */
const intersectRoles = (guards) => {
  if (!guards.length) return null;
  return guards
    .map((g) => g.roles)
    .reduce((acc, roles) => acc.filter((r) => roles.includes(r)));
};

/**
 * @param stack        the layer array being walked
 * @param prefix       path accumulated from enclosing mounts
 * @param inherited    guards from enclosing scopes, in middleware order
 * @param out          collector
 */
const walkStack = (stack, prefix, inherited, out) => {
  // Guards accumulate as we move down a stack: a `router.use(guard)` at index 0 applies to
  // every layer after it, not to the ones before. Tracking this positionally rather than
  // hoisting keeps the model honest if a guard is ever inserted mid-file.
  let active = inherited;

  for (const layer of stack) {
    if (layer.route) {
      const routePath = normalizePath(prefix + layer.route.path);
      const handlers = layer.route.stack;
      const routeGuards = handlers
        .filter((h) => h.handle && h.handle.__allowedRoles)
        .map((h) => ({ scope: 'route', roles: [...h.handle.__allowedRoles] }));
      const guards = [...active, ...routeGuards];

      for (const method of Object.keys(layer.route.methods)) {
        if (method === '_all') continue;
        out.push({
          method: method.toUpperCase(),
          path: routePath,
          mountPrefix: prefix || '/',
          handlerNames: handlers.map((h) => handlerName(h.handle)),
          guards,
          declaredRoles: intersectRoles(guards),
          isPublic: isPublicPath(routePath),
        });
      }
    } else if (layer.handle && layer.handle.__allowedRoles) {
      // A pathless router.use(authorizeRoles(...)). Every such guard in this repo is pathless;
      // a path-scoped one would need its regexp intersected with each route below it, so fail
      // loudly rather than silently over-reporting coverage.
      if (layer.regexp && !layer.regexp.fast_slash) {
        throw new Error(
          `Path-scoped authorizeRoles guard at ${prefix} (${layer.regexp.source}) — ` +
            'routeWalker only models pathless router.use() guards. Teach it this case.'
        );
      }
      active = [...active, { scope: 'router', roles: [...layer.handle.__allowedRoles] }];
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      walkStack(layer.handle.stack, prefix + prefixFromLayer(layer), active, out);
    }
  }
};

/**
 * @param {import('express').Express} app
 * @returns {Array<{method,path,mountPrefix,handlerNames,guards,declaredRoles,isPublic}>}
 *   sorted by path then method, so the artifact is diffable across runs.
 */
const buildRouteInventory = (app) => {
  const router = app._router || (app.router && app.router.stack ? app.router : null);
  if (!router || !router.stack) {
    throw new Error('Could not find the Express router stack — Express version changed?');
  }
  const out = [];
  walkStack(router.stack, '', [], out);
  out.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  return out;
};

/**
 * Route count grouped by the first two path segments, which is the granularity the audit
 * reports at. Note this is deliberately NOT mountPrefix: notificationRoutes is mounted at
 * `/api` but owns `/api/notifications*`, and grouping it under `/api` would hide it.
 */
const censusByPrefix = (inventory) => {
  const counts = {};
  for (const r of inventory) {
    const segments = r.path.split('/').filter(Boolean).slice(0, 2);
    const key = segments.length ? '/' + segments.join('/') : '/';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
};

module.exports = {
  buildRouteInventory,
  censusByPrefix,
  isPublicPath,
  prefixFromLayer,
  intersectRoles,
};
