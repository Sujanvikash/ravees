import { useSession } from '../context/SessionContext.jsx';
import { useLocalStorage } from './useLocalStorage.js';

const EMPTY = { items: [], lastCode: null, discount: null, editing: null };

const reducer = (state, action) => {
  switch (action.type) {
    case 'add': {
      const exists = state.items.some((it) => it.code === action.code);
      const items = exists
        ? state.items.map((it) => (it.code === action.code ? { ...it, qty: it.qty + 1 } : it))
        : [...state.items, { code: action.code, qty: 1 }];
      return { ...state, items, lastCode: action.code };
    }
    case 'setQty':
      return {
        ...state,
        items:
          action.qty > 0
            ? state.items.map((it) => (it.code === action.code ? { ...it, qty: action.qty } : it))
            : state.items.filter((it) => it.code !== action.code),
      };
    // A manual whole-bill discount: { kind: 'percent' | 'amount', value } or null to take it off.
    case 'discount':
      return { ...state, discount: action.discount };
    // A manual discount on one line alone, the same shape, or null to take it off.
    case 'itemDiscount':
      return {
        ...state,
        items: state.items.map((it) => (it.code === action.code ? { ...it, discount: action.discount ?? undefined } : it)),
      };
    case 'load':
      return { items: action.items, lastCode: null, discount: action.discount ?? null, editing: null };
    // A saved bill opened to edit: its lines (with their own discounts), its discount, and what it is (editing).
    case 'edit':
      return { items: action.items, lastCode: null, discount: action.discount ?? null, editing: action.editing };
    case 'clear':
      return EMPTY;
    default:
      return state;
  }
};

/**
 * The bill being rung up at one showroom: items ({ code, qty, discount? }) and the last scanned code. It is kept in
 * localStorage under that showroom's key, so a refresh or a power cut mid-bill doesn't lose it. `kind`
 * keeps a separate list for the quotation being written ('quote'). The demo keeps its own, apart from the real ones.
 *
 * `editing` is set while a saved bill is being edited (Sales → Edit bill): { saleId, billNo, at, payable, password,
 * sold: { [code]: the line as billed } }. It is kept with the items, so a refresh mid-edit still saves over that bill
 * rather than making a new one; it clears with the bill.
 */
export const billKey = (location, kind = 'current', demo = false) => `billing-${demo ? 'demo-' : ''}${kind}-${location}`;

export const useBill = (location, kind = 'current') => {
  const demo = Boolean(useSession()?.demo);
  const [state, setState] = useLocalStorage(billKey(location, kind, demo), EMPTY);
  const dispatch = (action) => setState((prev) => reducer(prev, action));

  return {
    items: state.items,
    lastCode: state.lastCode,
    discount: state.discount ?? null, // { kind: 'percent' | 'amount', value } when a manual discount is set
    customer: state.customer ?? null, // { phone, name } when the bill came from a quotation
    editing: state.editing ?? null, // the saved bill being edited, see above
    add: (code) => dispatch({ type: 'add', code }),
    setQty: (code, qty) => dispatch({ type: 'setQty', code, qty }),
    setDiscount: (discount) => dispatch({ type: 'discount', discount }),
    setItemDiscount: (code, discount) => dispatch({ type: 'itemDiscount', code, discount }),
    load: (items, discount = null) => dispatch({ type: 'load', items, discount }),
    edit: (items, discount, editing) => dispatch({ type: 'edit', items, discount, editing }),
    clear: () => dispatch({ type: 'clear' }),
  };
};
