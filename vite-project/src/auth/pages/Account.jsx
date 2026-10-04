import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LogOut, Mail, Phone, User, Inbox } from 'lucide-react';
import { GRADIENT_TITLE } from '../../components/SectionHeading.jsx';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { listEnquiries } from '../../lib/enquiries.js';
import Eyebrow from '../../components/Eyebrow.jsx';

const STATUS_STYLE = {
  new: 'bg-emerald-500/15 text-emerald-300',
  contacted: 'bg-gold-400/15 text-gold-300',
  closed: 'bg-white/8 text-text-muted',
};

export default function Account() {
  const { session, isAuthenticated, logout } = useCustomerAuth();
  const { showToast } = useToast();
  const location = useLocation();

  // Match by the session tag first (set at submit time); fall back to whatever
  // email the customer typed on the checkout form, in case it predates that tag.
  const myEnquiries = useMemo(() => {
    if (!session) return [];
    return listEnquiries().filter(
      (e) => e.customerEmail === session.email || e.email === session.email
    );
  }, [session]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <section className="relative z-20 bg-bg-primary py-16 md:py-25">
      <div className="mx-auto max-w-[900px] px-6">
        <Eyebrow>
          ✦ MY ACCOUNT ✦
        </Eyebrow>
        <h1 className={`mb-8 font-serif text-[2rem] font-bold leading-[1.2] tracking-[0.04em] sm:text-[2.4rem] ${GRADIENT_TITLE}`}>
          Welcome, {session.name.split(' ')[0]}
        </h1>

        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-gold-400/20 bg-[rgba(8,28,20,0.85)] p-6 md:p-8">
          <div className="flex items-center gap-3">
            <User size={18} strokeWidth={2} className="shrink-0 text-gold-400" />
            <span className="text-[0.95rem] text-white">{session.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={18} strokeWidth={2} className="shrink-0 text-gold-400" />
            <span className="text-[0.95rem] text-text-secondary">{session.email}</span>
          </div>
          {session.phone && (
            <div className="flex items-center gap-3">
              <Phone size={18} strokeWidth={2} className="shrink-0 text-gold-400" />
              <span className="text-[0.95rem] text-text-secondary">{session.phone}</span>
            </div>
          )}

          <button
            onClick={() => {
              logout();
              showToast('Signed out');
            }}
            className="mt-2 inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-2.5 text-[0.85rem] text-text-secondary transition-all hover:border-ruby-500 hover:text-ruby-500"
          >
            <LogOut size={15} strokeWidth={2} />
            Sign out
          </button>
        </div>

        <h2 className="mb-4 flex items-center gap-2 font-serif text-[1.25rem] text-white">
          <Inbox size={18} strokeWidth={2} className="text-gold-400" />
          My Enquiries
        </h2>

        {myEnquiries.length === 0 ? (
          <div className="rounded-2xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] px-6 py-12 text-center text-text-secondary">
            You haven&apos;t submitted a quote request or consultation yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {myEnquiries.map((enq) => (
              <div key={enq.id} className="rounded-xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-gold-400">
                    {enq.type === 'quote-request' ? 'Quote Request' : 'Consultation'} &bull;{' '}
                    {new Date(enq.createdAt).toLocaleDateString()}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase ${STATUS_STYLE[enq.status] ?? STATUS_STYLE.new}`}
                  >
                    {enq.status}
                  </span>
                </div>
                {enq.items?.length > 0 && (
                  <ul className="flex list-none flex-col gap-1 text-[0.85rem] text-text-secondary">
                    {enq.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span>{item.name}</span>
                        <span className="font-mono text-gold-300">&times; {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {enq.showroom && !enq.items?.length && (
                  <p className="text-[0.85rem] text-text-secondary">
                    Requested consultation for {enq.showroom}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
