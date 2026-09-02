import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EntityCrudPage from '@/components/EntityCrudPage';
import { entities } from '@/api';
import { isCreditVendor, isOutstandingTransaction, isOutstandingInventory } from '@/lib/vendorUtils';

const fields = [
  { key: 'name', label: 'Vendor Name', type: 'text', required: true },
  { key: 'category', label: 'Category', type: 'select', options: ['Feed Supplier', 'Medicine & Vet', 'Equipment', 'Services', 'Utilities', 'Other'], required: true },
  { key: 'contact_person', label: 'Contact Person', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'payment_terms', label: 'Payment Terms', type: 'select', options: ['Cash', 'Net 7', 'Net 14', 'Net 30', 'Net 60'], default: 'Cash' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], default: 'Active' },
  { key: 'address', label: 'Address', type: 'textarea', colSpan: 2 },
];

export default function Vendors() {
  const { data: transactions = [] } = useQuery({ queryKey: ['Transaction'], queryFn: () => entities.Transaction.list('-date', 5000) });
  const { data: inventory = [] } = useQuery({ queryKey: ['Inventory'], queryFn: () => entities.Inventory.list() });

  // Outstanding balance per vendor: unpaid credit-term expense transactions +
  // the value of inventory purchased from credit-term vendors.
  const computeOutstanding = (vendor) => {
    let total = 0;
    transactions
      .filter((t) => (t.vendor_id === vendor.id || t.vendor_name === vendor.name) && t.type === 'Expense')
      .forEach((t) => {
        if (isOutstandingTransaction(t, vendor.payment_terms)) total += Number(t.amount) || 0;
      });
    inventory
      .filter((i) => i.vendor_id === vendor.id || i.vendor_name === vendor.name)
      .forEach((i) => {
        if (isOutstandingInventory(vendor.payment_terms)) {
          total += (Number(i.total_quantity_kg) || 0) * (Number(i.cost_per_kg) || 0);
        }
      });
    return total;
  };

  const columns = [
    { key: 'name', label: 'Vendor' },
    { key: 'category', label: 'Category' },
    { key: 'contact_person', label: 'Contact' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status', render: (r) => <Badge className={r.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}>{r.status}</Badge> },
    {
      key: 'payment_terms', label: 'Terms',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span>{r.payment_terms}</span>
          {isCreditVendor(r.payment_terms) && <Badge variant="outline" className="text-xs">Credit</Badge>}
        </div>
      ),
    },
    {
      key: 'outstanding', label: 'Outstanding',
      render: (r) => {
        const amount = computeOutstanding(r);
        if (amount <= 0) return <span className="text-muted-foreground">—</span>;
        return <Badge className="bg-amber-100 text-amber-700">{amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Badge>;
      },
    },
  ];

  return (
    <EntityCrudPage
      entityName="Vendor"
      title="Vendor"
      description="Suppliers you buy feed, medicine, and services from — with computed outstanding balances."
      icon={Truck}
      columns={columns}
      fields={fields}
      searchKeys={['name', 'category', 'contact_person']}
    />
  );
}
