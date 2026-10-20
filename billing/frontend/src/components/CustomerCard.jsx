import { Phone } from 'lucide-react';
import { phoneDigits } from '../lib/customer.js';
import Kbd from './Kbd.jsx';

/** Optional customer mobile number, for WhatsApp receipts and, later, the customer's history. */
const CustomerCard = ({ inputRef, phone, onPhone }) => (
  <section className="rounded-2xl border border-line bg-surface px-5 py-4.5">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[15px] font-bold">Customer</h2>
      <Kbd>F4</Kbd>
    </div>
    <label
      htmlFor="customer-phone"
      className="flex h-11.5 cursor-text items-center gap-2.5 rounded-[10px] border border-line-strong px-3.5 focus-within:border-pine-700"
    >
      <Phone size={18} className="text-ink-2" aria-hidden="true" />
      <span className="sr-only">Customer mobile number</span>
      <input
        id="customer-phone"
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        value={phone}
        onChange={(e) => onPhone(e.target.value)}
        placeholder="Mobile number (optional)"
        className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-ink-3"
      />
    </label>
    <div className="mt-2.5 text-[13px] text-ink-3">
      {phoneDigits(phone).length === 10
        ? 'Saved with this bill'
        : 'Walk-in customer · add a number for a WhatsApp receipt'}
    </div>
  </section>
);

export default CustomerCard;
