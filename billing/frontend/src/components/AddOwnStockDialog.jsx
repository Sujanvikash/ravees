import { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import Dialog from './Dialog.jsx';

/**
 * Adds units of one product to stock by hand: a showroom for one of its own products (no barcode, coded
 * CHN-0001…) when more come in, or the admin for any product in its own stock (source 'manual'). It shows in the
 * inventory history as "Added by hand". A showroom's catalogue products come in through purchase orders instead.
 */
const AddOwnStockDialog = ({ product, location, source = 'own-product', onClose, onDone }) => {
  const { stockOf, importStock } = useStore();
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const now = stockOf(location, product.code);
  const units = Number(qty) || 0;

  const save = async (e) => {
    e.preventDefault();
    if (!Number.isInteger(units) || units < 1) return setError('Enter how many units came in (a whole number).');
    setBusy(true);
    try {
      await importStock({ location, file: 'Added by hand', source, lines: [{ code: product.code, qty: units, rate: product.cost }] });
      onDone(product, units);
    } catch (err) {
      setBusy(false);
      setError(err.message);
    }
  };

  return (
    <Dialog id="add-own-stock" title={`Add stock · ${product.code}`} subtitle={product.name} onClose={onClose} size="max-w-sm">
      <form onSubmit={save} className="flex flex-col gap-3 px-6 pb-6">
        <label className="text-[13px] font-medium text-ink-2" htmlFor="own-qty">
          Units that came in
        </label>
        <input
          id="own-qty"
          autoFocus
          inputMode="numeric"
          value={qty}
          onChange={(e) => {
            setQty(e.target.value.replace(/\D/g, ''));
            setError('');
          }}
          className="h-11 rounded-xl border border-line bg-white px-3 text-[15px] font-semibold tabular-nums"
        />
        <p className="text-xs text-ink-3 tabular-nums">
          In stock now: {now} · after: {now + units}
        </p>
        {error && (
          <p role="alert" className="text-xs font-medium text-ruby-ink">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || units < 1} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-evergreen-800 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3">
          <PackagePlus size={15} aria-hidden="true" /> Add to stock
        </button>
      </form>
    </Dialog>
  );
};

export default AddOwnStockDialog;
