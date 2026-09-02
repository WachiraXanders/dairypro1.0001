import React, { useState } from 'react';
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
import { Loader2, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';

const adjustmentTypes = ["Purchase", "Consumption", "Waste", "Transfer", "Adjustment"];

export default function StockAdjustmentForm({ open, onOpenChange, item, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    adjustment_type: 'Consumption',
    quantity_change: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    cost: '',
    reason: '',
    reference: '',
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!item) return;

    const quantityChange = parseFloat(formData.quantity_change) || 0;
    const submitData = {
      inventory_id: item.id,
      item_name: item.name,
      adjustment_type: formData.adjustment_type,
      quantity_change: quantityChange,
      previous_quantity: item.total_quantity_kg,
      new_quantity: item.total_quantity_kg + quantityChange,
      date: formData.date,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      reason: formData.reason,
      reference: formData.reference,
      notes: formData.notes,
    };
    onSubmit(submitData);
    
    // Reset form
    setFormData({
      adjustment_type: 'Consumption',
      quantity_change: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      cost: '',
      reason: '',
      reference: '',
      notes: '',
    });
  };

  const isAddition = ['Purchase', 'Adjustment'].includes(formData.adjustment_type);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Record Stock Adjustment</SheetTitle>
        </SheetHeader>
        {item && (
          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            <div className="p-4 bg-muted/60 rounded-xl">
              <p className="text-sm text-muted-foreground">Item</p>
              <p className="font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.package_quantity} {item.package_unit} × {item.kg_per_package}kg
              </p>
              <p className="text-sm text-muted-foreground mt-2">Current Stock</p>
              <p className="text-lg font-bold text-emerald-600">
                {item.total_quantity_kg} kg
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adjustment Type *</Label>
                <Select value={formData.adjustment_type} onValueChange={(v) => setFormData({ ...formData, adjustment_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adjustmentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity_change">
                Quantity {isAddition ? 'Added' : 'Removed'} *
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {isAddition ? (
                    <Plus className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Minus className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <Input
                  id="quantity_change"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.quantity_change}
                  onChange={(e) => setFormData({ ...formData, quantity_change: e.target.value })}
                  placeholder="0"
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                New stock will be: {item.total_quantity_kg + (parseFloat(formData.quantity_change) || 0) * (isAddition ? 1 : -1)} kg
              </p>
            </div>

            {formData.adjustment_type === 'Purchase' && (
              <div className="space-y-2">
                <Label htmlFor="cost">Total Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Daily feeding, Received delivery"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference / Invoice #</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="e.g., INV-12345"
              />
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
                Record Adjustment
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
