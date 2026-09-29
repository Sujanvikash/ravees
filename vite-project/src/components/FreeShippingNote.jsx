import { FREE_SHIPPING_MIN_LABEL } from '../data/site.js';

export default function FreeShippingNote({ className = '' }) {
  return (
    <div className={`flex justify-between text-text-secondary ${className}`.trim()}>
      <span>Shipping</span>
      <span className="font-bold text-emerald-400">FREE over {FREE_SHIPPING_MIN_LABEL}</span>
    </div>
  );
}
