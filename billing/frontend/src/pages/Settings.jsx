import { useState } from 'react';
import { FlaskConical, Palette, Printer, Undo2 } from 'lucide-react';
import { Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { useStore } from '../context/StoreContext.jsx';

/** An on/off switch with its label and explanation. */
const Toggle = ({ id, Icon, title, description, on, onChange }) => (
  <div className="flex items-start gap-4 px-5 py-4">
    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
      <Icon size={17} aria-hidden="true" />
    </span>
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="text-[14px] font-semibold">
        {title}
      </label>
      <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${on ? 'brand-gradient' : 'bg-line-strong'}`}
    >
      <span className={`inline-block size-5 rounded-full bg-[#fff] shadow transition-transform ${on ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
      <span className="sr-only">{on ? 'On' : 'Off'}</span>
    </button>
  </div>
);

/** One appearance choice: a label, a hint, and its options. */
const Choice = ({ label, hint, options, value, onChange }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
    <div className="min-w-0">
      <div className="text-[13px] font-medium">{label}</div>
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
    <Segmented label={label} options={options} value={value} onChange={onChange} />
  </div>
);

/** Admin only: the app's look, and switches that change what the showrooms can do. They are kept on the server,
 * so they apply on every computer; a change that the server refuses is put back. In the demo, the demo admin can
 * also start the demo's sample data again from scratch. */
const Settings = ({ onMenu }) => {
  const { settings, setSetting: save, resetDemo } = useStore();
  const demo = Boolean(useSession()?.demo);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState('');
  const setSetting = (key, value) => {
    setError('');
    save(key, value).catch((e) => setError(`Not saved: ${e.message}`));
  };
  const reset = async () => {
    setResetting('Building a fresh month of sample data…');
    try {
      setResetting(await resetDemo());
    } catch (e) {
      setResetting(`Couldn’t reset the demo: ${e.message}`);
    }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={['Admin', 'Settings']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 p-3 lg:px-5 lg:py-4">
          <p className="text-[13px] text-ink-3">These settings are saved on the billing server and apply to every showroom and computer.</p>
          {error && (
            <p role="alert" className="text-xs font-medium text-ruby-ink">
              {error}
            </p>
          )}
          <section className="overflow-hidden rounded-2xl border glass">
            <div className="flex items-start gap-4 border-b border-line-soft px-5 py-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
                <Palette size={17} aria-hidden="true" />
              </span>
              <div>
                <div className="text-[14px] font-semibold">Appearance</div>
                <p className="mt-0.5 text-[13px] text-ink-3">The theme for every screen, including sign-in. Changes show straight away.</p>
              </div>
            </div>
            <div className="divide-y divide-line-soft">
              <Choice
                label="Theme"
                hint="Classic is the original look"
                options={[
                  { id: 'classic', label: 'Classic' },
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' },
                ]}
                value={settings.theme}
                onChange={(v) => setSetting('theme', v)}
              />
              {settings.theme === 'light' && (
                <Choice
                  label="Whiteness"
                  hint="How much of the photo shows through"
                  options={[
                    { id: 'light', label: 'Light' },
                    { id: 'lighter', label: 'Lighter' },
                    { id: 'lightest', label: 'Lightest' },
                  ]}
                  value={settings.wash}
                  onChange={(v) => setSetting('wash', v)}
                />
              )}
              {settings.theme === 'light' && (
                <Choice
                  label="Figures strip"
                  hint="Above Inventory, Sales and the Dashboard"
                  options={[
                    { id: 'green', label: 'Logo green' },
                    { id: 'white', label: 'White' },
                  ]}
                  value={settings.strip}
                  onChange={(v) => setSetting('strip', v)}
                />
              )}
              <Choice
                label="Current page in the menu"
                options={[
                  { id: 'solid', label: 'Solid green' },
                  { id: 'soft', label: 'Soft green' },
                ]}
                value={settings.nav}
                onChange={(v) => setSetting('nav', v)}
              />
              <Choice
                label="Festive effect"
                hint="Behind the screens, never over them; still if reduced motion is on"
                options={[
                  { id: 'none', label: 'None' },
                  { id: 'snow', label: 'Snowfall' },
                  { id: 'glow', label: 'Twinkle glow' },
                  { id: 'both', label: 'Both' },
                ]}
                value={settings.effect}
                onChange={(v) => setSetting('effect', v)}
              />
              {(settings.effect === 'snow' || settings.effect === 'both') && (
                <Choice
                  label="Snow amount"
                  options={[
                    { id: 'light', label: 'Light' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'heavy', label: 'Heavy' },
                    { id: 'blizzard', label: 'Blizzard' },
                  ]}
                  value={settings.snow}
                  onChange={(v) => setSetting('snow', v)}
                />
              )}
              {settings.effect !== 'none' && (
                <Choice
                  label="Show the effect"
                  hint="On sign-in the snow falls in front of the cards; inside the app it stays behind"
                  options={[
                    { id: 'everywhere', label: 'Everywhere' },
                    { id: 'signin', label: 'Sign-in only' },
                  ]}
                  value={settings.effectWhere}
                  onChange={(v) => setSetting('effectWhere', v)}
                />
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border glass">
            <Toggle
              id="setting-quote-print"
              Icon={Printer}
              title="Allow printing quotations"
              description="When on, showrooms can print a quotation for the customer (an A4 page with a large QUOTATION watermark that says it is not a bill). When off, quotations can still be written and saved, but not printed."
              on={settings.quotePrint}
              onChange={(v) => setSetting('quotePrint', v)}
            />
          </section>

          <section className="overflow-hidden rounded-2xl border glass">
            <div className="flex items-start gap-4 px-5 pt-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-evergreen-50 text-evergreen-800">
                <Undo2 size={17} aria-hidden="true" />
              </span>
              <div>
                <div className="text-[14px] font-semibold">Returns and exchanges</div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  How long after a sale the showroom can take items back against the bill. A return is refunded in cash, also
                  for bills paid by UPI or card. An exchange takes the returned value off the new bill; if the new bill is
                  smaller, the rest is refunded in cash. Each one gets a credit note.
                </p>
              </div>
            </div>
            <Choice
              label="Return window"
              options={[
                { id: 0, label: 'Off' },
                { id: 7, label: '7 days' },
                { id: 15, label: '15 days' },
                { id: 30, label: '30 days' },
              ]}
              value={settings.returnDays}
              onChange={(v) => setSetting('returnDays', v)}
            />
          </section>

          {demo && (
            <section className="flex items-start gap-4 overflow-hidden rounded-2xl border glass px-5 py-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-warn-50 text-warn-ink">
                <FlaskConical size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">Demo data</div>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  Throws away everything done in the demo and builds a fresh month of sample sales, returns, stock, orders,
                  quotations and cash closes for all five showrooms. The real data is never touched.
                </p>
                {resetting && <p className="mt-2 text-[13px] font-medium text-ink-2">{resetting}</p>}
              </div>
              <button type="button" onClick={reset} disabled={resetting.endsWith('…')} className="h-9 shrink-0 rounded-xl bg-evergreen-800 px-4 text-[13px] font-semibold text-white hover:bg-evergreen-900 disabled:opacity-60">
                Reset demo
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
