import { Navigation, Phone, Clock, Sparkles } from 'lucide-react';
import Badge from './Badge.jsx';

/**
 * Reads the fields the SHOWROOMS data actually has (title/timing/isFlagship) — the
 * old ShowroomsSection read type/name/hours/size, which rendered as undefined.
 */
export default function ShowroomCard({ showroom }) {
  return (
    <div className="rounded-3xl border border-gold-400/30 bg-[rgba(8,28,20,0.85)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] md:p-12">
      <div className="grid items-center gap-9 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-gold-400">
              {showroom.city} Experience Centre
            </span>
            {showroom.isFlagship && <Badge>Flagship</Badge>}
          </div>

          <h3 className="mb-4 font-serif text-[1.5rem] text-white md:text-[1.8rem]">{showroom.title}</h3>
          <p className="mb-5 text-[0.95rem] leading-[1.7] text-text-secondary">{showroom.address}</p>

          <div className="mb-3.5 flex gap-3 text-[0.9rem] text-text-secondary">
            <Clock size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-gold-400" />
            <div>
              <strong className="block text-gold-300">Operating Hours</strong>
              {showroom.timing}
            </div>
          </div>

          <div className="mb-3.5 flex gap-3 text-[0.9rem] text-text-secondary">
            <Phone size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-gold-400" />
            <div>
              <strong className="block text-gold-300">Direct Phone</strong>
              {showroom.phone}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(showroom.mapQuery || showroom.address)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-gold-200 bg-[linear-gradient(135deg,var(--color-gold-400),var(--color-gold-600))] px-6.5 py-3 text-[0.88rem] font-semibold tracking-[0.06em] text-[#04140b] no-underline shadow-[0_0_20px_rgba(229,199,139,0.4)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <Navigation size={16} strokeWidth={2} />
              Get Directions
            </a>
            <a
              href={`tel:${showroom.phone.split('/')[0].replace(/[^0-9+]/g, '')}`}
              className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-gold-400/30 bg-[rgba(8,28,20,0.6)] px-6.5 py-3 text-[0.88rem] font-semibold tracking-[0.06em] text-gold-300 no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-400/15 hover:text-white"
            >
              <Phone size={16} strokeWidth={2} />
              Call Showroom
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-serif text-[1.05rem] text-gold-300">Store Highlights</h4>
          <ul className="flex list-none flex-col gap-2 text-[0.85rem] text-text-secondary">
            {showroom.features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-gold-400">✦</span>
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-3 rounded-xl border border-gold-400/15 bg-gold-400/10 p-4.5">
            <Sparkles size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-gold-300" />
            <p className="text-[0.85rem] leading-[1.6] text-gold-200">
              <em className="font-semibold not-italic">VIP tip:</em> book a personal styling consultation
              before your visit for dedicated 1-on-1 designer assistance and refreshment lounge access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
