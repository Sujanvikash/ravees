import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { History, Pause, Trash2 } from 'lucide-react';
import BillTable from '../components/BillTable.jsx';
import DoneDialog from '../components/DoneDialog.jsx';
import HeldDialog from '../components/HeldDialog.jsx';
import Kbd from '../components/Kbd.jsx';
import OrderPanel from '../components/OrderPanel.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PaymentDialog from '../components/PaymentDialog.jsx';
import Receipt from '../components/Receipt.jsx';
import ScanBar from '../components/ScanBar.jsx';
import { locationById } from '../config.js';
import { useStore } from '../context/StoreContext.jsx';
import { useBill } from '../hooks/useBill.js';
import { useClock } from '../hooks/useClock.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { billNumber, buildBill, countLabel } from '../lib/bill.js';
import { SEASON, SEASON_COUNT } from '../lib/catalogue.js';
import { customerLabel, isValidMobile, isValidName, phoneDigits } from '../lib/customer.js';
import { inrWhole } from '../lib/money.js';

const toolButton =
  'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 transition-colors enabled:hover:bg-mist enabled:hover:text-ink disabled:opacity-40';

const sameDay = (a, b) => a.toDateString() === b.toDateString();

const clock = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * One showroom's billing counter. The bill in progress, held bills and the bill-number sequence are kept
 * per showroom; completed sales and stock go through the shared store.
 */
const Counter = ({ location, onMenu }) => {
  const shop = locationById(location);
  const now = useClock();
  const bill = useBill(location);
  const { sales, recordSale, stockOf } = useStore();
  const [held, setHeld] = useLocalStorage(`billing-held-${location}`, []);
  const [seq, setSeq] = useLocalStorage(`billing-seq-${location}`, 1);
  const [seasonPref, setSeasonPref] = useLocalStorage('billing-season-only', true);
  const seasonOnly = seasonPref && SEASON_COUNT > 0;

  // The customer: mobile number and name are both required to bill (F12 / Collect checks them).
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [method, setMethod] = useState('cash');
  const [dialog, setDialog] = useState(null); // 'pay' | 'done' | 'held'
  const [notice, setNotice] = useState(null);
  const [lastSale, setLastSale] = useState(null);
  const [printJob, setPrintJob] = useState(0);

  const scanRef = useRef(null);
  const phoneRef = useRef(null);
  const nameRef = useRef(null);

  const totals = useMemo(() => buildBill(bill.items), [bill.items]);
  const billNo = billNumber(shop.billPrefix, seq, now);
  const inStock = (code) => stockOf(location, code);

  // Print once the receipt for the sale is on the page.
  useEffect(() => {
    if (printJob) window.print();
  }, [printJob]);

  const today = sales.filter((s) => s.location === location && sameDay(new Date(s.at), now));
  const todayTotal = today.reduce((sum, s) => sum + s.totals.payable, 0);

  const addProduct = (product) => {
    const qty = (bill.items.find((it) => it.code === product.code)?.qty ?? 0) + 1;
    bill.add(product.code);
    const available = inStock(product.code);
    const outOfSeason = SEASON_COUNT > 0 && !product.inSeason;
    const warning =
      qty > available
        ? ` · only ${Math.max(available, 0)} in stock at ${shop.city}`
        : outOfSeason
          ? ` · not marked for Season ${SEASON}`
          : '';
    setNotice({ tone: warning ? 'warn' : 'ok', text: `Added ${product.name} · qty ${qty}${warning}` });
  };

  const setCustomer = (next = {}) => {
    setPhone(next.phone ?? '');
    setName(next.name ?? '');
    setPhoneError('');
    setNameError('');
  };

  const closeDialog = () => {
    setDialog(null);
    requestAnimationFrame(() => scanRef.current?.focus());
  };

  const holdCurrent = (list) =>
    bill.items.length ? [...list, { id: Date.now(), at: new Date().toISOString(), items: bill.items, phone, name }] : list;

  const hold = () => {
    if (!bill.items.length) return;
    setHeld(holdCurrent(held));
    bill.clear();
    setCustomer();
    setNotice({ tone: 'ok', text: 'Bill held · press F9 to recall it' });
  };

  const recall = (id) => {
    const target = held.find((h) => h.id === id);
    if (!target) return;
    setHeld(holdCurrent(held.filter((h) => h.id !== id)));
    bill.load(target.items);
    setCustomer(target);
    setNotice({ tone: 'ok', text: 'Held bill recalled' });
    closeDialog();
  };

  const clearBill = () => {
    bill.clear();
    setCustomer();
    setNotice(null);
    scanRef.current?.focus();
  };

  const openPay = () => {
    if (!totals.count) return;
    const phoneProblem = isValidMobile(phone)
      ? ''
      : phone.trim()
        ? 'Enter a valid 10-digit mobile number'
        : 'Mobile number is required to bill';
    const nameProblem = isValidName(name) ? '' : name.trim() ? 'Enter the full name' : 'Customer name is required to bill';
    setPhoneError(phoneProblem);
    setNameError(nameProblem);
    if (phoneProblem || nameProblem) {
      (phoneProblem ? phoneRef : nameRef).current?.focus();
      return;
    }
    setDialog('pay');
  };
  const openHeld = () => held.length && setDialog('held');

  const completeSale = (payment) => {
    const sale = {
      location,
      billNo,
      at: new Date().toISOString(),
      phone: phoneDigits(phone),
      name: name.trim(),
      customer: customerLabel(phone, name),
      // Cost is captured as sold, so the admin's purchase-cost and profit figures don't change if the
      // product list's cost price is updated later.
      lines: totals.lines.map((l) => ({
        code: l.code,
        name: l.product.name,
        qty: l.qty,
        price: l.price,
        mrp: l.product.mrp,
        cost: l.product.cost ?? 0,
      })),
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
    recordSale(sale);
    setSeq(seq + 1);
    setLastSale(sale);
    bill.clear();
    setCustomer();
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
      {/* On a counter monitor (lg and up) the counter fills the window: only the bill list scrolls.
          Narrower windows stack the order panel under the bill and scroll as a normal page. */}
      <div className="flex min-h-0 flex-1 flex-col print:hidden">
        <PageHeader crumbs={[`${shop.city} · ${shop.area}`, 'Billing']} onMenu={onMenu}>
          <span className="hidden md:inline">
            Today <span className="font-medium text-ink">{inrWhole(todayTotal)}</span> · {today.length}{' '}
            {today.length === 1 ? 'bill' : 'bills'}
          </span>
          <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-2 sm:inline-flex">
            <span className="size-1.5 rounded-full bg-raave-red" aria-hidden="true" />
            Season {SEASON}
          </span>
          <time dateTime={now.toISOString()} className="hidden tabular-nums lg:inline">
            {clock.format(now).replace(' at ', ', ')}
          </time>
        </PageHeader>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section aria-label="Bill" className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 lg:p-5">
            <ScanBar
              inputRef={scanRef}
              seasonOnly={seasonOnly}
              onSeasonOnly={setSeasonPref}
              onAdd={addProduct}
              notice={notice}
              onNotice={setNotice}
              inStock={inStock}
            />

            <section className="flex min-h-72 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(9,9,11,0.04)] lg:min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-2">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h1 className="text-[15px] font-semibold tracking-tight">Current bill</h1>
                  <span className="font-mono text-xs text-ink-3">{billNo}</span>
                  {totals.count > 0 && <span className="text-xs text-ink-3">· {countLabel(totals)}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-0.5">
                  <button type="button" className={toolButton} onClick={hold} disabled={!totals.count}>
                    <Pause size={15} /> Hold <Kbd>F8</Kbd>
                  </button>
                  <button type="button" className={toolButton} onClick={openHeld} disabled={!held.length}>
                    <History size={15} /> Held
                    {held.length > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-raave-red-50 px-1.5 text-[11px] font-semibold text-raave-red-ink">
                        {held.length}
                      </span>
                    )}
                    <Kbd>F9</Kbd>
                  </button>
                  <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
                  <button type="button" className={`${toolButton} enabled:hover:bg-ruby-50! enabled:hover:text-ruby-ink!`} onClick={clearBill} disabled={!totals.count}>
                    <Trash2 size={15} /> Clear
                  </button>
                </div>
              </div>
              <BillTable lines={totals.lines} lastCode={bill.lastCode} onQty={bill.setQty} inStock={inStock} />
            </section>
          </section>

          <OrderPanel
            bill={totals}
            phone={phone}
            onPhone={(value) => {
              setPhone(value);
              setPhoneError('');
            }}
            phoneError={phoneError}
            name={name}
            onName={(value) => {
              setName(value);
              setNameError('');
            }}
            nameError={nameError}
            nameRef={nameRef}
            phoneRef={phoneRef}
            method={method}
            onMethod={setMethod}
            onCollect={openPay}
          />
        </div>
      </div>

      {dialog === 'pay' && (
        <PaymentDialog
          bill={totals}
          billNo={billNo}
          upiId={shop.upiId}
          method={method}
          onMethod={setMethod}
          phone={phone}
          name={name}
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

export default Counter;
