/**
 * The shop API client, shared by the storefront and the admin (ecommerce/backend; its README is the
 * contract). JSON in and out; a signed-in call passes its `token`. A failed call throws an Error whose
 * message is the server's sentence for the person (`detail`) and whose `status` is the HTTP status
 * (0 when the server couldn't be reached).
 */
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api/v1').replace(/\/+$/, '');

const OFFLINE = "We couldn't reach the shop's server. Please check your connection and try again.";

const apiError = (message, status) => Object.assign(new Error(message), { status });

/**
 * The person-readable message of an error answer. The API sends `{ detail: "a sentence" }`; FastAPI's own
 * validation answers send `detail` as a list of problems, of which the first is shown.
 */
const detailOf = (data, status) => {
  const detail = data?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (status === 401) return 'Please sign in again.';
  if (status === 404) return "We couldn't find that.";
  if (status === 429) return 'Too many tries. Please wait a few minutes and try again.';
  return 'Something went wrong on our side. Please try again in a moment.';
};

const parse = async (res) => {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * One API call. `path` is under /api/v1 ("/storefront"); `body` is sent as JSON (or as is when it is
 * FormData). Answers the parsed JSON, or null for an empty answer (204).
 */
export const api = async (path, { method = 'GET', body, token, signal } = {}) => {
  const isForm = body instanceof FormData;
  const headers = { Accept: 'application/json' };
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw apiError(OFFLINE, 0);
  }

  const data = await parse(res);
  if (!res.ok) throw apiError(detailOf(data, res.status), res.status);
  return data;
};

/**
 * Uploads one file as multipart form data (field `file`). fetch can't report upload progress, so this
 * uses XMLHttpRequest: `onProgress(fraction)` is called with 0–1 as the bytes go up.
 */
export const upload = (path, file, { token, onProgress } = {}) =>
  new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        // not JSON: detailOf falls back to a general message
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(apiError(detailOf(data, xhr.status), xhr.status));
    };
    xhr.onerror = () => reject(apiError(OFFLINE, 0));
    xhr.send(form);
  });

/** A sign-in token kept in localStorage as plain text (not JSON), so it reads the same anywhere. */
export const readToken = (key) => {
  try {
    return window.localStorage.getItem(key) || null;
  } catch {
    return null;
  }
};

export const writeToken = (key, token) => {
  try {
    if (token) window.localStorage.setItem(key, token);
    else window.localStorage.removeItem(key);
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
};
