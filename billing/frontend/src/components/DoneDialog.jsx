import { Check, Printer } from 'lucide-react';
import { inr } from '../lib/money.js';
import { methodLabel } from '../lib/payment.js';
import Dialog from './Dialog.jsx';
import Kbd from './Kbd.jsx';

/** After the sale: the change to hand back, a reprint, and Enter for the next bill. */
const DoneDialog = ({ sale, onReprint, onNewBill }) => (
  <Dialog id="done" size="max-w-115">
    <div className="flex flex-col items-center gap-2.5 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-ok-50 text-ok">
        <Check size={30} strokeWidth={2.6} />
      </div>
      <h2 id="done-title" className="mt-1.5 text-[22px] font-bold">
        Sale complete
      </h2>
      <div className="text-sm text-ink-3">
        <span className="font-mono">{sale.billNo}</span> · {inr(sale.totals.payable)} · {methodLabel(sale.payment.method)}
      </div>
      {sale.payment.change > 0 && (
        <div className="mt-2.5 w-full rounded-xl bg-gold-50 p-4">
          <div className="text-[13px] font-semibold text-gold-800">Give change</div>
          <div className="font-mono text-[34px] font-semibold text-pine-950">{inr(sale.payment.change)}</div>
        </div>
      )}
      <div className="mt-3.5 grid w-full grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onReprint}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold hover:bg-mist"
        >
          <Printer size={16} /> Print receipt
        </button>
        <button
          type="button"
          autoFocus
          onClick={onNewBill}
          className="h-12 rounded-xl bg-pine-950 text-sm font-bold text-gold-300 hover:bg-pine-900"
        >
          New bill <Kbd className="text-current!">Enter</Kbd>
        </button>
      </div>
    </div>
  </Dialog>
);

export default DoneDialog;
