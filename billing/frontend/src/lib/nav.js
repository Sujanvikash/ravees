import { Boxes, FileText, KeyRound, LayoutDashboard, PackagePlus, ReceiptText, ScanBarcode, Settings, Wallet } from 'lucide-react';

/**
 * What each kind of login can open. Showrooms bill and see their own figures; the admin sees all showrooms.
 * Every item sits under its `group` heading in the menu.
 */
export const NAV = {
  location: [
    { id: 'counter', label: 'Billing', Icon: ScanBarcode, group: 'Selling' },
    { id: 'quotes', label: 'Quotations', Icon: FileText, group: 'Selling' },
    { id: 'sales', label: 'Sales', Icon: ReceiptText, group: 'Selling' },
    { id: 'cash', label: 'Cash close', Icon: Wallet, group: 'Selling' },
    { id: 'inventory', label: 'Inventory', Icon: Boxes, group: 'Stock' },
    { id: 'orders', label: 'Purchase orders', Icon: PackagePlus, group: 'Stock' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, group: 'Reports' },
    { id: 'sales', label: 'Sales', Icon: ReceiptText, group: 'Reports' },
    { id: 'quotes', label: 'Quotations', Icon: FileText, group: 'Reports' },
    { id: 'cash', label: 'Cash check', Icon: Wallet, group: 'Reports' },
    { id: 'inventory', label: 'Inventory', Icon: Boxes, group: 'Stock' },
    { id: 'orders', label: 'Purchase orders', Icon: PackagePlus, group: 'Stock' },
    { id: 'logins', label: 'Logins', Icon: KeyRound, group: 'Settings' },
    { id: 'settings', label: 'Settings', Icon: Settings, group: 'Settings' },
  ],
};
