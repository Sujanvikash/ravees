import { useState } from 'react';
import { parseAmount } from '../lib/money.js';

/**
 * What is typed for one payment of `due` rupees by `method`: the cash handed over, a card approval code, or the
 * cash / UPI / card parts of a split. `valid` says whether it covers the amount; `details()` is the payment as
 * the server takes it ({ method, received, change, approval, split }). A due of 0 needs nothing typed.
 */
export const usePaymentEntry = (due, method) => {
  const [tendered, setTendered] = useState('');
  const [approval, setApproval] = useState('');
  const [parts, setParts] = useState({ cash: '', upi: '', card: '' });

  // Cash left blank means the customer gave the exact amount.
  const received = tendered.trim() ? parseAmount(tendered) : due;
  const change = received - due;
  // A split: what is typed for cash, UPI and card must come to the amount due, using at least two of them.
  const split = { cash: parseAmount(parts.cash), upi: parseAmount(parts.upi), card: parseAmount(parts.card) };
  const splitLeft = Math.round((due - split.cash - split.upi - split.card) * 100) / 100;
  const splitValid = splitLeft === 0 && Object.values(split).filter((v) => v > 0).length >= 2;
  const valid = due <= 0 || (method === 'cash' ? change >= 0 : method === 'split' ? splitValid : true);

  return {
    valid,
    details: () => ({
      method,
      received: method === 'cash' ? received : due,
      change: method === 'cash' ? change : 0,
      approval: method === 'card' || (method === 'split' && split.card > 0) ? approval.trim() : '',
      split: method === 'split' ? split : null,
    }),
    state: { tendered, setTendered, approval, setApproval, parts, setParts, change, split, splitLeft, splitValid },
  };
};
