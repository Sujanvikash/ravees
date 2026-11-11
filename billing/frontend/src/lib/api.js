/**
 * Talking to the billing API (billing/backend). Its address comes from VITE_API_URL (see .env.example).
 * The login token is kept in localStorage and sent with every request; when the server says it is no
 * longer valid (401), the app is told through the 'billing-signed-out' event and goes back to sign-in.
 */
const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'billing-token';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** True when a request never got to the API: no internet, or the server (or the HTTPS proxy in front of it) is
 *  down. The request did nothing, so a bill can be kept on the counter and sent again later. */
export const unreachable = (err) => err instanceof ApiError && [0, 502, 503, 504].includes(err.status);

export const setToken = (token) => {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
};

const getToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

/** FastAPI's error body as one readable sentence. */
const message = (body, status) => {
  const d = body?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg.replace(/^Value error, /, '');
  return `The billing server answered with an error (${status}).`;
};

/** api('/products'), api('/users/pune/password', { method: 'PUT', body: { password } }) → the JSON reply. */
export const api = async (path, { method = 'GET', body } = {}) => {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Can’t reach the billing server. Check the connection and try again.', 0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    // a wrong password at sign-in is a 401 too, but not a reason to sign out
    if (res.status === 401 && !path.startsWith('/auth/')) {
      setToken(null);
      window.dispatchEvent(new Event('billing-signed-out'));
    }
    throw new ApiError(message(data, res.status), res.status);
  }
  return data;
};

/** A file the API makes or keeps, as { blob, name }: the name the server gives it, else `fallbackName`. */
const fetchFile = async (path, fallbackName) => {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError('Can’t reach the billing server. Check the connection and try again.', 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(message(data, res.status), res.status);
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName;
  return { blob: await res.blob(), name };
};

const save = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Downloads a file the API makes (e.g. the sales report) and saves it under the name the server gives it. */
export const download = async (path, fallbackName) => {
  const { blob, name } = await fetchFile(path, fallbackName);
  save(blob, name);
};

/** Opens a file the API keeps (an e-way bill's PDF) in a new tab, to read or print. The tab opens straight away,
 *  while the click still counts, and shows the file once it has come; where the browser won't open a tab, the file
 *  is saved instead. */
export const view = async (path, fallbackName) => {
  const tab = window.open('', '_blank');
  try {
    const { blob, name } = await fetchFile(path, fallbackName);
    if (!tab) return save(blob, name);
    const url = URL.createObjectURL(blob);
    tab.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    tab?.close();
    throw err;
  }
};
