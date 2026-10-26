import { useSession } from '../context/SessionContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useClock } from '../hooks/useClock.js';
import { SEASON } from '../lib/catalogue.js';
import { inrWhole } from '../lib/money.js';
import { ordersNeedingAction } from '../lib/orders.js';

const sameDay = (a, b) => a.toDateString() === b.toDateString();
const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });
const date = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

const Divider = () => <span className="hidden h-7 w-px bg-ink/10 md:block" aria-hidden="true" />;

/**
 * The right side of every top bar: today's takings (this showroom's, or all showrooms' for the admin), what is
 * waiting on this login, the season, and the date and time.
 */
const HeaderStatus = () => {
  const session = useSession();
  const { sales, orders } = useStore();
  const now = useClock();
  if (!session) return null;

  const today = sales.filter((s) => (session.location ? s.location === session.location : true) && sameDay(new Date(s.at), now));
  const total = today.reduce((sum, s) => sum + s.totals.payable, 0);
  const todo = ordersNeedingAction(orders, session);
  const todoLabel = session.role === 'admin' ? `${todo} ${todo === 1 ? 'order' : 'orders'} to review` : `${todo} ${todo === 1 ? 'delivery' : 'deliveries'} to count in`;

  return (
    <>
      <div className="hidden flex-col items-end leading-tight md:flex">
        <span className="text-sm font-semibold text-ink tabular-nums">{inrWhole(total)}</span>
        <span className="text-xs text-ink-3">
          Today · {today.length} {today.length === 1 ? 'bill' : 'bills'}
        </span>
      </div>
      {todo > 0 && (
        <span className="hidden items-center gap-1.5 rounded-full bg-raave-red-50 px-2.5 py-1 text-xs font-medium text-raave-red-ink xl:inline-flex">
          <span className="size-1.5 rounded-full bg-raave-red" aria-hidden="true" />
          {todoLabel}
        </span>
      )}
      <span className="hidden items-center gap-1.5 rounded-full border border-line bg-white/60 px-2.5 py-1 text-xs font-medium text-ink-2 sm:inline-flex">
        <span className="size-1.5 rounded-full bg-evergreen-800" aria-hidden="true" />
        Season {SEASON}
      </span>
      <Divider />
      <time dateTime={now.toISOString()} className="flex flex-col items-end leading-tight">
        <span className="text-base font-semibold text-ink tabular-nums">{time.format(now)}</span>
        <span className="hidden text-xs text-ink-3 sm:block">{date.format(now)}</span>
      </time>
    </>
  );
};

export default HeaderStatus;
