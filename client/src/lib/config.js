const trim = (s) => (s || '').trim().replace(/\/$/, '');

/**
 * When the SPA is served from a different host than the API, set at build time:
 *   VITE_API_ROOT=https://api.yourdomain.com
 * Same-origin reverse-proxy setups can leave this unset (uses relative `/api`).
 */
const apiRoot = trim(import.meta.env.VITE_API_ROOT);
export const apiBaseURL = apiRoot ? `${apiRoot}/api` : '/api';

/**
 * Socket.io origin — usually the same as API. Defaults to `window.location.origin`.
 */
export function getSocketOrigin() {
  const o = trim(import.meta.env.VITE_SOCKET_ORIGIN);
  if (o) return o;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
