/**
 * Enquiry log shared by the storefront (writes) and the admin dashboard (reads).
 * There is no backend, so it persists to localStorage — per browser, like the cart.
 */
const KEY = 'raave-enquiries';

export const STATUSES = ['new', 'contacted', 'closed'];

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore quota/private-mode failures
  }
}

export function listEnquiries() {
  return read().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function addEnquiry(enquiry) {
  const record = {
    id: `enq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: 'new',
    ...enquiry,
  };
  write([...read(), record]);
  return record;
}

export function updateEnquiryStatus(id, status) {
  write(read().map((e) => (e.id === id ? { ...e, status } : e)));
}

export function deleteEnquiry(id) {
  write(read().filter((e) => e.id !== id));
}
