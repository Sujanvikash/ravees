import { inrWhole } from '../lib/money.js';
import SummaryStrip from './SummaryStrip.jsx';

/** The figures above the stock table: stock value first; low and out of stock marked only when there are any. */
const StockSummary = ({ totals, where, atCost, low }) => (
  <SummaryStrip
    figures={[
      { label: `Stock value · ${where}`, value: inrWhole(totals.value), note: atCost ? 'at cost price' : 'at selling price' },
      { label: 'Products in stock', value: totals.products.toLocaleString('en-IN') },
      { label: 'Units in stock', value: totals.units.toLocaleString('en-IN') },
      { label: 'Low stock', value: totals.low, note: `${low} units or fewer`, tone: totals.low ? 'warn' : undefined },
      { label: 'Out of stock', value: totals.out, note: 'season or stocked items', tone: totals.out ? 'bad' : undefined },
      { label: 'On order', value: totals.onOrder.toLocaleString('en-IN'), note: 'units on the way' },
    ]}
  />
);

export default StockSummary;
