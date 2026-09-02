import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FeedingLogDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    inventory_id: '',
    amount_kg: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => entities.Inventory.list('-created_date'),
    enabled: open,
  });

  // Only feed/supplement items
  const feedItems = inventory.filter(i => i.category === 'Feed' || i.category === 'Supplement');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const selectedItem = inventory.find(i => i.id === form.inventory_id);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem) throw new Error('No item selected');
      const amountKg = parseFloat(form.amount_kg);
      if (!amountKg || amountKg <= 0) throw new Error('Invalid amount');

      const previousQty = selectedItem.total_quantity_kg || 0;
      const newQty = Math.max(0, previousQty - amountKg);

      await Promise.all([
        entities.StockAdjustment.create({
          inventory_id: form.inventory_id,
          item_name: selectedItem.name,
          adjustment_type: 'Consumption',
          quantity_change: -amountKg,
          previous_quantity: previousQty,
          new_quantity: newQty,
          date: form.date,
          reason: form.notes || 'Manual feed log',
        }),
        entities.Inventory.update(form.inventory_id, {
          total_quantity_kg: newQty,
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stockAdjustments'] });
      toast.success(`Deducted ${form.amount_kg} kg from ${selectedItem?.name}`);
      setForm({ inventory_id: '', amount_kg: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message || 'Failed to log feed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            Manual Feed / Supplement Log
          </SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground mt-2 mb-4">
          Record feed or supplement usage to automatically deduct from inventory stock.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Feed / Supplement Item *</Label>
            <Select value={form.inventory_id} onValueChange={v => set('inventory_id', v)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select item..." />
              </SelectTrigger>
              <SelectContent>
                {feedItems.length === 0 ? (
                  <SelectItem value="_none" disabled>No feed/supplement items in inventory</SelectItem>
                ) : (
                  feedItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} — {item.total_quantity_kg} kg available
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="text-amber-800 font-medium">{selectedItem.name}</p>
              <p className="text-amber-700">Current stock: <strong>{selectedItem.total_quantity_kg} kg</strong></p>
              {selectedItem.reorder_level && (
                <p className="text-amber-600 text-xs">Reorder level: {selectedItem.reorder_level} kg</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount Used (kg) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount_kg}
                onChange={e => set('amount_kg', e.target.value)}
                placeholder="e.g. 5.0"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
          </div>

          {selectedItem && form.amount_kg && (
            <div className="bg-muted/60 rounded-lg p-3 text-sm text-muted-foreground">
              After deduction: <strong>{Math.max(0, (selectedItem.total_quantity_kg || 0) - parseFloat(form.amount_kg || 0)).toFixed(2)} kg</strong> remaining
            </div>
          )}

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="e.g. Morning feeding, Pen A..." rows={2} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700" disabled={mutation.isPending || !form.inventory_id}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log & Deduct'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
