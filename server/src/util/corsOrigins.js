/** Normalize URL for comparison (scheme + host, lowercase, no trailing path slash). */
export function normalizeOrigin(url) {
  if (!url || typeof url !== 'string') return '';
  const t = url.trim();
  if (!t) return '';
  try {
    const u = new URL(t);
    return `${u.protocol}//${u.host}`.toLowerCase();
  } catch {
    return t.replace(/\/$/, '').toLowerCase();
  }
}

export function parseClientOriginsFromEnv() {
  return (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => normalizeOrigin(s.trim()))
    .filter(Boolean);
}

/**
 * Whether a browser Origin header is allowed (Express + Socket.io).
 * Set ALLOW_VERCEL_PREVIEWS=true on the API to permit any *.vercel.app (preview URLs).
 */
export function isAllowedOrigin(origin, { isDev, allowedList }) {
  if (!origin) return true;
  const n = normalizeOrigin(origin);
  if (allowedList.includes(n)) return true;
  if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (process.env.ALLOW_VERCEL_PREVIEWS === 'true') {
    try {
      const { hostname } = new URL(origin);
      if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app')) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
