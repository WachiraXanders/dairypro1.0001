import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899'];

function groupByCategory(transactions, type) {
  const groups = {};
  transactions.filter((t) => t.type === type).forEach((t) => {
    groups[t.category] = (groups[t.category] || 0) + (Number(t.amount) || 0);
  });
  return Object.entries(groups).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
}

function BreakdownPie({ title, data }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No data yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CategoryBreakdown({ transactions = [] }) {
  const income = useMemo(() => groupByCategory(transactions, 'Income'), [transactions]);
  const expense = useMemo(() => groupByCategory(transactions, 'Expense'), [transactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BreakdownPie title="Income by Category" data={income} />
      <BreakdownPie title="Expenses by Category" data={expense} />
    </div>
  );
}
