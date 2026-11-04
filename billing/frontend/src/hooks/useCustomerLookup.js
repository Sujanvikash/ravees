import { useMemo, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import { api } from '../lib/api.js';
import { isValidMobile } from '../lib/customer.js';
import { customersFrom } from '../lib/customers.js';

const SHOW = 6; // suggestions in the dropdown
const FROM_DIGITS = 4; // digits typed before numbers are suggested

const matchesName = (customer, q) => {
  const n = customer.name.toLowerCase();
  return n.startsWith(q) || n.split(/\s+/).some((word) => word.startsWith(q));
};

/**
 * Knowing a customer again at the counter or on a quotation. The mobile number is the key: once all 10 digits are
 * in, a returning customer's name fills itself in, from this showroom's bills at once and from every showroom's
 * on the server (which only answers for an exact number). While typing, a dropdown suggests this showroom's
 * customers by the first digits of their number or by name; arrows and Enter pick one, Escape closes it.
 *
 * A name the cashier typed is never overwritten; one filled in here is replaced (or cleared) when the number
 * changes. Use changePhone / changeName as the inputs' change handlers, keyDown first in their onKeyDown (it
 * returns true when it used the key), and inputProps(field, listId) on each input.
 *
 * status: { kind: 'returning', name, bills, last } | { kind: 'new' } | null (no full number yet, or still asking).
 */
export const useCustomerLookup = ({ phone, name, setPhone, setName }) => {
  const { sales, returns } = useStore();
  const known = useMemo(
    () => customersFrom(sales, returns).sort((a, b) => (a.last < b.last ? 1 : -1)),
    [sales, returns],
  );
  const [remote, setRemote] = useState({}); // { [mobile]: customer | null }, the server's answers
  const [filled, setFilled] = useState(''); // the name filled in here, which a new number may replace
  const [field, setField] = useState(null); // the input with focus: 'phone' | 'name'
  const [active, setActive] = useState(0);
  const [hidden, setHidden] = useState(false);
  const asked = useRef(''); // the number last looked up, so a late answer for an old number is ignored

  const local = (digits) => known.find((c) => c.phone === digits);

  const fill = (customer) => {
    const next = customer?.name ?? '';
    setName((current) => (!current.trim() || current === filled ? next : current));
    setFilled(next);
  };

  const ask = (digits, fillName) => {
    if (digits in remote) {
      if (fillName) fill(remote[digits]);
      return;
    }
    api('/sales/customer', { method: 'POST', body: { phone: digits } })
      .then((customer) => {
        setRemote((r) => ({ ...r, [digits]: customer }));
        if (fillName && asked.current === digits) fill(customer);
      })
      .catch(() => {}); // offline or refused: the name is typed by hand, as before
  };

  const changePhone = (value) => {
    setPhone(value);
    setHidden(false);
    setActive(0);
    asked.current = value;
    if (!isValidMobile(value)) {
      if (filled) {
        setName((current) => (current === filled ? '' : current));
        setFilled('');
      }
      return;
    }
    const here = local(value);
    if (here) fill(here);
    ask(value, !here); // the server also counts their bills at other showrooms
  };

  const changeName = (value) => {
    setName(value);
    setHidden(false);
    setActive(0);
  };

  const pick = (customer) => {
    setPhone(customer.phone);
    setName(customer.name);
    setFilled(customer.name);
    setHidden(true);
    asked.current = customer.phone;
    ask(customer.phone, false);
  };

  const digits = phone.replace(/\D/g, '');
  const full = isValidMobile(phone) ? digits.slice(-10) : '';
  const found = full ? (remote[full] ?? local(full) ?? (full in remote ? null : undefined)) : undefined;
  const status = found ? { kind: 'returning', ...found } : found === null ? { kind: 'new' } : null;

  const q = name.trim().toLowerCase();
  const lists = {
    phone: digits.length >= FROM_DIGITS && digits.length < 10 ? known.filter((c) => c.phone.startsWith(digits)).slice(0, SHOW) : [],
    // a full number already says who it is, so names are only suggested before one is typed
    name: q.length >= 2 && !full && name !== filled ? known.filter((c) => c.name && matchesName(c, q)).slice(0, SHOW) : [],
  };
  const items = field ? lists[field] : [];
  const open = !hidden && items.length > 0;
  const at = Math.min(active, items.length - 1);

  const keyDown = (e) => {
    if (!open) return false;
    if (e.key === 'ArrowDown') setActive((at + 1) % items.length);
    else if (e.key === 'ArrowUp') setActive((at - 1 + items.length) % items.length);
    else if (e.key === 'Enter') pick(items[at]);
    else if (e.key === 'Escape') setHidden(true);
    else return false;
    e.preventDefault();
    e.stopPropagation();
    return true;
  };

  const inputProps = (which, listId) => {
    const shown = open && field === which;
    return {
      onFocus: () => {
        setField(which);
        setActive(0);
      },
      onBlur: () => setField((f) => (f === which ? null : f)),
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': shown,
      'aria-controls': listId,
      'aria-activedescendant': shown ? `${listId}-${at}` : undefined,
    };
  };

  return { status, changePhone, changeName, keyDown, inputProps, field, items: open ? items : [], at, pick, setActive };
};
