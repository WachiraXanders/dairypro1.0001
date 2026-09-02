import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';

export default function CashFlowReport({ transactions = [] }) {
  const data = useMemo(() => {
    const months = [...new Set(transactions.map((t) => t.date?.slice(0, 7)).filter(Boolean))].sort();
    let running = 0;
    return months.map((month) => {
      const monthTx = transactions.filter((t) => t.date?.startsWith(month));
      const inflow = monthTx.filter((t) => t.type === 'Income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const outflow = monthTx.filter((t) => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      running += inflow - outflow;
      return { month, inflow, outflow: -outflow, balance: running };
    });
  }, [transactions]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Cash Flow</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No data yet.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="inflow" fill="#059669" name="Cash In" />
                <Bar dataKey="outflow" fill="#ef4444" name="Cash Out" />
                <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} name="Running Balance" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
