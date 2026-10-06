import { createContext, useContext, useMemo, useRef } from 'react';

const SantaContext = createContext(null);

// Imperative bridge between the page and the SantaLayer. SantaLayer registers its handlers;
// callers use them without causing re-renders.
// - hoverCard(addButtonEl) / leaveCard(): Santa walks to a product's Add button and back.
// - added(product, imageEl): an item went into the cart; returns nothing.
// - needLogin(): a signed-out add; returns true if Santa handled it (otherwise do the normal redirect).
// - celebrate(): a quote request was sent.
export function SantaProvider({ children }) {
  const handlersRef = useRef({});

  const value = useMemo(
    () => ({
      register: (handlers) => {
        handlersRef.current = handlers;
        return () => {
          if (handlersRef.current === handlers) handlersRef.current = {};
        };
      },
      hoverCard: (el) => handlersRef.current.hoverCard?.(el),
      leaveCard: () => handlersRef.current.leaveCard?.(),
      added: (product, imageEl) => handlersRef.current.added?.(product, imageEl),
      needLogin: () => handlersRef.current.needLogin?.() ?? false,
      celebrate: () => handlersRef.current.celebrate?.(),
    }),
    []
  );

  return <SantaContext.Provider value={value}>{children}</SantaContext.Provider>;
}

export function useSanta() {
  const ctx = useContext(SantaContext);
  if (!ctx) throw new Error('useSanta must be used within a SantaProvider');
  return ctx;
}
