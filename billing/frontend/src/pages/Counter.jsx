import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { FileText, History, Pause, Repeat, Trash2, Undo2, X } from 'lucide-react';
import BillTable from '../components/BillTable.jsx';
import CreditNotePrint from '../components/CreditNotePrint.jsx';
import Dialog from '../components/Dialog.jsx';
import DoneDialog from '../components/DoneDialog.jsx';
import HeldDialog from '../components/HeldDialog.jsx';
import Kbd from '../components/Kbd.jsx';
import OrderPanel from '../components/OrderPanel.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PaymentDialog from '../components/PaymentDialog.jsx';
import QuotePickerDialog from '../components/QuotePickerDialog.jsx';
import Receipt from '../components/Receipt.jsx';
import ReturnDialog from '../components/ReturnDialog.jsx';
import ScanBar from '../components/ScanBar.jsx';
import { locationById } from '../config.js';
import { useSession } from '../context/SessionContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useBill } from '../hooks/useBill.js';
import { useClock } from '../hooks/useClock.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { billNumber, buildBill, countLabel, nextSeq } from '../lib/bill.js';
import { SEASON, seasonCount } from '../lib/catalogue.js';
import { isValidMobile, isValidName, phoneDigits } from '../lib/customer.js';
import { inr } from '../lib/money.js';
import { newId } from '../lib/uid.js';

const toolButton =
  'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 transition-colors enabled:hover:bg-mist enabled:hover:text-ink disabled:opacity-40';



/**
 * One showroom's billing counter. The bill in progress and held bills are kept in this browser per showroom;
 * a completed bill goes to the server, which gives it its number and takes it off stock. The number shown while
 * billing is the next one the server will most likely give.
 *
 * Returns and exchanges start here too (Return / exchange): a refund is paid out in cash straight away; an
 * exchange puts the returned value on this bill as a credit, and is saved with it when the bill is paid.
 */
const Counter = ({ location, onMenu }) => {
  const shop = locationById(location);
  const now = useClock();
  const session = useSession();
  const bill = useBill(location);
  const { recordSale, recordReturn, findBill, stockOf, sales, quotes } = useStore();
  const [held, setHeld] = useLocalStorage(`billing-held-${session?.demo ? 'demo-' : ''}${location}`, []);
  const [exchange, setExchange] = useState(null); // items coming back: { saleId, lines, reason, value, bill }
  const [refunded, setRefunded] = useState(null); // the credit note of a cash refund, for its dialog
  const [printDoc, setPrintDoc] = useState(null); // what prints: { sale } or { note }
  const [busy, setBusy] = useState(false);
  // ids for the bill being paid, so a retry after a dropped connection saves it once; new for every new bill
  const ids = useRef({ sale: newId(), ret: newId() });

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
  const billNo = billNumber(shop.billPrefix, nextSeq(sales, shop.billPrefix, now), now);
  const credit = exchange ? Math.min(exchange.value, totals.payable) : 0;
  const due = totals.payable - credit;
  useEffect(() => {
    ids.current = { sale: newId(), ret: newId() };
  }, [bill.items, exchange]);
  const inStock = (code) => stockOf(location, code);

  // Print once the receipt for the sale is on the page.
  useEffect(() => {
    if (printJob) window.print();
  }, [printJob]);


  const addProduct = (product) => {
    const qty = (bill.items.find((it) => it.code === product.code)?.qty ?? 0) + 1;
    bill.add(product.code);
    const available = inStock(product.code);
    const outOfSeason = seasonCount() > 0 && !product.inSeason;
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
    setExchange(null);
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
    if (exchange && due <= 0) return completeSale({ method: 'upi', print: true }); // the credit covers it all
    setDialog('pay');
  };
  const openHeld = () => held.length && setDialog('held');

  const completeSale = async (payment) => {
    if (busy) return;
    setBusy(true);
    const lines = totals.lines.map((l) => ({ code: l.code, qty: l.qty }));
    let sale;
    let note = null;
    try {
      if (exchange) {
        const { saleId, lines: back, reason } = exchange;
        const result = await recordReturn({ id: ids.current.ret, saleId, lines: back, reason, exchange: { id: ids.current.sale, lines, payment } });
        sale = result.sale;
        note = result.creditNote;
      } else {
        sale = await recordSale({ id: ids.current.sale, lines, phone: phoneDigits(phone), name: name.trim(), payment });
      }
    } catch (err) {
      setBusy(false);
      setDialog(null);
      setNotice({ tone: 'warn', text: `Not saved: ${err.message} The bill is still here; collect again when ready.` });
      return;
    }
    setBusy(false);
    setLastSale({ ...sale, refund: note?.refund ?? 0 });
    bill.clear();
    setCustomer();
    setExchange(null);
    setMethod('cash');
    setNotice(null);
    setDialog('done');
    setPrintDoc({ sale });
    if (payment.print) setPrintJob((n) => n + 1);
  };

  const refund = async (body) => {
    const { creditNote } = await recordReturn({ id: newId(), ...body });
    setRefunded(creditNote);
    setPrintDoc({ note: creditNote });
    setDialog('refunded');
  };

  const startExchange = (back) => {
    setExchange(back);
    setCustomer({ phone: back.bill.phone, name: back.bill.name });
    setNotice({ tone: 'ok', text: `${inr(back.value)} credit from ${back.bill.billNo}. Scan what the customer takes instead.` });
    closeDialog();
  };

  const loadQuote = (quote) => {
    if (bill.items.length) {
      setNotice({ tone: 'warn', text: 'Finish, hold or clear the bill in progress first, then load the quotation.' });
      return closeDialog();
    }
    bill.load(quote.lines.map((l) => ({ code: l.code, qty: l.qty })));
    setCustomer({ phone: quote.phone, name: quote.name });
    setNotice({ tone: 'ok', text: `${quote.quoteNo} loaded for ${quote.name}, at today’s prices.` });
    closeDialog();
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
        <PageHeader crumbs={[`${shop.city} · ${shop.area}`, 'Billing']} onMenu={onMenu} />

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section aria-label="Bill" className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3 lg:p-4">
            <ScanBar
              inputRef={scanRef}
              onAdd={addProduct}
              notice={notice}
              onNotice={setNotice}
              inStock={inStock}
            />

            <section className="flex min-h-72 flex-1 flex-col overflow-hidden rounded-2xl border glass lg:min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-2">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h1 className="text-[15px] font-semibold tracking-tight">Current bill</h1>
                  <span className="font-mono text-xs text-ink-3">{billNo}</span>
                  {totals.count > 0 && <span className="text-xs text-ink-3">· {countLabel(totals)}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-0.5">
                  <button type="button" className={toolButton} onClick={() => setDialog('quote')} disabled={!quotes.some((q) => q.location === location)}>
                    <FileText size={15} /> Quotation
                  </button>
                  <button type="button" className={toolButton} onClick={() => setDialog('return')} disabled={Boolean(exchange)}>
                    <Undo2 size={15} /> Return / exchange
                  </button>
                  <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
                  <button type="button" className={toolButton} onClick={hold} disabled={!totals.count || Boolean(exchange)}>
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
              {exchange && (
                <div className="mx-5 mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-evergreen-50 px-3.5 py-2 text-[13px] text-evergreen-900">
                  <Repeat size={15} aria-hidden="true" />
                  <span>
                    <span className="font-semibold">Exchange:</span> {inr(exchange.value)} credit for{' '}
                    {exchange.lines.reduce((n, l) => n + l.qty, 0)} item(s) back on <span className="font-mono text-xs">{exchange.bill.billNo}</span>
                    {totals.count > 0 && <> · {due > 0 ? `customer pays ${inr(due)}` : `refund ${inr(exchange.value - totals.payable)} in cash`}</>}
                  </span>
                  <button type="button" onClick={() => setExchange(null)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium hover:bg-white/70">
                    <X size={13} aria-hidden="true" /> Cancel exchange
                  </button>
                </div>
              )}
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
          bill={exchange ? { ...totals, payable: due } : totals}
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
        <DoneDialog
          sale={lastSale}
          refund={lastSale.refund}
          onReprint={() => {
            setPrintDoc({ sale: lastSale });
            setPrintJob((n) => n + 1);
          }}
          onNewBill={closeDialog}
        />
      )}
      {dialog === 'quote' && <QuotePickerDialog quotes={quotes} location={location} onPick={loadQuote} onClose={closeDialog} />}
      {dialog === 'return' && (
        <ReturnDialog location={location} sales={sales} findBill={findBill} onRefund={refund} onExchange={startExchange} onClose={closeDialog} />
      )}
      {dialog === 'refunded' && refunded && (
        <Dialog id="refunded" title="Refund in cash" subtitle={`${refunded.returnNo} · against ${refunded.billNo}`} onClose={closeDialog} size="max-w-sm">
          <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="rounded-2xl bg-evergreen-50 px-4 py-3.5 text-center">
              <div className="text-[13px] font-medium text-evergreen-900">Give back</div>
              <div className="text-[34px] leading-tight font-semibold tracking-tight text-evergreen-900 tabular-nums">{inr(refunded.refund)}</div>
              <div className="text-xs text-evergreen-900/80">in cash · the items are back in stock</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPrintDoc({ note: refunded });
                  setPrintJob((n) => n + 1);
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-line text-[13px] font-medium text-ink-2 hover:bg-mist"
              >
                Print credit note
              </button>
              <button type="button" autoFocus onClick={closeDialog} className="inline-flex h-10 items-center justify-center rounded-xl bg-evergreen-800 text-[13px] font-semibold text-white hover:bg-evergreen-900">
                Done
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {printDoc?.sale && <Receipt sale={printDoc.sale} />}
      {printDoc?.note && <CreditNotePrint note={printDoc.note} />}
    </>
  );
};

export default Counter;
