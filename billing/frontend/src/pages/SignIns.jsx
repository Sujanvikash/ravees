import { useEffect, useMemo, useState } from 'react';
import { LogIn, RefreshCw } from 'lucide-react';
import { PeriodTabs, Segmented } from '../components/Filters.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pager from '../components/Pager.jsx';
import SummaryStrip from '../components/SummaryStrip.jsx';
import { activeLocations, locationById } from '../config.js';
import { usePages } from '../hooks/usePages.js';
import { api } from '../lib/api.js';
import { periodStart } from '../lib/reports.js';

const when = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** "Chrome on Windows" from a browser's User-Agent. */
const deviceName = (ua) => {
  if (!ua) return '—';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Chrome\//.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : ua.slice(0, 40);
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
};

const loginName = (r) => (r.username === 'admin' ? 'Admin' : (locationById(r.location)?.label ?? r.username));

/** How a sign-in stands: still in, signed out, ended by a new password, or ran out after the token's hours. */
const statusOf = (r, now) => {
  if (r.ended === 'signed-out') return { key: 'out', label: 'Signed out', end: new Date(r.endedAt) };
  if (r.ended === 'password') return { key: 'password', label: 'Password changed', end: new Date(r.endedAt) };
  const expires = new Date(r.expiresAt);
  return expires > now ? { key: 'in', label: 'Signed in now', end: now } : { key: 'expired', label: 'Timed out', end: expires };
};

const PILL = {
  in: 'bg-ok-50 text-ok-ink',
  out: 'bg-mist text-ink-2',
  password: 'bg-warn-50 text-warn-ink',
  expired: 'bg-mist text-ink-3',
};

const lasted = (from, to) => {
  const minutes = Math.max(0, Math.round((to - from) / 60_000));
  if (minutes < 1) return 'under a minute';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
};

/**
 * Admin: every sign-in to the live app, newest first: which login, when it signed in and out (or timed out, or
 * was ended by a new password), how long it stayed, and from which device and internet address. Filters by login
 * and period. Closing the browser without signing out shows as timed out once the sign-in's hours run out.
 */
const SignIns = ({ onMenu }) => {
  const [login, setLogin] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [reload, setReload] = useState(0);
  // what the server last sent, and for which period and refresh: anything else on screen is still loading
  const [data, setData] = useState({ key: null, rows: [], error: '', now: new Date() });
  const key = `${period}|${reload}`;
  const state = { loading: data.key !== key, error: data.key === key ? data.error : '' };
  const { rows, now } = data;

  useEffect(() => {
    let live = true;
    const from = periodStart(period);
    api(`/sign-ins${from ? `?since=${encodeURIComponent(from.toISOString())}` : ''}`)
      .then((list) => live && setData({ key: `${period}|${reload}`, rows: list, error: '', now: new Date() }))
      .catch((err) => live && setData({ key: `${period}|${reload}`, rows: [], error: err.message, now: new Date() }));
    return () => {
      live = false;
    };
  }, [period, reload]);

  const logins = [{ id: null, label: 'All logins' }, { id: 'admin', label: 'Admin' }, ...activeLocations().map((l) => ({ id: l.id, label: l.label }))];
  const shown = useMemo(() => rows.filter((r) => !login || r.username === login).map((r) => ({ ...r, status: statusOf(r, now) })), [rows, login, now]);
  const paged = usePages(shown, 50, `${login}|${period}`);
  const count = (key) => shown.filter((r) => r.status.key === key).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader crumbs={['Settings', 'Sign-ins']} onMenu={onMenu} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 p-3 lg:px-5 lg:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented label="Login" options={logins} value={login} onChange={setLogin} />
            <PeriodTabs value={period} onChange={setPeriod} />
            <button
              type="button"
              onClick={() => setReload((n) => n + 1)}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-2 hover:bg-mist"
            >
              <RefreshCw size={14} aria-hidden="true" /> Refresh
            </button>
          </div>

          <SummaryStrip
            figures={[
              { label: 'Sign-ins', value: shown.length.toLocaleString('en-IN'), note: 'in this period' },
              { label: 'Signed in now', value: count('in').toLocaleString('en-IN') },
              { label: 'Signed out', value: count('out').toLocaleString('en-IN'), note: 'with the Sign out button' },
              { label: 'Timed out', value: count('expired').toLocaleString('en-IN'), note: 'left signed in until it ran out' },
            ]}
          />

          <section className="overflow-clip rounded-2xl border glass">
            {state.error ? (
              <p role="alert" className="px-4 py-10 text-center text-[13px] font-medium text-ruby-ink">
                {state.error}
              </p>
            ) : shown.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <LogIn size={22} className="text-ink-3" aria-hidden="true" />
                <div className="text-[15px] font-semibold">{state.loading ? 'Loading sign-ins…' : 'No sign-ins'}</div>
                {!state.loading && <div className="text-[13px] text-ink-3">Nobody signed in in this period, or choose another login.</div>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-[13px] tabular-nums">
                  <thead>
                    <tr className="border-b border-line-soft text-left text-xs text-ink-3">
                      <th scope="col" className="py-1.5 pr-3 pl-4 font-medium">Login</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Signed in</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Signed out</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">How long</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Device</th>
                      <th scope="col" className="py-1.5 pr-4 font-medium">Internet address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.rows.map((r) => {
                      const start = new Date(r.at);
                      const { key, label, end } = r.status;
                      const sameDay = end.toDateString() === start.toDateString();
                      return (
                        <tr key={r.id} className="row-hover border-b border-line-soft">
                          <td className="py-1.5 pr-3 pl-4 font-medium">{loginName(r)}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap">{when.format(start)}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap">
                            <span className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${PILL[key]}`}>{label}</span>
                            {key !== 'in' && <span className="text-ink-2">{sameDay ? time.format(end) : when.format(end)}</span>}
                          </td>
                          <td className="py-1.5 pr-3 whitespace-nowrap text-ink-2">{lasted(start, end)}</td>
                          <td className="max-w-64 truncate py-1.5 pr-3 text-ink-2" title={r.device}>
                            {deviceName(r.device)}
                          </td>
                          <td className="py-1.5 pr-4 font-mono text-xs text-ink-2">{r.address || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <Pager {...paged.pager} />
              </div>
            )}
          </section>
          <p className="text-xs text-ink-3">
            Kept from 15 Nov 2026. Closing the browser without signing out shows as “Timed out”, at the time the sign-in ran out.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIns;
