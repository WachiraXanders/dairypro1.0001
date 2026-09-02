import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useCategories } from '@/hooks/useCategories';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/api';


const packageUnits = ["bags", "boxes", "bottles", "pieces", "sacks"];

export default function InventoryForm({ open, onOpenChange, item, onSubmit, isLoading }) {
  const categories = useCategories('inventory');
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => entities.Vendor.list('-created_date', 200),
  });
  const activeVendors = vendors.filter(v => v.status === 'Active');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Feed',
    package_quantity: '',
    package_unit: 'bags',
    kg_per_package: '',
    total_quantity_kg: '',
    reorder_level: '',
    cost_per_kg: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    supplier: '',
    vendor_id: '',
    vendor_name: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        category: item.category || 'Feed',
        package_quantity: item.package_quantity || '',
        package_unit: item.package_unit || 'bags',
        kg_per_package: item.kg_per_package || '',
        total_quantity_kg: item.total_quantity_kg || '',
        reorder_level: item.reorder_level || '',
        cost_per_kg: item.cost_per_kg || '',
        purchase_date: item.purchase_date || format(new Date(), 'yyyy-MM-dd'),
        supplier: item.supplier || '',
        vendor_id: item.vendor_id || '',
        vendor_name: item.vendor_name || '',
        location: item.location || '',
        notes: item.notes || '',
      });
    } else {
      setFormData({
        name: '',
        category: 'Feed',
        package_quantity: '',
        package_unit: 'bags',
        kg_per_package: '',
        total_quantity_kg: '',
        reorder_level: '',
        cost_per_kg: '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        supplier: '',
        vendor_id: '',
        vendor_name: '',
        location: '',
        notes: '',
      });
    }
  }, [item, open]);

  const calculateTotal = (packages, kgPerPackage) => {
    const pkgs = parseFloat(packages) || 0;
    const kg = parseFloat(kgPerPackage) || 0;
    return (pkgs * kg).toFixed(2);
  };

  const handlePackageChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    if (field === 'package_quantity' || field === 'kg_per_package') {
      newFormData.total_quantity_kg = calculateTotal(
        field === 'package_quantity' ? value : formData.package_quantity,
        field === 'kg_per_package' ? value : formData.kg_per_package
      );
    }
    setFormData(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      package_quantity: parseFloat(formData.package_quantity) || 0,
      kg_per_package: parseFloat(formData.kg_per_package) || 0,
      total_quantity_kg: parseFloat(formData.total_quantity_kg) || 0,
      reorder_level: parseFloat(formData.reorder_level) || 0,
      cost_per_kg: formData.cost_per_kg ? parseFloat(formData.cost_per_kg) : null,
    };
    onSubmit(submitData);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{item ? 'Edit Inventory Item' : 'Add Inventory Item'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Dairy Meal"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Purchase Date *</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="p-4 bg-muted/60 rounded-lg space-y-4">
            <p className="text-sm font-medium text-foreground/90">Package Information</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="package_quantity">Number of Packages *</Label>
                <Input
                  id="package_quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.package_quantity}
                  onChange={(e) => handlePackageChange('package_quantity', e.target.value)}
                  placeholder="e.g., 20"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Package Unit *</Label>
                <Select value={formData.package_unit} onValueChange={(v) => setFormData({ ...formData, package_unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {packageUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kg_per_package">Kg per Package *</Label>
              <Input
                id="kg_per_package"
                type="number"
                min="0"
                step="0.1"
                value={formData.kg_per_package}
                onChange={(e) => handlePackageChange('kg_per_package', e.target.value)}
                placeholder="e.g., 70"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_quantity_kg">Total Quantity (kg) *</Label>
              <Input
                id="total_quantity_kg"
                type="number"
                min="0"
                step="0.1"
                value={formData.total_quantity_kg}
                readOnly
                className="bg-card font-semibold text-emerald-600"
              />
              <p className="text-xs text-muted-foreground">
                Auto-calculated: {formData.package_quantity || 0} × {formData.kg_per_package || 0} kg
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reorder_level">Reorder Level (kg) *</Label>
              <Input
                id="reorder_level"
                type="number"
                min="0"
                step="0.1"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                placeholder="e.g., 50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_per_kg">Cost per Kg (Kshs)</Label>
              <Input
                id="cost_per_kg"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_per_kg}
                onChange={(e) => setFormData({ ...formData, cost_per_kg: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select
                value={formData.vendor_id || 'none'}
                onValueChange={(v) => {
                  if (v === 'none') {
                    setFormData({ ...formData, vendor_id: '', vendor_name: '', supplier: formData.supplier });
                  } else {
                    const vendor = activeVendors.find(vd => vd.id === v);
                    setFormData({ ...formData, vendor_id: v, vendor_name: vendor?.name || '', supplier: vendor?.name || formData.supplier });
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {activeVendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Storage location"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {item ? 'Update' : 'Add Item'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
