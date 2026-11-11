import { createContext, useContext, useMemo, useRef } from 'react';

const SantaContext = createContext(null);

// Imperative bridge between the page and the SantaLayer. SantaLayer registers its handlers;
// callers use them without causing re-renders.
// - hoverCard(addButtonEl) / leaveCard(): Santa walks to a product's Add button and back.
// - added(product, imageEl): an item went into the cart; returns nothing.
// - needLogin(): a signed-out add; returns true if Santa handled it (otherwise do the normal redirect).
// - celebrate(text?): a consultation request was sent or an order paid; text replaces his usual cheer.
export const SantaProvider = ({ children }) => {
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
      celebrate: (text) => handlersRef.current.celebrate?.(text),
    }),
    []
  );

  return <SantaContext.Provider value={value}>{children}</SantaContext.Provider>;
};

export const useSanta = () => {
  const ctx = useContext(SantaContext);
  if (!ctx) throw new Error('useSanta must be used within a SantaProvider');
  return ctx;
};
