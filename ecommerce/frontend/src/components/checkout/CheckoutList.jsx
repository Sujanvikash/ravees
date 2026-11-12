import { Link } from 'react-router-dom';
import { FileText, Plus, Trash2 } from 'lucide-react';
import IconButton from '../IconButton.jsx';
import Price from '../Price.jsx';
import QuantityStepper from '../QuantityStepper.jsx';
import StepTitle from './StepTitle.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { cardClass } from '../cardClass.js';

/**
 * Checkout's third column: the lines with their quantities and amounts, a link back to the shop, and the
 * order summary: `summary` rows ([label, value], or [label, value, 'save'] for the discount, in green), then
 * `total` ([label, value]) in bold. `onClearAll` asks
 * before emptying the cart (the page owns the confirmation).
 */
const CheckoutList = ({ title, summary, total, note, onClearAll }) => {
  const { cart, updateQuantity, removeFromCart } = useCart();

  return (
    <aside className={`${cardClass('raised')} flex flex-col gap-5 p-6 md:p-7`}>
      <StepTitle
        n="3"
        title={title}
        action={
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-[0.85rem] text-gold-300 transition-colors hover:text-text-primary"
          >
            <Trash2 size={16} strokeWidth={1.8} />
            Clear All
          </button>
        }
      />

      <ul data-lenis-prevent className="-mr-2 flex max-h-[430px] flex-col overflow-y-auto pr-2">
        {cart.map(({ product, quantity }) => (
          <li key={product.id} className="flex items-center gap-3 border-b border-contrast/6 py-3 first:pt-0 last:border-0">
            <Link to={`/product/${product.id}`} className="size-14 shrink-0 overflow-hidden rounded-lg border border-gold-400/20 bg-bg-deepest">
              <img src={product.image} alt={product.name} className="size-full object-cover" />
            </Link>
            {/* Phones put the quantity under the name, so the name keeps the row's width. */}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[0.88rem] font-medium leading-snug text-text-primary sm:truncate">{product.name}</p>
              <Price product={product} quantity={quantity} size="sm" />
              <div className="mt-1.5 sm:hidden">
                <QuantityStepper size="sm" value={quantity} onChange={(q) => updateQuantity(product.id, q)} />
              </div>
            </div>
            <div className="hidden sm:block">
              <QuantityStepper size="sm" value={quantity} onChange={(q) => updateQuantity(product.id, q)} />
            </div>
            <IconButton label={`Remove ${product.name}`} variant="remove" onClick={() => removeFromCart(product.id)} className="p-1.5 text-gold-300">
              <Trash2 size={17} strokeWidth={1.8} />
            </IconButton>
          </li>
        ))}
      </ul>

      <Link
        to="/shop"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold-400/30 px-4 py-3 font-mono text-[0.78rem] font-bold uppercase tracking-[0.12em] text-gold-300 no-underline transition-all hover:border-gold-400 hover:bg-gold-400/10 hover:text-text-primary"
      >
        <Plus size={16} strokeWidth={2} />
        Add more products
      </Link>

      <div className="border-t border-gold-400/15 pt-5">
        <h3 className="mb-3 flex items-center gap-2.5 font-serif text-[1.05rem] font-semibold tracking-[0.04em] text-gold-200 uppercase">
          <FileText size={20} strokeWidth={1.5} className="text-gold-400" aria-hidden="true" />
          Order summary
        </h3>
        <dl className="flex flex-col">
          {/* A row marked 'save' (the discount) is in green. */}
          {summary.map(([label, value, look]) => (
            <div
              key={label}
              className={`flex justify-between gap-4 border-b border-contrast/6 py-2 text-[0.85rem] last:border-0 ${look === 'save' ? 'font-semibold text-emerald-400' : ''}`}
            >
              <dt className={look === 'save' ? '' : 'text-text-muted'}>{label}</dt>
              <dd className={`text-right ${look === 'save' ? '' : 'text-text-primary'}`}>{value}</dd>
            </div>
          ))}
        </dl>
        {total && (
          <div className="mt-1 flex justify-between gap-4 border-t border-gold-400/25 pt-3 text-[1.05rem] font-bold">
            <span className="text-text-primary">{total[0]}</span>
            <span className="font-serif text-gold-300">{total[1]}</span>
          </div>
        )}
        {note && <p className="mt-2 text-[0.76rem] leading-[1.6] text-text-muted">{note}</p>}
      </div>
    </aside>
  );
};

export default CheckoutList;
