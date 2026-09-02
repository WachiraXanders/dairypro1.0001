import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function FeedConsumptionReport({ cattle, feedRatios }) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedCattle, setSelectedCattle] = useState('all');
  const [exporting, setExporting] = useState(false);

  const filteredData = useMemo(() => {
    return feedRatios.filter(record => {
      const recordDate = new Date(record.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateMatch = recordDate >= start && recordDate <= end;
      const cattleMatch = selectedCattle === 'all' || record.cattle_id === selectedCattle;
      return dateMatch && cattleMatch;
    });
  }, [feedRatios, startDate, endDate, selectedCattle]);

  const summary = useMemo(() => {
    const totalFeedKg = filteredData.reduce((sum, r) => sum + (r.feed_amount_kg || 0), 0);
    const totalCost = filteredData.reduce((sum, r) => sum + (r.total_cost || 0), 0);
    const avgPerDay = filteredData.length > 0 ? totalFeedKg / Math.max(1, new Set(filteredData.map(r => r.date)).size) : 0;
    
    // Group by cattle
    const byCattle = {};
    filteredData.forEach(record => {
      const key = record.cattle_id || 'unknown';
      if (!byCattle[key]) {
        byCattle[key] = {
          tag: record.cattle_tag,
          name: record.cattle_name || 'Unknown',
          totalFeed: 0,
          totalCost: 0,
          count: 0
        };
      }
      byCattle[key].totalFeed += record.feed_amount_kg || 0;
      byCattle[key].totalCost += record.total_cost || 0;
      byCattle[key].count += 1;
    });

    // Group by feed type
    const byFeed = {};
    filteredData.forEach(record => {
      const key = record.feed_name || 'unknown';
      if (!byFeed[key]) {
        byFeed[key] = { name: key, totalKg: 0, totalCost: 0 };
      }
      byFeed[key].totalKg += record.feed_amount_kg || 0;
      byFeed[key].totalCost += record.total_cost || 0;
    });

    return { totalFeedKg, totalCost, avgPerDay, byCattle, byFeed };
  }, [filteredData]);

  const exportToCSV = () => {
    setExporting(true);
    const headers = ['Date', 'Cattle Tag', 'Cattle Name', 'Feed Name', 'Amount (kg)', 'Cost per Kg', 'Total Cost', 'Remaining Inventory'];
    const rows = filteredData.map(record => [
      format(new Date(record.date), 'yyyy-MM-dd'),
      record.cattle_tag || '',
      record.cattle_name || 'Unknown',
      record.feed_name || '',
      record.feed_amount_kg || 0,
      record.cost_per_kg || 0,
      record.total_cost || 0,
      record.remaining_inventory_kg || 0
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feed-consumption-report-${startDate}-to-${endDate}.csv`;
    a.click();
    setExporting(false);
  };

  const exportToPDF = () => {
    setExporting(true);
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Feed Consumption Report', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Period: ${format(new Date(startDate), 'MMM d, yyyy')} - ${format(new Date(endDate), 'MMM d, yyyy')}`, 14, 28);
    
    doc.setFontSize(12);
    doc.text('Summary', 14, 38);
    doc.setFontSize(10);
    doc.text(`Total Feed Consumed: ${summary.totalFeedKg.toFixed(1)} kg`, 14, 45);
    doc.text(`Total Cost: Kshs ${summary.totalCost.toFixed(2)}`, 14, 51);
    doc.text(`Average per Day: ${summary.avgPerDay.toFixed(1)} kg`, 14, 57);
    
    const tableData = filteredData.map(record => [
      format(new Date(record.date), 'MMM d'),
      record.cattle_tag,
      record.cattle_name,
      record.feed_name,
      record.feed_amount_kg.toFixed(1),
      `Kshs ${record.total_cost.toFixed(2)}`
    ]);
    
    doc.autoTable({
      startY: 65,
      head: [['Date', 'Tag', 'Cattle', 'Feed', 'Amount (kg)', 'Cost']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }
    });
    
    doc.save(`feed-consumption-report-${startDate}-to-${endDate}.pdf`);
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feed Consumption Report</CardTitle>
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
              <Label>Cattle</Label>
              <Select value={selectedCattle} onValueChange={setSelectedCattle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cattle</SelectItem>
                  {cattle.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.tag_number} - {c.name || 'Unnamed'}</SelectItem>
                  ))}
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
              <p className="text-sm text-emerald-700">Total Feed Consumed</p>
              <p className="text-2xl font-bold text-emerald-900">{summary.totalFeedKg.toFixed(1)} kg</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">Total Cost</p>
              <p className="text-2xl font-bold text-blue-900">Kshs {summary.totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-700">Avg per Day</p>
              <p className="text-2xl font-bold text-purple-900">{summary.avgPerDay.toFixed(1)} kg</p>
            </div>
          </div>

          {/* By Feed Type */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Consumption by Feed Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(summary.byFeed).map((feed, idx) => (
                <div key={idx} className="bg-card border rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground/90">{feed.name}</p>
                  <p className="text-lg font-bold text-emerald-600">{feed.totalKg.toFixed(1)} kg</p>
                  <p className="text-xs text-muted-foreground">Kshs {feed.totalCost.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* By Cattle */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Consumption by Cattle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(summary.byCattle).map((cow, idx) => (
                <div key={idx} className="bg-card border rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">{cow.tag} - {cow.name}</p>
                  <p className="text-lg font-bold text-emerald-600">{cow.totalFeed.toFixed(1)} kg</p>
                  <p className="text-xs text-muted-foreground">Kshs {cow.totalCost.toFixed(2)} • {cow.count} entries</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Table */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Detailed Records ({filteredData.length})</h3>
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/60 sticky top-0">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Cattle</TableHead>
                    <TableHead>Feed</TableHead>
                    <TableHead>Amount (kg)</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{record.cattle_tag} - {record.cattle_name}</TableCell>
                      <TableCell>{record.feed_name}</TableCell>
                      <TableCell className="font-semibold">{record.feed_amount_kg || 0} kg</TableCell>
                      <TableCell className="text-emerald-600">Kshs {(record.total_cost || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{record.remaining_inventory_kg || 0} kg</TableCell>
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
