import { useRef, useState } from 'react';
import { Download, Eye, Upload } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';

const MAX_PDF = 2 * 1024 * 1024;
const field =
  'h-9 w-full rounded-xl border border-line bg-surface px-3 text-[13px] transition-shadow placeholder:text-ink-3 focus:border-evergreen-800/50 focus:shadow-[0_0_0_3px_rgba(23,92,38,0.10)]';
const primary =
  'inline-flex h-9 items-center gap-2 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:bg-line disabled:text-ink-3';
const secondary =
  'inline-flex h-9 items-center gap-2 rounded-xl border border-evergreen-800/25 bg-white px-3 text-[13px] font-semibold text-evergreen-900 hover:border-evergreen-800/50 hover:bg-evergreen-50 disabled:opacity-50';

/** Reads a chosen PDF as base64 (without the data: prefix). */
const readPdf = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.readAsDataURL(file);
  });

/**
 * A purchase return's e-way bill and transport, as the showroom sending the goods records them (or the admin for
 * it): the e-way bill made on the GST portal before the goods go (its number, and its PDF to view again any time), and
 * the LR number, vehicle and cartons printed on the return.
 */
const ReturnEway = ({ doc }) => {
  const { saveReturnDocuments, viewReturnDocument, downloadReturnDocument } = useStore();
  const [form, setForm] = useState(() => ({
    ewayNo: doc.ewayNo ?? '',
    lrNo: doc.lrNo ?? '',
    vehicleNo: doc.vehicleNo ?? '',
    cartons: doc.cartons == null ? '' : String(doc.cartons),
  }));
  const [pdf, setPdf] = useState(null); // { name, base64 }
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const cartons = form.cartons === '' ? null : Number(form.cartons);
  const changed =
    form.ewayNo.trim() !== (doc.ewayNo ?? '') ||
    form.lrNo.trim() !== (doc.lrNo ?? '') ||
    form.vehicleNo.trim().toUpperCase() !== (doc.vehicleNo ?? '') ||
    cartons !== (doc.cartons ?? null) ||
    Boolean(pdf);
  const recorded = doc.ewayNo || doc.hasDocument;
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const run = async (step, done) => {
    setBusy(true);
    setMessage(null);
    try {
      await step();
      if (done) setMessage({ tone: 'ok', text: done });
    } catch (err) {
      setMessage({ tone: 'warn', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const pick = async (file) => {
    if (!file) return;
    if (file.size > MAX_PDF) return setMessage({ tone: 'warn', text: 'The PDF is over 2 MB. Choose a smaller file.' });
    try {
      setPdf({ name: file.name, base64: await readPdf(file) });
      setMessage(null);
    } catch (err) {
      setMessage({ tone: 'warn', text: err.message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = () =>
    run(async () => {
      await saveReturnDocuments(doc.id, {
        ewayNo: form.ewayNo.trim(),
        lrNo: form.lrNo.trim(),
        vehicleNo: form.vehicleNo.trim(),
        cartons,
        ...(pdf ? { docName: pdf.name, docBase64: pdf.base64 } : {}),
      });
      setPdf(null);
    }, 'E-way bill and transport saved.');

  return (
    <section aria-label="E-way bill" className="flex flex-col gap-2.5 rounded-xl border border-line-soft bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[13px] font-semibold">E-way bill and transport</h4>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${recorded ? 'bg-evergreen-50 text-evergreen-900' : 'bg-warn-50 text-warn-ink'}`}>
          {recorded ? 'E-way bill recorded' : 'No e-way bill yet'}
        </span>
      </div>
      <p className="text-xs text-ink-3">
        Make the e-way bill on the GST portal (ewaybillgst.gov.in) before the goods leave, then record its number and attach its PDF here. The LR number,
        vehicle and cartons are printed on the return.
      </p>
      <div className="grid gap-2.5 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-2 sm:col-span-2">
          E-way bill number
          <input value={form.ewayNo} onChange={set('ewayNo')} placeholder="12-digit number" className={`${field} font-mono`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
          Cartons
          <input
            inputMode="numeric"
            value={form.cartons}
            onChange={(e) => setForm((f) => ({ ...f, cartons: e.target.value.replace(/\D/g, '') }))}
            placeholder="0"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
          Vehicle No.
          <input value={form.vehicleNo} onChange={set('vehicleNo')} placeholder="TN 01 AB 1234" className={`${field} uppercase`} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-2 sm:col-span-2">
          LR No.
          <input value={form.lrNo} onChange={set('lrNo')} placeholder="Lorry receipt number" className={field} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${secondary} cursor-pointer`}>
          <Upload size={15} aria-hidden="true" /> {pdf ? 'Choose another PDF' : doc.hasDocument ? 'Replace the e-way bill PDF' : 'Attach the e-way bill PDF'}
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files[0])} />
        </label>
        {pdf && <span className="text-xs text-ink-2">{pdf.name} ready to save</span>}
        {doc.hasDocument && !pdf && (
          <>
            <button type="button" onClick={() => run(() => viewReturnDocument(doc))} className={secondary}>
              <Eye size={15} aria-hidden="true" /> View e-way bill
            </button>
            <button type="button" onClick={() => run(() => downloadReturnDocument(doc))} className={secondary} title={doc.docName}>
              <Download size={15} aria-hidden="true" /> Download
            </button>
          </>
        )}
        <button type="button" onClick={save} disabled={busy || !changed} className={`${primary} ml-auto`}>
          Save
        </button>
      </div>
      {message && (
        <p
          role="status"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${message.tone === 'warn' ? 'bg-ruby-50 text-ruby-ink' : 'bg-ok-50 text-ok-ink'}`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
};

export default ReturnEway;
