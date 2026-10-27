import { locationById } from '../config.js';

// Sell-through bands: under a third sold reads low, two thirds and up reads high.
const band = (pct) =>
  pct >= 67
    ? { fill: 'bg-ok', text: 'text-ok-ink', label: 'Selling well' }
    : pct >= 34
      ? { fill: 'bg-warn-ink', text: 'text-warn-ink', label: 'Steady' }
      : { fill: 'bg-ruby', text: 'text-ruby-ink', label: 'Slow' };

/** Units sold and units still in stock → the sell-through percentage (0 when there is nothing either way). */
const sellThrough = (sold, inStock) => {
  const total = sold + Math.max(inStock, 0);
  return total ? Math.round((sold / total) * 100) : 0;
};

/** A horizontal battery, filled to `pct`. The figure beside it carries the value; the colour only adds the band. */
const Battery = ({ pct, fill, compact }) => (
  <span className={`relative inline-flex shrink-0 items-center ${compact ? 'h-4 w-9' : 'h-7 w-16'}`} aria-hidden="true">
    <span className={`flex h-full flex-1 rounded-[5px] border-2 border-ink-2 ${compact ? 'p-px' : 'p-[2px]'}`}>
      <span className={`block h-full rounded-[2px] transition-[width] duration-500 ${fill}`} style={{ width: `${Math.max(pct, pct ? 4 : 0)}%` }} />
    </span>
    <span className={`ml-px rounded-r-sm bg-ink-2 ${compact ? 'h-1.5 w-[3px]' : 'h-3 w-1'}`} />
  </span>
);

/**
 * How much of a showroom's stock has sold this season, as a battery: units sold out of units sold plus units
 * still in stock. "62% sold · 1,240 of 2,000 units". Props: location (id), sold and inStock (units), compact.
 */
const SellThrough = ({ location, sold, inStock, compact = false }) => {
  const shop = locationById(location);
  const stock = Math.max(inStock, 0);
  const pct = sellThrough(sold, stock);
  const b = band(pct);
  const detail = `${sold.toLocaleString('en-IN')} of ${(sold + stock).toLocaleString('en-IN')} units`;

  if (compact)
    return (
      <span className="inline-flex items-center gap-2 text-xs" title={`${pct}% sold · ${detail}`}>
        <Battery pct={pct} fill={b.fill} compact />
        <span className="font-semibold tabular-nums">{pct}%</span>
      </span>
    );

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={`${shop?.city ?? location} sell-through`}
      className="flex min-w-0 items-center gap-3 rounded-2xl border glass px-4 py-3"
    >
      <Battery pct={pct} fill={b.fill} />
      <div className="min-w-0 leading-tight">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[13px] font-semibold">{shop?.city ?? location}</span>
          <span className={`text-[11px] font-medium ${b.text}`}>{b.label}</span>
        </div>
        <div className="mt-0.5 text-[13px] tabular-nums">
          <span className="text-[17px] font-semibold">{pct}%</span> sold
        </div>
        <div className="truncate text-xs text-ink-3 tabular-nums">{detail} · season to date</div>
      </div>
    </div>
  );
};

export default SellThrough;
