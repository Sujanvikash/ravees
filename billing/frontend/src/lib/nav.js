import { Boxes, Package, FileText, HandCoins, LayoutDashboard, PackagePlus, ReceiptText, ScanBarcode, Settings, Store, Undo2, Users, Wallet } from 'lucide-react';

/**
 * What each kind of login can open. Showrooms bill and see their own figures; the admin sees all showrooms.
 * Every item sits under its `group` heading in the menu.
 */
export const NAV = {
  location: [
    { id: 'counter', label: 'Billing', Icon: ScanBarcode, group: 'Selling' },
    { id: 'quotes', label: 'Quotations', Icon: FileText, group: 'Selling' },
    { id: 'sales', label: 'Sales', Icon: ReceiptText, group: 'Selling' },
    { id: 'credit', label: 'Credit bills', Icon: HandCoins, group: 'Selling' },
    { id: 'cash', label: 'Cash close', Icon: Wallet, group: 'Selling' },
    { id: 'inventory', label: 'Inventory', Icon: Boxes, group: 'Stock' },
    { id: 'orders', label: 'Purchase orders', Icon: PackagePlus, group: 'Stock' },
    { id: 'boxes', label: 'Boxes', Icon: Package, group: 'Stock' },
    { id: 'returns', label: 'Purchase returns', Icon: Undo2, group: 'Stock' },
    { id: 'customers', label: 'Customers', Icon: Users, group: 'CRM' },
    { id: 'settings', label: 'Settings', Icon: Settings, group: 'This screen' },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, group: 'Reports' },
    { id: 'sales', label: 'Sales', Icon: ReceiptText, group: 'Reports' },
    { id: 'credit', label: 'Credit bills', Icon: HandCoins, group: 'Reports' },
    { id: 'quotes', label: 'Quotations', Icon: FileText, group: 'Selling' },
    { id: 'cash', label: 'Cash check', Icon: Wallet, group: 'Selling' },
    { id: 'inventory', label: 'Inventory', Icon: Boxes, group: 'Stock' },
    { id: 'orders', label: 'Purchase orders', Icon: PackagePlus, group: 'Stock' },
    { id: 'boxes', label: 'Boxes', Icon: Package, group: 'Stock' },
    { id: 'returns', label: 'Purchase returns', Icon: Undo2, group: 'Stock' },
    { id: 'customers', label: 'Customers', Icon: Users, group: 'CRM' },
    { id: 'stores', label: 'Stores', Icon: Store, group: 'Settings' },
    { id: 'settings', label: 'Settings', Icon: Settings, group: 'Settings' },
  ],
};
