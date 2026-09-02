import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2, Syringe, Stethoscope, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function HealthReport({ cattle, healthRecords }) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [recordTypeFilter, setRecordTypeFilter] = useState('all');
  const [selectedCattle, setSelectedCattle] = useState('all');
  const [exporting, setExporting] = useState(false);

  const filteredData = useMemo(() => {
    return healthRecords.filter(record => {
      const recordDate = new Date(record.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateMatch = recordDate >= start && recordDate <= end;
      const typeMatch = recordTypeFilter === 'all' || record.record_type === recordTypeFilter;
      const cattleMatch = selectedCattle === 'all' || record.cattle_id === selectedCattle;
      return dateMatch && typeMatch && cattleMatch;
    });
  }, [healthRecords, startDate, endDate, recordTypeFilter, selectedCattle]);

  const summary = useMemo(() => {
    const totalCost = filteredData.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalRecords = filteredData.length;
    
    const byType = {};
    filteredData.forEach(record => {
      const key = record.record_type;
      if (!byType[key]) {
        byType[key] = { count: 0, cost: 0 };
      }
      byType[key].count += 1;
      byType[key].cost += record.cost || 0;
    });

    const byCattle = {};
    filteredData.forEach(record => {
      const key = record.cattle_id || 'unknown';
      if (!byCattle[key]) {
        const cow = cattle.find(c => c.id === record.cattle_id);
        byCattle[key] = {
          tag: record.cattle_tag,
          name: cow?.name || 'Unknown',
          count: 0,
          cost: 0
        };
      }
      byCattle[key].count += 1;
      byCattle[key].cost += record.cost || 0;
    });

    const byStatus = {
      Resolved: filteredData.filter(r => r.status === 'Resolved').length,
      Ongoing: filteredData.filter(r => r.status === 'Ongoing').length,
      Monitoring: filteredData.filter(r => r.status === 'Monitoring').length,
    };

    return { totalCost, totalRecords, byType, byCattle, byStatus };
  }, [filteredData, cattle]);

  const exportToCSV = () => {
    setExporting(true);
    const headers = ['Date', 'Cattle Tag', 'Cattle Name', 'Record Type', 'Diagnosis', 'Treatment', 'Cost (Kshs)', 'Status', 'Veterinarian'];
    const rows = filteredData.map(record => {
      const cow = cattle.find(c => c.id === record.cattle_id);
      return [
        format(new Date(record.date), 'yyyy-MM-dd'),
        record.cattle_tag || '',
        cow?.name || 'Unknown',
        record.record_type,
        record.diagnosis || '',
        record.treatment || '',
        record.cost || 0,
        record.status || '',
        record.veterinarian || ''
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${startDate}-to-${endDate}.csv`;
    a.click();
    setExporting(false);
  };

  const exportToPDF = () => {
    setExporting(true);
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Cattle Health Report', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Period: ${format(new Date(startDate), 'MMM d, yyyy')} - ${format(new Date(endDate), 'MMM d, yyyy')}`, 14, 28);
    
    doc.setFontSize(12);
    doc.text('Summary', 14, 38);
    doc.setFontSize(10);
    doc.text(`Total Records: ${summary.totalRecords}`, 14, 45);
    doc.text(`Total Health Cost: Kshs ${summary.totalCost.toFixed(2)}`, 14, 51);
    doc.text(`Resolved: ${summary.byStatus.Resolved} | Ongoing: ${summary.byStatus.Ongoing} | Monitoring: ${summary.byStatus.Monitoring}`, 14, 57);
    
    const tableData = filteredData.map(record => {
      const cow = cattle.find(c => c.id === record.cattle_id);
      return [
        format(new Date(record.date), 'MMM d'),
        record.cattle_tag,
        cow?.name || 'Unknown',
        record.record_type,
        (record.diagnosis || '').substring(0, 25),
        `Kshs ${(record.cost || 0).toFixed(2)}`,
        record.status
      ];
    });
    
    doc.autoTable({
      startY: 65,
      head: [['Date', 'Tag', 'Cattle', 'Type', 'Diagnosis', 'Cost', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }
    });
    
    doc.save(`health-report-${startDate}-to-${endDate}.pdf`);
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cattle Health Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Record Type</Label>
              <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Vaccination">Vaccination</SelectItem>
                  <SelectItem value="Treatment">Treatment</SelectItem>
                  <SelectItem value="Checkup">Checkup</SelectItem>
                  <SelectItem value="Deworming">Deworming</SelectItem>
                  <SelectItem value="Illness">Illness</SelectItem>
                  <SelectItem value="Injury">Injury</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">Total Records</p>
              <p className="text-2xl font-bold text-blue-900">{summary.totalRecords}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-sm text-emerald-700">Total Cost</p>
              <p className="text-2xl font-bold text-emerald-900">Kshs {summary.totalCost.toFixed(0)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-700">Resolved</p>
              <p className="text-2xl font-bold text-green-900">{summary.byStatus.Resolved}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-amber-700">Ongoing</p>
              <p className="text-2xl font-bold text-amber-900">{summary.byStatus.Ongoing}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-700">Monitoring</p>
              <p className="text-2xl font-bold text-purple-900">{summary.byStatus.Monitoring}</p>
            </div>
          </div>

          {/* By Type */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Records by Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(summary.byType).map(([type, data]) => (
                <div key={type} className="bg-card border rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground/90">{type}</p>
                  <p className="text-lg font-bold text-blue-600">{data.count} records</p>
                  <p className="text-xs text-muted-foreground">Kshs {data.cost.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* By Cattle */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Records by Cattle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(summary.byCattle).map((cow, idx) => (
                <div key={idx} className="bg-card border rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">{cow.tag} - {cow.name}</p>
                  <p className="text-lg font-bold text-rose-600">{cow.count} records</p>
                  <p className="text-xs text-muted-foreground">Kshs {cow.cost.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Table */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Health Records ({filteredData.length})</h3>
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/60 sticky top-0">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Cattle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record) => {
                    const cow = cattle.find(c => c.id === record.cattle_id);
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{record.cattle_tag} - {cow?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.record_type}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.diagnosis || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{record.treatment || '-'}</TableCell>
                        <TableCell className="font-semibold text-rose-600">
                          Kshs {(record.cost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              record.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                              record.status === 'Ongoing' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-100 text-blue-800'
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
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
