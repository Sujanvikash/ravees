import { createContext, useContext, useMemo, useRef } from 'react';

const SantaContext = createContext(null);

// Imperative bridge between product cards and the SantaLayer. SantaLayer registers
// its handlers; cards call them without causing re-renders.
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
      flyToBag: (imgEl) => handlersRef.current.flyToBag?.(imgEl),
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
