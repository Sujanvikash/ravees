import { useState } from 'react';
import { Trash2, Phone, Mail, MapPin, Inbox } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import {
  STATUSES,
  deleteEnquiry,
  listEnquiries,
  updateEnquiryStatus,
} from '../../lib/enquiries.js';

const STATUS_STYLE = {
  new: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  contacted: 'bg-gold-400/15 text-gold-300 border-gold-400/30',
  closed: 'bg-white/8 text-text-muted border-white/10',
};

export default function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState(listEnquiries);
  const [filter, setFilter] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);

  const refresh = () => setEnquiries(listEnquiries());
  const visible = filter === 'all' ? enquiries : enquiries.filter((e) => e.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[1.6rem] font-bold tracking-[0.03em] text-white">Enquiries</h1>
        <p className="mt-1 text-[0.85rem] text-text-secondary">
          Quote requests from checkout and consultation requests from the contact page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', ...STATUSES].map((s) => {
          const count = s === 'all' ? enquiries.length : enquiries.filter((e) => e.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-[0.8rem] capitalize transition-all ${
                filter === s
                  ? 'border-gold-300 bg-gold-500 font-semibold text-[#04120a]'
                  : 'border-gold-400/15 bg-[rgba(8,28,20,0.85)] text-text-secondary hover:border-gold-400 hover:text-white'
              }`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] py-16 text-center">
          <Inbox size={36} strokeWidth={1.5} className="text-gold-400/50" />
          <p className="text-[0.88rem] text-text-muted">No enquiries in this view.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((enq) => (
            <div key={enq.id} className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[1rem] font-semibold text-white">{enq.name || 'Unnamed'}</p>
                  <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-gold-400">
                    {enq.type === 'quote-request' ? 'Quote request' : 'Consultation'} ·{' '}
                    {new Date(enq.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={enq.status}
                    onChange={(e) => {
                      updateEnquiryStatus(enq.id, e.target.value);
                      refresh();
                    }}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-[0.75rem] font-bold uppercase outline-none ${STATUS_STYLE[enq.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-bg-dark-emerald text-white">
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPendingDelete(enq)}
                    className="flex cursor-pointer items-center rounded-lg border border-white/10 p-1.5 text-text-muted transition-all hover:border-ruby-500 hover:text-ruby-500"
                    aria-label="Delete enquiry"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[0.82rem] text-text-secondary">
                {enq.phone && (
                  <a href={`tel:${enq.phone}`} className="flex items-center gap-1.5 text-text-secondary no-underline hover:text-gold-300">
                    <Phone size={13} strokeWidth={2} /> {enq.phone}
                  </a>
                )}
                {enq.email && (
                  <a href={`mailto:${enq.email}`} className="flex items-center gap-1.5 text-text-secondary no-underline hover:text-gold-300">
                    <Mail size={13} strokeWidth={2} /> {enq.email}
                  </a>
                )}
                {(enq.city || enq.showroom) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} strokeWidth={2} />
                    {enq.fulfilment === 'pickup' || enq.type === 'consultation'
                      ? `${enq.showroom} showroom`
                      : enq.city}
                  </span>
                )}
              </div>

              {enq.items?.length > 0 && (
                <ul className="mt-3 flex list-none flex-col gap-1 rounded-lg border border-white/5 bg-black/20 p-3 text-[0.82rem]">
                  {enq.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="text-white">{item.name}</span>
                      <span className="font-mono text-gold-300">× {item.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}

              {(enq.notes || enq.address || enq.height) && (
                <div className="mt-3 flex flex-col gap-1 text-[0.8rem] text-text-muted">
                  {enq.height && <span>Tree height interest: {enq.height}</span>}
                  {enq.address && <span>Address: {enq.address}</span>}
                  {enq.notes && <span>Notes: {enq.notes}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete enquiry"
        message={`Delete the enquiry from ${pendingDelete?.name || 'this customer'}? This cannot be undone.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteEnquiry(pendingDelete.id);
          setPendingDelete(null);
          refresh();
        }}
      />
    </div>
  );
}
