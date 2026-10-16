import { useEffect, useState } from 'react';

const matches = (query) => typeof window !== 'undefined' && window.matchMedia(query).matches;

/** True while the media query matches; follows resizes and rotation. */
export const useMediaQuery = (query) => {
  const [match, setMatch] = useState(() => matches(query));
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatch(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return match;
};
