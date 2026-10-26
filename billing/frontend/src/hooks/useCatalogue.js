import { useSyncExternalStore } from 'react';
import { productsSnapshot, subscribeCatalogue } from '../lib/catalogue.js';

/** The product list, including showrooms' own products; a new array whenever one is added. */
export const useCatalogue = () => useSyncExternalStore(subscribeCatalogue, productsSnapshot);
