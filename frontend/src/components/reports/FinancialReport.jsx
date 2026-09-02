import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function FinancialReport({ transactions, milkRecords = [], milkPrices = [] }) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const filteredData = useMemo(() => {
    return transactions.filter(record => {
      const recordDate = record.date?.substring(0, 10) ?? '';
      const dateMatch = recordDate >= startDate && recordDate <= endDate;
      const typeMatch = typeFilter === 'all' || record.type === typeFilter;
      return dateMatch && typeMatch;
    });
  }, [transactions, startDate, endDate, typeFilter]);

  const summary = useMemo(() => {
    // Calculate milk sales income (excluding calf-used milk)
    const periodMilk = milkRecords.filter(m => m.date >= startDate && m.date <= endDate);
    const netMilkForSale = periodMilk.reduce((sum, m) => {
      const quantity = m.quantity_liters || 0;
      const calfUsed = m.milk_used_by_calves || 0;
      return sum + (quantity - calfUsed);
    }, 0);

    // Get milk prices for the period and calculate income
    let milkSalesIncome = 0;
    const monthsInPeriod = new Set(periodMilk.map(m => m.date.substring(0, 7)));
    
    monthsInPeriod.forEach(month => {
      const monthMilk = periodMilk.filter(m => m.date.startsWith(month));
      const monthNetMilk = monthMilk.reduce((sum, m) => {
        const quantity = m.quantity_liters || 0;
        const calfUsed = m.milk_used_by_calves || 0;
        return sum + (quantity - calfUsed);
      }, 0);
      
      const priceRecord = milkPrices.find(p => p.month === month);
      const pricePerLiter = priceRecord?.price_per_liter || 0;
      milkSalesIncome += monthNetMilk * pricePerLiter;
    });

    // Other income (excluding milk sales from transactions)
    const otherIncome = filteredData
      .filter(t => t.type === 'Income' && t.category !== 'Milk Sales')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const income = milkSalesIncome + otherIncome;
    const expenses = filteredData.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const profit = income - expenses;
    
    const byCategory = {};
    filteredData.forEach(txn => {
      const key = txn.category;
      if (!byCategory[key]) {
        byCategory[key] = { type: txn.type, total: 0, count: 0 };
      }
      byCategory[key].total += txn.amount || 0;
      byCategory[key].count += 1;
    });

    return { income, expenses, profit, byCategory };
  }, [filteredData, milkRecords, milkPrices, startDate, endDate]);

  const exportToCSV = () => {
    setExporting(true);
    const headers = ['Date', 'Type', 'Category', 'Amount (Kshs)', 'Description', 'Payment Method', 'Reference'];
    const rows = filteredData.map(txn => [
      format(new Date(txn.date), 'yyyy-MM-dd'),
      txn.type,
      txn.category,
      txn.amount,
      txn.description || '',
      txn.payment_method || '',
      txn.reference || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${startDate}-to-${endDate}.csv`;
    a.click();
    setExporting(false);
  };

  const exportToPDF = () => {
    setExporting(true);
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Financial Report', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Period: ${format(new Date(startDate), 'MMM d, yyyy')} - ${format(new Date(endDate), 'MMM d, yyyy')}`, 14, 28);
    
    doc.setFontSize(12);
    doc.text('Summary', 14, 38);
    doc.setFontSize(10);
    doc.text(`Total Income: Kshs ${summary.income.toFixed(2)}`, 14, 45);
    doc.text(`Total Expenses: Kshs ${summary.expenses.toFixed(2)}`, 14, 51);
    doc.text(`Net Profit: Kshs ${summary.profit.toFixed(2)}`, 14, 57);
    
    const tableData = filteredData.map(txn => [
      format(new Date(txn.date), 'MMM d'),
      txn.type,
      txn.category,
      `Kshs ${txn.amount.toFixed(2)}`,
      (txn.description || '').substring(0, 30)
    ]);
    
    doc.autoTable({
      startY: 65,
      head: [['Date', 'Type', 'Category', 'Amount', 'Description']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }
    });
    
    doc.save(`financial-report-${startDate}-to-${endDate}.pdf`);
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Transactions Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Export</Label>
              <div className="flex gap-2">
                <Button onClick={exportToCSV} variant="outline" disabled={exporting} className="flex-1">
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                </Button>
                <Button onClick={exportToPDF} variant="outline" disabled={exporting} className="flex-1">
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-emerald-700">Total Income</p>
              </div>
              <p className="text-2xl font-bold text-emerald-900 mt-1">Kshs {summary.income.toFixed(2)}</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                <p className="text-sm text-rose-700">Total Expenses</p>
              </div>
              <p className="text-2xl font-bold text-rose-900 mt-1">Kshs {summary.expenses.toFixed(2)}</p>
            </div>
            <div className={`rounded-lg p-4 ${summary.profit >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
              <p className={`text-sm ${summary.profit >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>Net Profit/Loss</p>
              <p className={`text-2xl font-bold mt-1 ${summary.profit >= 0 ? 'text-blue-900' : 'text-amber-900'}`}>
                Kshs {summary.profit.toFixed(2)}
              </p>
            </div>
          </div>

          {/* By Category */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Transactions by Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(summary.byCategory).map(([category, data]) => (
                <div key={category} className="bg-card border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground/90">{category}</p>
                    <Badge variant={data.type === 'Income' ? 'default' : 'destructive'} className="text-xs">
                      {data.type}
                    </Badge>
                  </div>
                  <p className={`text-lg font-bold mt-1 ${data.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Kshs {data.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{data.count} transactions</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Table */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Transaction Details ({filteredData.length})</h3>
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/60 sticky top-0">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{format(new Date(txn.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={txn.type === 'Income' ? 'default' : 'destructive'}>
                          {txn.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{txn.category}</TableCell>
                      <TableCell className={`font-semibold ${txn.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        Kshs {txn.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{txn.description || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{txn.payment_method || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
