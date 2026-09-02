import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function InventoryReport({ inventory }) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const filteredData = useMemo(() => {
    return inventory.filter(item => categoryFilter === 'all' || item.category === categoryFilter);
  }, [inventory, categoryFilter]);

  const summary = useMemo(() => {
    const totalValue = filteredData.reduce((sum, item) => sum + (item.total_quantity_kg * (item.cost_per_kg || 0)), 0);
    const lowStock = filteredData.filter(item => item.total_quantity_kg <= item.reorder_level).length;
    const outOfStock = filteredData.filter(item => item.total_quantity_kg <= 0).length;
    
    const byCategory = {};
    filteredData.forEach(item => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { count: 0, value: 0, totalKg: 0 };
      }
      byCategory[item.category].count += 1;
      byCategory[item.category].value += item.total_quantity_kg * (item.cost_per_kg || 0);
      byCategory[item.category].totalKg += item.total_quantity_kg;
    });

    return { totalValue, lowStock, outOfStock, byCategory };
  }, [filteredData]);

  const exportToCSV = () => {
    setExporting(true);
    const headers = ['Item Name', 'Category', 'Packages', 'Kg per Package', 'Total Kg', 'Reorder Level', 'Cost per Kg', 'Total Value', 'Status', 'Location', 'Supplier'];
    const rows = filteredData.map(item => [
      item.name,
      item.category,
      item.package_quantity,
      item.kg_per_package,
      item.total_quantity_kg,
      item.reorder_level,
      item.cost_per_kg || 0,
      (item.total_quantity_kg * (item.cost_per_kg || 0)).toFixed(2),
      item.total_quantity_kg <= item.reorder_level ? 'Low Stock' : 'In Stock',
      item.location || '',
      item.supplier || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setExporting(false);
  };

  const exportToPDF = () => {
    setExporting(true);
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Inventory Report', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    
    doc.setFontSize(12);
    doc.text('Summary', 14, 38);
    doc.setFontSize(10);
    doc.text(`Total Items: ${filteredData.length}`, 14, 45);
    doc.text(`Total Value: Kshs ${summary.totalValue.toFixed(2)}`, 14, 51);
    doc.text(`Low Stock Items: ${summary.lowStock}`, 14, 57);
    doc.text(`Out of Stock: ${summary.outOfStock}`, 14, 63);
    
    const tableData = filteredData.map(item => [
      item.name,
      item.category,
      `${item.package_quantity} ${item.package_unit}`,
      `${item.total_quantity_kg} kg`,
      item.total_quantity_kg <= item.reorder_level ? '⚠️ Low' : '✓ OK',
      `Kshs ${(item.total_quantity_kg * (item.cost_per_kg || 0)).toFixed(2)}`
    ]);
    
    doc.autoTable({
      startY: 70,
      head: [['Item', 'Category', 'Packages', 'Total', 'Status', 'Value']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }
    });
    
    doc.save(`inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Levels Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Feed">Feed</SelectItem>
                  <SelectItem value="Medicine">Medicine</SelectItem>
                  <SelectItem value="Supplement">Supplement</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Supplies">Supplies</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Export</Label>
              <div className="flex gap-2">
                <Button onClick={exportToCSV} variant="outline" disabled={exporting} className="flex-1">
                  {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  Export CSV
                </Button>
                <Button onClick={exportToPDF} variant="outline" disabled={exporting} className="flex-1">
                  {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Export PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-sm text-emerald-700">Total Items</p>
              <p className="text-2xl font-bold text-emerald-900">{filteredData.length}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">Total Value</p>
              <p className="text-2xl font-bold text-blue-900">Kshs {summary.totalValue.toFixed(0)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm text-amber-700">Low Stock</p>
              <p className="text-2xl font-bold text-amber-900">{summary.lowStock}</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-4">
              <p className="text-sm text-rose-700">Out of Stock</p>
              <p className="text-2xl font-bold text-rose-900">{summary.outOfStock}</p>
            </div>
          </div>

          {/* By Category */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Inventory by Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(summary.byCategory).map(([category, data]) => (
                <div key={category} className="bg-card border rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground/90">{category}</p>
                  <p className="text-lg font-bold text-emerald-600">{data.count} items</p>
                  <p className="text-xs text-muted-foreground">{data.totalKg.toFixed(1)} kg • Kshs {data.value.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Table */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Inventory Details ({filteredData.length})</h3>
            <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/60 sticky top-0">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Packages</TableHead>
                    <TableHead>Total Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    const isLowStock = item.total_quantity_kg <= item.reorder_level;
                    const isOutOfStock = item.total_quantity_kg <= 0;
                    return (
                      <TableRow key={item.id} className={isOutOfStock ? 'bg-rose-50' : isLowStock ? 'bg-amber-50' : ''}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>{item.package_quantity} {item.package_unit} × {item.kg_per_package}kg</TableCell>
                        <TableCell className="font-semibold">{item.total_quantity_kg} kg</TableCell>
                        <TableCell>{item.reorder_level} kg</TableCell>
                        <TableCell>
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" /> Out of Stock
                            </Badge>
                          ) : isLowStock ? (
                            <Badge className="bg-amber-100 text-amber-800 gap-1">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-emerald-600 font-semibold">
                          Kshs {(item.total_quantity_kg * (item.cost_per_kg || 0)).toFixed(2)}
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
