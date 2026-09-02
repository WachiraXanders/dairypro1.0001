import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ProfitLossStatement({ transactions = [], milkRecords = [], milkPrices = [] }) {
  const rows = useMemo(() => {
    const months = new Set([
      ...transactions.map((t) => t.date?.slice(0, 7)),
      ...milkRecords.map((m) => m.date?.slice(0, 7)),
    ].filter(Boolean));

    return [...months].sort().reverse().map((month) => {
      const monthMilk = milkRecords.filter((m) => m.date?.startsWith(month));
      const netLiters = monthMilk.reduce((s, m) => s + (Number(m.quantity_liters) || 0) - (Number(m.milk_used_by_calves) || 0), 0);
      const priceRecord = milkPrices.find((p) => p.month === month);
      const milkIncome = netLiters * (priceRecord?.price_per_liter || 0);

      const monthTx = transactions.filter((t) => t.date?.startsWith(month));
      const otherIncome = monthTx.filter((t) => t.type === 'Income' && t.category !== 'Milk Sales').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const expenses = monthTx.filter((t) => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

      const income = milkIncome + otherIncome;
      const profit = income - expenses;
      return { month, milkIncome, otherIncome, income, expenses, profit };
    });
  }, [transactions, milkRecords, milkPrices]);

  const totals = rows.reduce((acc, r) => ({
    income: acc.income + r.income,
    expenses: acc.expenses + r.expenses,
    profit: acc.profit + r.profit,
  }), { income: 0, expenses: 0, profit: 0 });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Profit &amp; Loss by Month</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No data yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-emerald-700">Total Income</p><p className="text-lg font-bold text-emerald-900">{totals.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
              <div className="bg-red-50 rounded-lg p-3"><p className="text-xs text-red-700">Total Expenses</p><p className="text-lg font-bold text-red-900">{totals.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
              <div className={`rounded-lg p-3 ${totals.profit >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}><p className={`text-xs ${totals.profit >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>Net Profit</p><p className={`text-lg font-bold ${totals.profit >= 0 ? 'text-blue-900' : 'text-amber-900'}`}>{totals.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
            </div>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Month</TableHead><TableHead>Milk Income</TableHead><TableHead>Other Income</TableHead><TableHead>Expenses</TableHead><TableHead>Profit</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell>{r.month}</TableCell>
                    <TableCell>{r.milkIncome.toFixed(0)}</TableCell>
                    <TableCell>{r.otherIncome.toFixed(0)}</TableCell>
                    <TableCell className="text-red-600">{r.expenses.toFixed(0)}</TableCell>
                    <TableCell className={r.profit >= 0 ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>{r.profit.toFixed(0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
