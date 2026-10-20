import { Check, Printer } from 'lucide-react';
import { inr } from '../lib/money.js';
import { methodLabel } from '../lib/payment.js';
import Dialog from './Dialog.jsx';
import Kbd from './Kbd.jsx';

/** After the sale: the change to hand back, a reprint, and Enter for the next bill. */
const DoneDialog = ({ sale, onReprint, onNewBill }) => (
  <Dialog id="done" size="max-w-sm">
    <div className="flex flex-col items-center px-6 pt-7 pb-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-evergreen-800 text-white shadow-[0_0_0_6px_var(--color-evergreen-50)]">
        <Check size={24} strokeWidth={2.6} />
      </div>
      <h2 id="done-title" className="mt-4 text-lg font-semibold tracking-tight">
        Sale complete
      </h2>
      <div className="mt-0.5 text-[13px] text-ink-3 tabular-nums">
        {inr(sale.totals.payable)} · {methodLabel(sale.payment.method)} · <span className="font-mono text-xs">{sale.billNo}</span>
      </div>

      {sale.payment.change > 0 && (
        <div className="mt-5 w-full rounded-2xl bg-evergreen-50 px-4 py-3.5">
          <div className="text-[13px] font-medium text-evergreen-900">Give change</div>
          <div className="text-[34px] leading-tight font-semibold tracking-tight text-evergreen-900 tabular-nums">
            {inr(sale.payment.change)}
          </div>
        </div>
      )}

      <div className="mt-5 grid w-full grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onReprint}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line text-[13px] font-medium text-ink-2 hover:bg-mist hover:text-ink"
        >
          <Printer size={15} /> Print receipt
        </button>
        <button
          type="button"
          autoFocus
          onClick={onNewBill}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-evergreen-800 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(9,9,11,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-evergreen-900"
        >
          New bill <Kbd tone="dark">Enter</Kbd>
        </button>
      </div>
    </div>
  </Dialog>
);

export default DoneDialog;
