import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Phone, Sparkles, Check, Navigation } from 'lucide-react';
import Badge from './Badge.jsx';
import Button from './Button.jsx';
import {
  heroTreeGlow,
  festiveLanternGlow,
  luxuryGiftBoxes,
  goldenReindeerStatue,
  pineCrateBaubles,
  baublesScatter,
  santaChildGift,
  luxuryWreathAccent,
} from '../assets/decorations';

// PLACEHOLDER photos until each showroom has its own: a showroom with an `images` array in
// data/showrooms.js shows those instead. These are general festive photos, not of any store.
const PLACEHOLDER_GALLERY = [
  heroTreeGlow,
  festiveLanternGlow,
  luxuryGiftBoxes,
  goldenReindeerStatue,
  pineCrateBaubles,
  baublesScatter,
  santaChildGift,
  luxuryWreathAccent,
];
const THUMBS = 5; // thumbnails shown under the photo; the strip scrolls with the selection

const ICON = 'mt-0.5 shrink-0 text-gold-400';

/**
 * One showroom: a photo gallery (main photo with ‹ n/total › and a thumbnail strip) beside the details
 * card (name, address, hours, phone, highlights, directions / consultation).
 * The parent keys it by city, so switching city starts the gallery again at the first photo.
 */
const ShowroomCard = ({ showroom }) => {
  const photos = showroom.images?.length ? showroom.images : PLACEHOLDER_GALLERY;
  const [idx, setIdx] = useState(0);
  const go = (d) => setIdx((i) => (i + d + photos.length) % photos.length);
  // Keep the chosen thumbnail in view: the strip starts so the selection is shown, without running past the end.
  const first = Math.min(Math.max(0, idx - (THUMBS - 1)), Math.max(0, photos.length - THUMBS));
  const [lead, ...rest] = showroom.features;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      {/* Gallery */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-gold-400/25 bg-[#04120a] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          {photos.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={i === idx ? `${showroom.city} showroom, photo ${i + 1} of ${photos.length}` : ''}
              aria-hidden={i !== idx}
              loading={i === 0 ? 'eager' : 'lazy'}
              className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${
                i === idx ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full border border-white/15 bg-[rgba(4,15,10,0.7)] px-2 py-1 text-[0.8rem] text-white">
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
        </div>

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
                className={`aspect-[4/3] cursor-pointer overflow-hidden rounded-lg border transition-all duration-300 ${
                  i === idx ? 'border-gold-400 shadow-[0_0_12px_rgba(229,199,139,0.4)]' : 'border-gold-400/15 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col rounded-2xl border border-gold-400/25 bg-[rgba(6,22,15,0.82)] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] md:p-8">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h3 className="font-serif text-[1.3rem] text-white md:text-[1.4rem]">{showroom.city} Experience Centre</h3>
          {showroom.isFlagship && <Badge>Flagship</Badge>}
        </div>
        <p className="mb-6 text-[0.92rem] leading-[1.6] text-text-secondary">{showroom.address}</p>

        <div className="mb-4 flex gap-3.5 text-[0.92rem] text-text-secondary">
          <Clock size={22} strokeWidth={1.6} className={ICON} />
          <div>
            <strong className="block font-semibold text-gold-300">Operating Hours</strong>
            {showroom.timing}
          </div>
        </div>

        <div className="mb-4 flex gap-3.5 text-[0.92rem] text-text-secondary">
          <Phone size={22} strokeWidth={1.6} className={ICON} />
          <div>
            <strong className="block font-semibold text-gold-300">Direct Phone</strong>
            {showroom.phone}
          </div>
        </div>

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

        <div className="mt-auto grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            href={`https://maps.google.com/?q=${encodeURIComponent(showroom.mapQuery || showroom.address)}`}
            target="_blank"
            rel="noreferrer"
            className="px-3!"
          >
            <Navigation size={16} strokeWidth={2} />
            Get Directions
          </Button>
          <Button to="/contact" className="px-3!">
            Book a Consultation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShowroomCard;
