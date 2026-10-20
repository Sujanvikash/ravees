import { useLocalStorage } from './useLocalStorage.js';

const EMPTY = { items: [], lastCode: null };

const reducer = (state, action) => {
  switch (action.type) {
    case 'add': {
      const exists = state.items.some((it) => it.code === action.code);
      const items = exists
        ? state.items.map((it) => (it.code === action.code ? { ...it, qty: it.qty + 1 } : it))
        : [...state.items, { code: action.code, qty: 1 }];
      return { items, lastCode: action.code };
    }
    case 'setQty':
      return {
        ...state,
        items:
          action.qty > 0
            ? state.items.map((it) => (it.code === action.code ? { ...it, qty: action.qty } : it))
            : state.items.filter((it) => it.code !== action.code),
      };
    case 'load':
      return { items: action.items, lastCode: null };
    case 'clear':
      return EMPTY;
    default:
      return state;
  }
};

/**
 * The bill being rung up at one showroom: items ({ code, qty }) and the last scanned code. It is kept in
 * localStorage under that showroom's key, so a refresh or a power cut mid-bill doesn't lose it.
 */
export const useBill = (location) => {
  const [state, setState] = useLocalStorage(`billing-current-${location}`, EMPTY);
  const dispatch = (action) => setState((prev) => reducer(prev, action));

  return {
    items: state.items,
    lastCode: state.lastCode,
    add: (code) => dispatch({ type: 'add', code }),
    setQty: (code, qty) => dispatch({ type: 'setQty', code, qty }),
    load: (items) => dispatch({ type: 'load', items }),
    clear: () => dispatch({ type: 'clear' }),
  };
};
