import { Phone } from 'lucide-react';
import { phoneDigits } from '../lib/customer.js';
import Kbd from './Kbd.jsx';

/** Optional customer mobile number, for WhatsApp receipts and, later, the customer's history. */
const CustomerCard = ({ inputRef, phone, onPhone }) => (
  <section className="rounded-xl border border-line bg-surface p-3">
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <h2 className="text-sm font-bold">Customer</h2>
      <span className="truncate text-[11px] text-ink-3">
        {phoneDigits(phone).length === 10 ? 'Saved with this bill' : 'Walk-in · optional'} <Kbd>F4</Kbd>
      </span>
    </div>
    <label
      htmlFor="customer-phone"
      className="flex h-10 cursor-text items-center gap-2 rounded-lg border border-line-strong px-3 focus-within:border-evergreen-800"
    >
      <Phone size={16} className="text-ink-2" aria-hidden="true" />
      <span className="sr-only">Customer mobile number</span>
      <input
        id="customer-phone"
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        value={phone}
        onChange={(e) => onPhone(e.target.value)}
        placeholder="Mobile number, for a WhatsApp receipt"
        className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-ink-3"
      />
    </label>
  </section>
);

export default CustomerCard;
