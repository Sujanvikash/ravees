import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Phone, Sparkles, Check, Navigation, MapPin } from 'lucide-react';
import Button from './Button.jsx';
import { heroTreeGlow, festiveLanternGlow, luxuryGiftBoxes, pineCrateBaubles } from '../assets/decorations';
import { cardClass } from './cardClass.js';
import { telHref } from '../data/site.js';

// Until a store has photos of its own (uploaded in the admin), these general festive photos stand in.
const PLACEHOLDER_GALLERY = [heroTreeGlow, festiveLanternGlow, luxuryGiftBoxes, pineCrateBaubles];
const THUMBS = 5; // thumbnails shown under the photo; the strip scrolls with the selection

const ICON = 'mt-0.5 shrink-0 text-gold-400';

/** The store on Google Maps: its own listing when the admin gave the link, otherwise a search for it. */
const mapsLink = (store, showroom) =>
  store.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(`Raave’s Evergreen, ${store.address || showroom.city}`)}`;

/** A map of the store, looked up by name and address (Google's embed needs no key). */
const embedSrc = (store, showroom) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(`Raave’s Evergreen, ${store.address || showroom.city}`)}&z=16&output=embed`;

/**
 * One store: its photos (main photo with ‹ n/total › and a thumbnail strip) beside the details card (name, address,
 * hours, phone, the city's highlights, directions and a call button), and a map of where it is below.
 * The parent keys it by store, so switching city starts the gallery again at the first photo.
 */
const ShowroomCard = ({ showroom, store }) => {
  const own = store.images?.length > 0;
  const photos = own ? store.images : PLACEHOLDER_GALLERY;
  const [idx, setIdx] = useState(0);
  const go = (d) => setIdx((i) => (i + d + photos.length) % photos.length);
  // Keep the chosen thumbnail in view: the strip starts so the selection is shown, without running past the end.
  const first = Math.min(Math.max(0, idx - (THUMBS - 1)), Math.max(0, photos.length - THUMBS));
  const [lead, ...rest] = showroom.features ?? [];
  const phone = store.phone || showroom.phone;
  const timing = store.timing || showroom.timing;
  const title = store.name && store.name !== showroom.city ? `${store.name}, ${showroom.city}` : showroom.city;

  return (
    <article className="flex flex-col gap-5">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Gallery */}
        <div className="flex flex-col gap-3">
          <div className="relative aspect-16/10 overflow-hidden rounded-2xl border border-gold-400/25 bg-shade shadow-[0_20px_50px_--alpha(var(--color-shadow)/60%)]">
            {photos.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={i === idx ? `Raave’s Evergreen ${title}, photo ${i + 1} of ${photos.length}` : ''}
                aria-hidden={i !== idx}
                loading={i === 0 ? 'eager' : 'lazy'}
                className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${
                  i === idx ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full border border-contrast/15 bg-surface/90 px-2 py-1 text-[0.8rem] text-text-primary">
                <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="cursor-pointer rounded-full p-1 hover:text-gold-300">
                  <ChevronLeft size={16} strokeWidth={2} />
                </button>
                <span className="min-w-[2.6rem] text-center tabular-nums" aria-live="polite">
                  {idx + 1}/{photos.length}
                </span>
                <button type="button" onClick={() => go(1)} aria-label="Next photo" className="cursor-pointer rounded-full p-1 hover:text-gold-300">
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {photos.slice(first, first + THUMBS).map((src, k) => {
                const i = first + k;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setIdx(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === idx}
                    className={`aspect-4/3 cursor-pointer overflow-hidden rounded-lg border transition-all duration-300 ${
                      i === idx ? 'border-gold-400 shadow-[0_0_12px_--alpha(var(--color-gold-400)/40%)]' : 'border-gold-400/15 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Details */}
        <div className={`${cardClass('raised')} flex flex-col p-7 md:p-8`}>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h3 className="font-serif text-[1.3rem] text-text-primary md:text-[1.4rem]">{title}</h3>
          </div>
          <p className="mb-6 flex gap-2 text-[0.92rem] leading-[1.6] text-text-secondary">
            <MapPin size={18} strokeWidth={1.8} className={ICON} aria-hidden="true" />
            {store.address || showroom.address}
          </p>

          {timing && (
            <div className="mb-4 flex gap-3.5 text-[0.92rem] text-text-secondary">
              <Clock size={22} strokeWidth={1.6} className={ICON} />
              <div>
                <strong className="block font-semibold text-gold-300">Open Every Day</strong>
                {timing}
              </div>
            </div>
          )}

          {phone && (
            <div className="mb-4 flex gap-3.5 text-[0.92rem] text-text-secondary">
              <Phone size={22} strokeWidth={1.6} className={ICON} />
              <div>
                <strong className="block font-semibold text-gold-300">Phone</strong>
                {phone.split('/').map((number, i) => (
                  <span key={number}>
                    {i > 0 && ' / '}
                    <a href={telHref(number)} className="text-text-secondary no-underline hover:text-gold-300">
                      {number.trim()}
                    </a>
                  </span>
                ))}
              </div>
            </div>
          )}

          {lead && (
            <div className="mb-7 flex gap-3.5 text-[0.92rem] text-text-secondary">
              <Sparkles size={22} strokeWidth={1.6} className={ICON} />
              <div>
                <strong className="block font-semibold text-gold-300">Store Highlights</strong>
                {lead}
                <ul className="mt-1.5 flex list-none flex-col gap-1.5">
                  {/* The highlights cascade in whenever the card appears (each city switch remounts it). */}
                  {rest.map((feature, i) => (
                    <li key={feature} className="flex animate-slide-in items-center gap-2" style={{ animationDelay: `${150 + i * 70}ms` }}>
                      <Check size={16} strokeWidth={2.5} className="shrink-0 text-gold-400" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="mt-auto grid grid-cols-2 gap-3">
            <Button variant="outline" href={mapsLink(store, showroom)} target="_blank" rel="noreferrer" className="px-3!">
              <Navigation size={16} strokeWidth={2} />
              Get Directions
            </Button>
            {phone ? (
              <Button href={telHref(phone)} className="px-3!">
                <Phone size={16} strokeWidth={2} />
                Call the Store
              </Button>
            ) : (
              <Button to="/contact" className="px-3!">
                Contact Us
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Where it is: Google's map of the store, loaded only when it scrolls near. */}
      <iframe
        title={`Map: Raave’s Evergreen ${title}`}
        src={embedSrc(store, showroom)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-64 w-full rounded-2xl border border-gold-400/25 bg-shade md:h-80"
      />
    </article>
  );
};

export default ShowroomCard;
