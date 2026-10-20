import { Banknote, CreditCard, QrCode, Split } from 'lucide-react';

export const METHODS = [
  { id: 'cash', label: 'Cash', Icon: Banknote },
  { id: 'upi', label: 'UPI', Icon: QrCode },
  { id: 'card', label: 'Card', Icon: CreditCard },
  { id: 'split', label: 'Split', Icon: Split },
];

export const methodLabel = (id) => METHODS.find((m) => m.id === id)?.label ?? id;
