import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, TrendingDown, Scale, Plus, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import EntityCrudPage from '@/components/EntityCrudPage';
import { useCategories } from '@/hooks/useCategories';
import { entities } from '@/api';
import MilkPriceDialog from '@/components/milk/MilkPriceDialog';
import { isOutstandingTransaction } from '@/lib/vendorUtils';
import AutoTransactionSync from '@/components/finance/AutoTransactionSync';
import CategoryBreakdown from '@/components/finance/CategoryBreakdown';
import ProfitLossStatement from '@/components/finance/ProfitLossStatement';
import CashFlowReport from '@/components/finance/CashFlowReport';
import FinancialForecast from '@/components/finance/FinancialForecast';
import PageHeader from '@/components/shared/PageHeader';
import KpiCard from '@/components/shared/KpiCard';
import StatusBadge from '@/components/shared/StatusBadge';

/**
 * Milk sales income is recomputed from milk records × the month's price rather
 * than trusted from raw `Transaction` rows — mirrors the original app's design
 * so changing a milk price retroactively updates the summary, and so the
 * auto-created "Milk Sales" transactions (see MilkProduction.jsx) are never
 * double-counted alongside this calculation.
 */
function useFinanceSummary(transactions, milkRecords, milkPrices) {
  return useMemo(() => {
    const months = [...new Set(milkRecords.map((m) => m.date?.slice(0, 7)).filter(Boolean))];
    let milkSalesIncome = 0;
    months.forEach((month) => {
      const monthMilk = milkRecords.filter((m) => m.date?.startsWith(month));
      const netLiters = monthMilk.reduce((s, m) => s + (Number(m.quantity_liters) || 0) - (Number(m.milk_used_by_calves) || 0), 0);
      const priceRecord = milkPrices.find((p) => p.month === month);
      milkSalesIncome += netLiters * (priceRecord?.price_per_liter || 0);
    });

    const otherIncome = transactions.filter((t) => t.type === 'Income' && t.category !== 'Milk Sales').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expenses = transactions.filter((t) => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const income = milkSalesIncome + otherIncome;
    return { income, expenses, profit: income - expenses, milkSalesIncome, otherIncome };
  }, [transactions, milkRecords, milkPrices]);
}

function TransactionsTab() {
  const incomeCategories = useCategories('finance_income');
  const expenseCategories = useCategories('finance_expense');
  const allCategories = [...new Set([...incomeCategories, ...expenseCategories])];
  const { data: vendors = [] } = useQuery({ queryKey: ['Vendor'], queryFn: () => entities.Vendor.list() });
  const vendorByName = Object.fromEntries(vendors.map((v) => [v.name, v]));

  const { data: transactions = [] } = useQuery({ queryKey: ['Transaction'], queryFn: () => entities.Transaction.list('-date', 5000) });
  const { data: milkRecords = [] } = useQuery({ queryKey: ['MilkProduction'], queryFn: () => entities.MilkProduction.list('-date', 5000) });
  const { data: milkPrices = [] } = useQuery({ queryKey: ['MilkPrice'], queryFn: () => entities.MilkPrice.list() });
  const summary = useFinanceSummary(transactions, milkRecords, milkPrices);

  const fields = [
    { key: 'type', label: 'Type', type: 'select', options: ['Income', 'Expense'], required: true },
    { key: 'category', label: 'Category', type: 'select', options: allCategories, required: true },
    { key: 'amount', label: 'Amount', type: 'number', required: true },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'payment_method', label: 'Payment Method', type: 'select', options: ['Cash', 'Bank Transfer', 'Check', 'Mobile Money', 'Other'] },
    { key: 'vendor_name', label: 'Vendor', type: 'text' },
    { key: 'reference', label: 'Reference #', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
  ];

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type', render: (r) => <StatusBadge value={r.type} /> },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    {
      key: 'vendor_name', label: 'Vendor',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span>{r.vendor_name || '—'}</span>
          {r.vendor_name && isOutstandingTransaction(r, vendorByName[r.vendor_name]?.payment_terms) && (
            <StatusBadge value="Outstanding" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total Income" value={summary.income.toLocaleString(undefined, { maximumFractionDigits: 0 })} icon={TrendingUp} tone="emerald" />
        <KpiCard label="Total Expenses" value={summary.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })} icon={TrendingDown} tone="rose" />
        <KpiCard label="Net" value={summary.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })} icon={Scale} tone="blue" />
      </div>
      <p className="text-xs text-muted-foreground">
        Income includes {summary.milkSalesIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })} in milk
        sales (calculated from milk records × monthly price) plus {summary.otherIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })} in other income.
      </p>
      <EntityCrudPage
        entityName="Transaction"
        title="Transaction"
        description="Income and expenses across the farm."
        icon={Wallet}
        columns={columns}
        fields={fields}
        searchKeys={['category', 'vendor_name', 'description']}
      />
    </div>
  );
}

function CategoryReportsTab() {
  const { data: transactions = [] } = useQuery({ queryKey: ['Transaction'], queryFn: () => entities.Transaction.list('-date', 5000) });
  return (
    <div className="space-y-6">
      <AutoTransactionSync />
      <CategoryBreakdown transactions={transactions} />
    </div>
  );
}

function ProfitLossTab() {
  const { data: transactions = [] } = useQuery({ queryKey: ['Transaction'], queryFn: () => entities.Transaction.list('-date', 5000) });
  const { data: milkRecords = [] } = useQuery({ queryKey: ['MilkProduction'], queryFn: () => entities.MilkProduction.list('-date', 5000) });
  const { data: milkPrices = [] } = useQuery({ queryKey: ['MilkPrice'], queryFn: () => entities.MilkPrice.list() });
  return <ProfitLossStatement transactions={transactions} milkRecords={milkRecords} milkPrices={milkPrices} />;
}

function CashFlowTab() {
  const { data: transactions = [] } = useQuery({ queryKey: ['Transaction'], queryFn: () => entities.Transaction.list('-date', 5000) });
  return <CashFlowReport transactions={transactions} />;
}

function ForecastTab() {
  const { data: transactions = [] } = useQuery({ queryKey: ['Transaction'], queryFn: () => entities.Transaction.list('-date', 5000) });
  const { data: milkRecords = [] } = useQuery({ queryKey: ['MilkProduction'], queryFn: () => entities.MilkProduction.list('-date', 5000) });
  const { data: milkPrices = [] } = useQuery({ queryKey: ['MilkPrice'], queryFn: () => entities.MilkPrice.list() });
  const { data: cattle = [] } = useQuery({ queryKey: ['Cattle'], queryFn: () => entities.Cattle.list() });
  return <FinancialForecast transactions={transactions} milkRecords={milkRecords} milkPrices={milkPrices} cattle={cattle} />;
}

function MilkPricesTab() {
  const [open, setOpen] = useState(false);
  const { data: prices = [] } = useQuery({ queryKey: ['MilkPrice'], queryFn: () => entities.MilkPrice.list('-month', 24) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Monthly Milk Prices</h3>
          <p className="text-sm text-muted-foreground">Used to calculate milk sales income and for financial forecasting.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Set Price</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {prices.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{p.month}</p>
            <p className="text-lg font-semibold text-gold">{p.price_per_liter}</p>
          </div>
        ))}
        {prices.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No prices set yet.</p>}
      </div>
      <MilkPriceDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export default function Finance() {
  return (
    <div className="space-y-5">
      <PageHeader title="Finance" icon={Wallet} />
      <Tabs defaultValue="transactions">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="category_reports">Category Reports</TabsTrigger>
          <TabsTrigger value="pnl">P&amp;L Statement</TabsTrigger>
          <TabsTrigger value="cash_flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="forecast"><Sparkles className="w-3.5 h-3.5 mr-1" />Forecast</TabsTrigger>
          <TabsTrigger value="milk_prices">Milk Prices</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions" className="pt-4"><TransactionsTab /></TabsContent>
        <TabsContent value="category_reports" className="pt-4"><CategoryReportsTab /></TabsContent>
        <TabsContent value="pnl" className="pt-4"><ProfitLossTab /></TabsContent>
        <TabsContent value="cash_flow" className="pt-4"><CashFlowTab /></TabsContent>
        <TabsContent value="forecast" className="pt-4"><ForecastTab /></TabsContent>
        <TabsContent value="milk_prices" className="pt-4"><MilkPricesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
