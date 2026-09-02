import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function ConsumptionLogForm({ open, onOpenChange, inventory = [], groups = [], onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    inventory_id: '',
    group_id: '',
    quantity_kg: '',
    head_count: '',
    recorded_by: '',
    notes: '',
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        inventory_id: '',
        group_id: '',
        quantity_kg: '',
        head_count: '',
        recorded_by: '',
        notes: '',
      });
    }
  }, [open]);

  const selectedItem = inventory.find(i => i.id === formData.inventory_id);
  const selectedGroup = groups.find(g => g.id === formData.group_id);
  const qty = parseFloat(formData.quantity_kg) || 0;
  const headCount = parseInt(formData.head_count) || 0;
  const stockAfter = selectedItem ? (selectedItem.total_quantity_kg - qty) : null;
  const willTriggerAlert = selectedItem && stockAfter !== null && stockAfter <= selectedItem.reorder_level;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.inventory_id) return;

    const kgPerHead = headCount > 0 ? parseFloat((qty / headCount).toFixed(2)) : null;
    const costTotal = selectedItem?.cost_per_kg ? parseFloat((qty * selectedItem.cost_per_kg).toFixed(2)) : null;

    onSubmit({
      date: formData.date,
      inventory_id: formData.inventory_id,
      item_name: selectedItem?.name || '',
      group_id: formData.group_id || null,
      group_name: selectedGroup?.name || '',
      quantity_kg: qty,
      head_count: headCount || null,
      kg_per_head: kgPerHead,
      cost_per_kg: selectedItem?.cost_per_kg || null,
      total_cost: costTotal,
      stock_before_kg: selectedItem?.total_quantity_kg || null,
      stock_after_kg: stockAfter,
      recorded_by: formData.recorded_by,
      notes: formData.notes,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Log Feed Consumption
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Feed Item */}
          <div className="space-y-2">
            <Label>Feed / Item *</Label>
            <Select
              value={formData.inventory_id}
              onValueChange={(v) => setFormData({ ...formData, inventory_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select feed item..." />
              </SelectTrigger>
              <SelectContent>
                {inventory.filter(i => i.category === 'Feed' || i.category === 'Supplement').map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.total_quantity_kg} kg available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/60 px-3 py-2 rounded-lg">
                <span>Available: <strong className="text-foreground/90">{selectedItem.total_quantity_kg} kg</strong></span>
                {selectedItem.cost_per_kg && (
                  <span>Cost: <strong className="text-foreground/90">Kshs {selectedItem.cost_per_kg}/kg</strong></span>
                )}
              </div>
            )}
          </div>

          {/* Animal Group */}
          <div className="space-y-2">
            <Label>Animal Group</Label>
            <Select
              value={formData.group_id}
              onValueChange={(v) => setFormData({ ...formData, group_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select group (optional)..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No specific group —</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity & Head Count */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity (kg) *</Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={formData.quantity_kg}
                onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
                placeholder="e.g., 50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Head Count</Label>
              <Input
                type="number"
                min="1"
                value={formData.head_count}
                onChange={(e) => setFormData({ ...formData, head_count: e.target.value })}
                placeholder="No. of animals"
              />
            </div>
          </div>

          {/* Calculated preview */}
          {qty > 0 && selectedItem && (
            <div className={`p-3 rounded-lg border space-y-1.5 ${willTriggerAlert ? 'bg-amber-50 border-amber-200' : 'bg-muted/60 border-border'}`}>
              {headCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kg per head</span>
                  <span className="font-medium">{(qty / headCount).toFixed(2)} kg</span>
                </div>
              )}
              {selectedItem.cost_per_kg && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total cost</span>
                  <span className="font-medium text-emerald-700">Kshs {(qty * selectedItem.cost_per_kg).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stock after</span>
                <span className={`font-semibold ${stockAfter < 0 ? 'text-rose-600' : willTriggerAlert ? 'text-amber-600' : 'text-foreground/90'}`}>
                  {stockAfter?.toFixed(1)} kg
                </span>
              </div>
              {willTriggerAlert && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  This will bring stock below the reorder level ({selectedItem.reorder_level} kg)
                </div>
              )}
              {stockAfter < 0 && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Quantity exceeds available stock!
                </div>
              )}
            </div>
          )}

          {/* Recorded by */}
          <div className="space-y-2">
            <Label>Recorded By</Label>
            <Input
              value={formData.recorded_by}
              onChange={(e) => setFormData({ ...formData, recorded_by: e.target.value })}
              placeholder="Staff name"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional observations..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.inventory_id || !formData.quantity_kg || stockAfter < 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Log Consumption
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
