import { useState } from 'react';
import { Trash2, Phone, Mail, MapPin, Inbox, RotateCw } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import IconButton from '../../components/IconButton.jsx';
import Dropdown from '../../components/Dropdown.jsx';
import Chip from '../../components/Chip.jsx';
import Button from '../../components/Button.jsx';
import PageLoader from '../../components/PageLoader.jsx';
import AdminPageHeader from '../components/AdminPageHeader.jsx';
import { useAdminList } from '../useAdminList.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cardClass } from '../../components/cardClass.js';
import { formatDate } from '../../lib/format.js';
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_STYLE, ENQUIRY_TYPES } from '../components/adminLabels.js';

const STATUS_OPTIONS = ENQUIRY_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));

// "treeHeight" → "Tree height", "pickup_showroom" → "Pickup showroom".
const labelFor = (key) => {
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const textFor = (value) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : v)).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/** An enquiry's `details` (whatever its form sent): a list of items (older quote requests) as a list, the rest as "Label: value". */
const Details = ({ details }) => {
  if (!details || typeof details !== 'object') return null;
  const { items } = details;
  // itemCount repeats the list's length.
  const extra = Object.entries(details).filter(
    ([key, value]) => key !== 'items' && key !== 'itemCount' && value !== null && value !== undefined && value !== ''
  );

  return (
    <>
      {Array.isArray(items) && items.length > 0 && (
        <ul className="mt-3 flex list-none flex-col gap-1 rounded-lg border border-contrast/5 bg-contrast/5 p-3 text-[0.82rem]">
          {items.map((item, i) => (
            <li key={item.id ?? i} className="flex justify-between gap-3">
              <span className="text-text-primary">
                {item.name ?? item.id}
                {item.categoryLabel && <span className="ml-2 text-[0.75rem] text-text-muted">{item.categoryLabel}</span>}
              </span>
              <span className="font-mono text-gold-300">× {item.quantity ?? item.qty ?? 1}</span>
            </li>
          ))}
        </ul>
      )}
      {extra.length > 0 && (
        <dl className="mt-3 grid gap-x-4 gap-y-1 text-[0.8rem] sm:grid-cols-[max-content_1fr]">
          {extra.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-text-muted">{labelFor(key)}</dt>
              <dd className="text-text-secondary">{textFor(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
};

/** Enquiries from the website (consultations, questions; older quote requests), newest first: status, details, delete. */
const AdminEnquiries = () => {
  const { request } = useAdminAuth();
  const { showToast } = useToast();
  const { items: enquiries, loading, error, reload, setItems } = useAdminList('/admin/enquiries');
  const [filter, setFilter] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);

  const visible = filter === 'all' ? enquiries : enquiries.filter((e) => e.status === filter);

  const setStatus = async (enq, status) => {
    try {
      const saved = await request(`/admin/enquiries/${enq.id}`, { method: 'PATCH', body: { status } });
      setItems((list) => list.map((e) => (e.id === enq.id ? { ...e, ...saved } : e)));
    } catch (err) {
      showToast(err.message);
    }
  };

  const remove = async () => {
    const enq = pendingDelete;
    setPendingDelete(null);
    try {
      await request(`/admin/enquiries/${enq.id}`, { method: 'DELETE' });
      setItems((list) => list.filter((e) => e.id !== enq.id));
      showToast('Enquiry deleted');
    } catch (err) {
      showToast(err.message);
    }
  };

  if (loading) return <PageLoader label="Loading enquiries" />;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Enquiries"
        subtitle="Consultation requests from the contact page and other questions from the website."
        actions={
          <Button size="sm" variant="outline" onClick={reload}>
            <RotateCw size={14} strokeWidth={2} />
            Refresh
          </Button>
        }
      />

      {error && (
        <p role="alert" className="text-[0.85rem] text-ruby-500">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {['all', ...ENQUIRY_STATUSES].map((s) => {
          const count = s === 'all' ? enquiries.length : enquiries.filter((e) => e.status === s).length;
          return (
            <Chip key={s} size="sm" active={filter === s} onClick={() => setFilter(s)} className="capitalize">
              {s} ({count})
            </Chip>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className={`${cardClass('tile')} flex flex-col items-center gap-3 py-16 text-center`}>
          <Inbox size={36} strokeWidth={1.5} className="text-gold-400/50" />
          <p className="text-[0.88rem] text-text-muted">No enquiries in this view.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((enq) => (
            <div key={enq.id} className={`${cardClass('tile')} p-5`}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[1rem] font-semibold text-text-primary">{enq.name || 'Unnamed'}</p>
                  <span className="font-mono text-[0.7rem] uppercase tracking-widest text-gold-400">
                    {ENQUIRY_TYPES[enq.type] ?? enq.type} &middot; {formatDate(enq.createdAt, true)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Dropdown
                    label="Enquiry status"
                    options={STATUS_OPTIONS}
                    value={enq.status}
                    onChange={(status) => setStatus(enq, status)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.75rem] font-bold uppercase ${ENQUIRY_STATUS_STYLE[enq.status] ?? ENQUIRY_STATUS_STYLE.closed}`}
                  />
                  <IconButton variant="delete" label="Delete enquiry" onClick={() => setPendingDelete(enq)}>
                    <Trash2 size={14} strokeWidth={2} />
                  </IconButton>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[0.82rem] text-text-secondary">
                {enq.phone && (
                  <a href={`tel:${enq.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-1.5 text-text-secondary no-underline hover:text-gold-300">
                    <Phone size={13} strokeWidth={2} /> {enq.phone}
                  </a>
                )}
                {enq.email && (
                  <a href={`mailto:${enq.email}`} className="flex items-center gap-1.5 text-text-secondary no-underline hover:text-gold-300">
                    <Mail size={13} strokeWidth={2} /> {enq.email}
                  </a>
                )}
                {enq.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} strokeWidth={2} /> {enq.city}
                  </span>
                )}
              </div>

              {enq.message && <p className="mt-3 whitespace-pre-line text-[0.85rem] leading-[1.6] text-text-secondary">{enq.message}</p>}
              <Details details={enq.details} />
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete enquiry"
        message={`Delete the enquiry from ${pendingDelete?.name || 'this customer'}? This cannot be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
    </div>
  );
};

export default AdminEnquiries;
