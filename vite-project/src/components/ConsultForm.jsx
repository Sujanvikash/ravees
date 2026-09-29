import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Button from './Button.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { SHOWROOMS } from '../data/showrooms.js';

const FIELD =
  'rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 font-sans text-[0.88rem] text-white outline-none transition-all focus:border-gold-400 focus:shadow-[0_0_10px_rgba(229,199,139,0.4)] placeholder:text-text-muted';
const LABEL = 'text-[0.78rem] text-gold-300';

const HEIGHT_OPTIONS = [
  { value: '6-7.5ft', label: '6ft – 7.5ft (Standard Living Room)' },
  { value: '9-12ft', label: '9ft – 12ft (High Ceiling / Villa)' },
  { value: 'Commercial', label: '15ft+ (Commercial / Church)' },
  { value: 'LightsDecor', label: 'Lights & Ornaments Only' },
];

export default function ConsultForm({ onSubmitted }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    showroom: 'Chennai',
    height: '6-7.5ft',
    notes: '',
  });

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitted?.({ ...form, type: 'consultation' });
    showToast(`Thank you, ${form.name}! Your consultation for ${form.showroom} has been requested.`);
    setForm({ name: '', phone: '', showroom: 'Chennai', height: '6-7.5ft', notes: '' });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="consult-name">
            Your Name
          </label>
          <input
            id="consult-name"
            type="text"
            required
            placeholder="e.g. David Thomas"
            value={form.name}
            onChange={update('name')}
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="consult-phone">
            Phone / WhatsApp Number
          </label>
          <input
            id="consult-phone"
            type="tel"
            required
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={update('phone')}
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="consult-showroom">
            Preferred Showroom
          </label>
          <select
            id="consult-showroom"
            value={form.showroom}
            onChange={update('showroom')}
            className={`${FIELD} cursor-pointer`}
          >
            {SHOWROOMS.map((room) => (
              <option key={room.city} value={room.city} className="bg-bg-dark-emerald">
                {room.city}
                {room.isFlagship ? ' (Flagship)' : ''}
              </option>
            ))}
            <option value="Online" className="bg-bg-dark-emerald">
              Online Delivery Only
            </option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="consult-height">
            Tree Height Interest
          </label>
          <select
            id="consult-height"
            value={form.height}
            onChange={update('height')}
            className={`${FIELD} cursor-pointer`}
          >
            {HEIGHT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-dark-emerald">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={LABEL} htmlFor="consult-notes">
          Special Requests / Notes
        </label>
        <textarea
          id="consult-notes"
          rows="3"
          placeholder="Tell us about your home layout or decor preferences..."
          value={form.notes}
          onChange={update('notes')}
          className={`${FIELD} resize-y`}
        />
      </div>

      <Button type="submit" full>
        <span>Submit Consultation Request</span>
        <ArrowRight size={18} strokeWidth={2} />
      </Button>
    </form>
  );
}
