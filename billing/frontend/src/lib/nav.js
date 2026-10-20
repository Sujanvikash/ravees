import { Boxes, LayoutDashboard, PackagePlus, ReceiptText, ScanBarcode } from 'lucide-react';

/** What each kind of login can open. Showrooms bill and see their own figures; the admin sees all showrooms. */
export const NAV = {
  location: [
    { id: 'counter', label: 'Billing', Icon: ScanBarcode },
    { id: 'sales', label: 'Sales', Icon: ReceiptText },
    { id: 'inventory', label: 'Inventory', Icon: Boxes },
    { id: 'orders', label: 'Purchase orders', Icon: PackagePlus },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'sales', label: 'Sales', Icon: ReceiptText },
    { id: 'inventory', label: 'Inventory', Icon: Boxes },
    { id: 'orders', label: 'Purchase orders', Icon: PackagePlus },
  ],
};
