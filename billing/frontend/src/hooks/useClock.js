import { useEffect, useState } from 'react';

/** The current time, updated every 15 seconds (enough for a clock that shows minutes). */
export const useClock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  return now;
};
