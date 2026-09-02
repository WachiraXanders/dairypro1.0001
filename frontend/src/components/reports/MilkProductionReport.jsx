import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function MilkProductionReport({ cattle, milkRecords }) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedCattle, setSelectedCattle] = useState('all');
  const [exporting, setExporting] = useState(false);

  const filteredData = useMemo(() => {
    return milkRecords.filter(record => {
      const recordDate = new Date(record.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateMatch = recordDate >= start && recordDate <= end;
      const cattleMatch = selectedCattle === 'all' || record.cattle_id === selectedCattle;
      return dateMatch && cattleMatch;
    });
  }, [milkRecords, startDate, endDate, selectedCattle]);

  const summary = useMemo(() => {
    const totalLiters = filteredData.reduce((sum, r) => sum + (r.quantity_liters || 0), 0);
    const totalUsedByCalves = filteredData.reduce((sum, r) => sum + (r.milk_used_by_calves || 0), 0);
    const netProduction = totalLiters - totalUsedByCalves;
    const avgPerDay = filteredData.length > 0 ? totalLiters / Math.max(1, new Set(filteredData.map(r => r.date)).size) : 0;
    const avgFat = filteredData.filter(r => r.fat_percentage).length > 0 
      ? filteredData.reduce((sum, r) => sum + (r.fat_percentage || 0), 0) / filteredData.filter(r => r.fat_percentage).length 
      : 0;
    
    // Group by cattle (filtered period)
    const byCattle = {};
    filteredData.forEach(record => {
      const key = record.cattle_id || 'unknown';
      if (!byCattle[key]) {
        byCattle[key] = {
          tag: record.cattle_tag,
          name: cattle.find(c => c.id === record.cattle_id)?.name || 'Unknown',
          total: 0,
          count: 0
        };
      }
      byCattle[key].total += record.quantity_liters || 0;
      byCattle[key].count += 1;
    });

    // Total milk since calved per cattle (all-time, not filtered)
    const lifetimeByCattle = {};
    milkRecords.forEach(record => {
      const key = record.cattle_id || 'unknown';
      if (!lifetimeByCattle[key]) {
        const cow = cattle.find(c => c.id === record.cattle_id);
        // Use the earliest milk record date as proxy for "since calved"
        const allForCow = milkRecords.filter(m => m.cattle_id === record.cattle_id);
        const firstDate = allForCow.reduce((min, m) => m.date < min ? m.date : min, record.date);
        lifetimeByCattle[key] = {
          tag: record.cattle_tag,
          name: cow?.name || 'Unknown',
          firstMilkDate: firstDate,
          total: 0,
        };
      }
      lifetimeByCattle[key].total += record.quantity_liters || 0;
    });

    return { totalLiters, totalUsedByCalves, netProduction, avgPerDay, avgFat, byCattle, lifetimeByCattle };
  }, [filteredData, milkRecords, cattle]);

  const exportToCSV = () => {
    setExporting(true);
    const headers = ['Date', 'Session', 'Cattle Tag', 'Cattle Name', 'Quantity (L)', 'Used by Calves (L)', 'Fat %', 'Protein %', 'Quality'];
    const rows = filteredData.map(record => {
      const cow = cattle.find(c => c.id === record.cattle_id);
      return [
        format(new Date(record.date), 'yyyy-MM-dd'),
        record.session || '',
        record.cattle_tag || '',
        cow?.name || 'Unknown',
        record.quantity_liters || 0,
        record.milk_used_by_calves || 0,
        record.fat_percentage || '',
        record.protein_percentage || '',
        record.quality_grade || ''
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `milk-production-report-${startDate}-to-${endDate}.csv`;
    a.click();
    setExporting(false);
  };

  const exportToPDF = () => {
    setExporting(true);
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Milk Production Report', 14, 20);
    
    // Date range
    doc.setFontSize(10);
    doc.text(`Period: ${format(new Date(startDate), 'MMM d, yyyy')} - ${format(new Date(endDate), 'MMM d, yyyy')}`, 14, 28);
    
    // Summary
    doc.setFontSize(12);
    doc.text('Summary', 14, 38);
    doc.setFontSize(10);
    doc.text(`Total Production: ${summary.totalLiters.toFixed(1)} L`, 14, 45);
    doc.text(`Used by Calves: ${summary.totalUsedByCalves.toFixed(1)} L`, 14, 51);
    doc.text(`Net Production: ${summary.netProduction.toFixed(1)} L`, 14, 57);
    doc.text(`Average per Day: ${summary.avgPerDay.toFixed(1)} L`, 14, 63);
    doc.text(`Average Fat Content: ${summary.avgFat.toFixed(2)}%`, 14, 69);
    
    // Table
    const tableData = filteredData.map(record => {
      const cow = cattle.find(c => c.id === record.cattle_id);
      return [
        format(new Date(record.date), 'MMM d'),
        record.session,
        record.cattle_tag,
        cow?.name || 'Unknown',
        record.quantity_liters.toFixed(1),
        (record.milk_used_by_calves || 0).toFixed(1),
        record.quality_grade || '-'
      ];
    });
    
    doc.autoTable({
      startY: 76,
      head: [['Date', 'Session', 'Tag', 'Cattle', 'Quantity (L)', 'Used by Calves (L)', 'Quality']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }
    });
    
    doc.save(`milk-production-report-${startDate}-to-${endDate}.pdf`);
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Milk Production Report</CardTitle>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-sm text-emerald-700">Total Production</p>
              <p className="text-2xl font-bold text-emerald-900">{summary.totalLiters.toFixed(1)} L</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">Used by Calves</p>
              <p className="text-2xl font-bold text-blue-900">{summary.totalUsedByCalves.toFixed(1)} L</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm text-indigo-700">Net Production</p>
              <p className="text-2xl font-bold text-indigo-900">{summary.netProduction.toFixed(1)} L</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-700">Avg per Day</p>
              <p className="text-2xl font-bold text-purple-900">{summary.avgPerDay.toFixed(1)} L</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-amber-700">Avg Fat %</p>
              <p className="text-2xl font-bold text-amber-900">{summary.avgFat.toFixed(2)}%</p>
            </div>
          </div>

          {/* Total Milk Since Calved */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Total Milk Since First Record (All-Time)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(summary.lifetimeByCattle).sort((a, b) => b.total - a.total).map((cow, idx) => (
                <div key={idx} className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground/90">{cow.tag} {cow.name ? `- ${cow.name}` : ''}</p>
                  <p className="text-xl font-bold text-teal-700">{cow.total.toFixed(1)} L</p>
                  <p className="text-xs text-muted-foreground">Since {cow.firstMilkDate ? format(new Date(cow.firstMilkDate), 'MMM d, yyyy') : '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* By Cattle (period) */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Production by Cattle (Selected Period)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(summary.byCattle).map((cow, idx) => (
                <div key={idx} className="bg-card border rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">{cow.tag} - {cow.name}</p>
                  <p className="text-lg font-bold text-emerald-600">{cow.total.toFixed(1)} L</p>
                  <p className="text-xs text-muted-foreground">{cow.count} records</p>
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
                    <TableHead>Session</TableHead>
                    <TableHead>Cattle</TableHead>
                    <TableHead>Quantity (L)</TableHead>
                    <TableHead>Used by Calves (L)</TableHead>
                    <TableHead>Fat %</TableHead>
                    <TableHead>Quality</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record) => {
                    const cow = cattle.find(c => c.id === record.cattle_id);
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{record.session}</TableCell>
                        <TableCell>{record.cattle_tag} - {cow?.name || 'Unknown'}</TableCell>
                        <TableCell className="font-semibold">{record.quantity_liters}</TableCell>
                        <TableCell>{record.milk_used_by_calves || 0}</TableCell>
                        <TableCell>{record.fat_percentage || '-'}</TableCell>
                        <TableCell>{record.quality_grade || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
