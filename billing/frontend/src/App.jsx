import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { History, Pause, Trash2 } from 'lucide-react';
import BillTable from './components/BillTable.jsx';
import CustomerCard from './components/CustomerCard.jsx';
import DoneDialog from './components/DoneDialog.jsx';
import Header from './components/Header.jsx';
import HeldDialog from './components/HeldDialog.jsx';
import Kbd from './components/Kbd.jsx';
import PaymentDialog from './components/PaymentDialog.jsx';
import Receipt from './components/Receipt.jsx';
import ScanBar from './components/ScanBar.jsx';
import ShortcutBar from './components/ShortcutBar.jsx';
import SummaryCard from './components/SummaryCard.jsx';
import { useBill } from './hooks/useBill.js';
import { useClock } from './hooks/useClock.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { billNumber, buildBill, countLabel } from './lib/bill.js';
import { SEASON, SEASON_COUNT } from './lib/catalogue.js';
import { customerLabel } from './lib/customer.js';

const toolButton =
  'inline-flex h-10 items-center gap-2 rounded-[10px] border border-line px-3.5 text-[13px] font-semibold hover:bg-mist disabled:opacity-50';

const sameDay = (a, b) => a.toDateString() === b.toDateString();

/**
 * The billing counter. Until the billing backend exists, everything is kept in this browser's
 * localStorage: the bill in progress, held bills, the bill number sequence and completed sales.
 */
const App = () => {
  const now = useClock();
  const bill = useBill();
  const [held, setHeld] = useLocalStorage('billing-held', []);
  const [sales, setSales] = useLocalStorage('billing-sales', []);
  const [seq, setSeq] = useLocalStorage('billing-seq', 1);
  const [seasonPref, setSeasonPref] = useLocalStorage('billing-season-only', true);
  const seasonOnly = seasonPref && SEASON_COUNT > 0;

  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('cash');
  const [dialog, setDialog] = useState(null); // 'pay' | 'done' | 'held'
  const [notice, setNotice] = useState(null);
  const [lastSale, setLastSale] = useState(null);
  const [printJob, setPrintJob] = useState(0);

  const scanRef = useRef(null);
  const phoneRef = useRef(null);

  const totals = useMemo(() => buildBill(bill.items), [bill.items]);
  const billNo = billNumber(seq, now);

  // Print once the receipt for the sale is on the page.
  useEffect(() => {
    if (printJob) window.print();
  }, [printJob]);

  const today = sales.filter((s) => sameDay(new Date(s.at), now));
  const todayTotal = today.reduce((sum, s) => sum + s.totals.payable, 0);

  const addProduct = (product) => {
    const qty = (bill.items.find((it) => it.code === product.code)?.qty ?? 0) + 1;
    bill.add(product.code);
    const outOfSeason = SEASON_COUNT > 0 && !product.inSeason;
    setNotice({
      tone: outOfSeason ? 'warn' : 'ok',
      text: `Added ${product.name} · qty ${qty}${outOfSeason ? ` · not marked for Season ${SEASON}` : ''}`,
    });
  };

  const closeDialog = () => {
    setDialog(null);
    requestAnimationFrame(() => scanRef.current?.focus());
  };

  const holdCurrent = (list) =>
    bill.items.length ? [...list, { id: Date.now(), at: new Date().toISOString(), items: bill.items, phone }] : list;

  const hold = () => {
    if (!bill.items.length) return;
    setHeld(holdCurrent(held));
    bill.clear();
    setPhone('');
    setNotice({ tone: 'ok', text: 'Bill held · press F9 to recall it' });
  };

  const recall = (id) => {
    const target = held.find((h) => h.id === id);
    if (!target) return;
    setHeld(holdCurrent(held.filter((h) => h.id !== id)));
    bill.load(target.items);
    setPhone(target.phone ?? '');
    setNotice({ tone: 'ok', text: 'Held bill recalled' });
    closeDialog();
  };

  const clearBill = () => {
    bill.clear();
    setPhone('');
    setNotice(null);
    scanRef.current?.focus();
  };

  const openPay = () => totals.count && setDialog('pay');
  const openHeld = () => held.length && setDialog('held');

  const completeSale = (payment) => {
    const sale = {
      billNo,
      at: new Date().toISOString(),
      phone,
      customer: customerLabel(phone),
      lines: totals.lines.map((l) => ({ code: l.code, name: l.product.name, qty: l.qty, price: l.price, mrp: l.product.mrp })),
      totals: {
        count: totals.count,
        qty: totals.qty,
        mrpTotal: totals.mrpTotal,
        savings: totals.savings,
        taxable: totals.taxable,
        tax: totals.tax,
        gstRows: totals.gstRows,
        roundOff: totals.roundOff,
        payable: totals.payable,
      },
      payment,
    };
    setSales([...sales, sale]);
    setSeq(seq + 1);
    setLastSale(sale);
    bill.clear();
    setPhone('');
    setMethod('cash');
    setNotice(null);
    setDialog('done');
    if (payment.print) setPrintJob((n) => n + 1);
  };

  const onShortcut = useEffectEvent((e) => {
    const keys = {
      F2: () => !dialog && scanRef.current?.focus(),
      F4: () => !dialog && phoneRef.current?.focus(),
      F8: () => !dialog && hold(),
      F9: () => !dialog && openHeld(),
      F12: () => !dialog && openPay(),
      Escape: () => dialog && closeDialog(),
    };
    if (!keys[e.key]) return;
    e.preventDefault();
    keys[e.key]();
  });

  useEffect(() => {
    const handler = (e) => onShortcut(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <div className="flex min-h-screen flex-col print:hidden">
        <Header now={now} />

        <div className="flex flex-1 flex-wrap items-start gap-5 px-6 py-5">
          <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
            <ScanBar
              inputRef={scanRef}
              seasonOnly={seasonOnly}
              onSeasonOnly={setSeasonPref}
              onAdd={addProduct}
              notice={notice}
              onNotice={setNotice}
            />

            <section className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
                  <h1 className="text-lg font-bold">Current bill</h1>
                  <span className="font-mono text-[13px] text-ink-2">{billNo}</span>
                  <span className="text-[13px] text-ink-3">{countLabel(totals)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={toolButton} onClick={hold} disabled={!totals.count}>
                    <Pause size={16} /> Hold bill <Kbd>F8</Kbd>
                  </button>
                  <button type="button" className={toolButton} onClick={openHeld} disabled={!held.length}>
                    <History size={16} /> Held bills
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-raave-red-50 px-1.5 text-xs font-bold text-raave-red-ink">
                      {held.length}
                    </span>
                  </button>
                  <button type="button" className={`${toolButton} text-ruby`} onClick={clearBill} disabled={!totals.count}>
                    <Trash2 size={16} /> Clear
                  </button>
                </div>
              </div>
              <BillTable lines={totals.lines} lastCode={bill.lastCode} onQty={bill.setQty} />
            </section>
          </main>

          <aside className="flex max-w-110 flex-[1_1_360px] flex-col gap-4">
            <CustomerCard inputRef={phoneRef} phone={phone} onPhone={setPhone} />
            <SummaryCard bill={totals} method={method} onMethod={setMethod} onCollect={openPay} />
          </aside>
        </div>

        <ShortcutBar todayCount={today.length} todayTotal={todayTotal} />
      </div>

      {dialog === 'pay' && (
        <PaymentDialog
          bill={totals}
          billNo={billNo}
          method={method}
          onMethod={setMethod}
          phone={phone}
          onBack={closeDialog}
          onComplete={completeSale}
        />
      )}
      {dialog === 'held' && (
        <HeldDialog
          held={held}
          onRecall={recall}
          onDiscard={(id) => {
            const rest = held.filter((h) => h.id !== id);
            setHeld(rest);
            if (!rest.length) closeDialog();
          }}
          onClose={closeDialog}
        />
      )}
      {dialog === 'done' && lastSale && (
        <DoneDialog sale={lastSale} onReprint={() => setPrintJob((n) => n + 1)} onNewBill={closeDialog} />
      )}

      {lastSale && <Receipt sale={lastSale} />}
    </>
  );
};

export default App;
