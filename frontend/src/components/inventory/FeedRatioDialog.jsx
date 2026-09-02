import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Beef } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FeedRatioDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    cattle_id: '', inventory_id: '', date: format(new Date(), 'yyyy-MM-dd'), feed_amount_kg: '', notes: '',
  });

  const { data: cattle = [] } = useQuery({ queryKey: ['Cattle'], queryFn: () => entities.Cattle.list(), enabled: open });
  const { data: inventory = [] } = useQuery({ queryKey: ['Inventory'], queryFn: () => entities.Inventory.list(), enabled: open });
  const { data: feedRatios = [] } = useQuery({
    queryKey: ['FeedRatio'],
    queryFn: () => entities.FeedRatio.list('-date', 500),
    enabled: open,
  });

  const feedItems = inventory.filter((i) => i.category === 'Feed' || i.category === 'Supplement');
  const selectedCow = cattle.find((c) => c.id === form.cattle_id);
  const selectedItem = inventory.find((i) => i.id === form.inventory_id);
  const amountKg = parseFloat(form.feed_amount_kg) || 0;
  const remaining = selectedItem ? Math.max(0, (selectedItem.total_quantity_kg || 0) - amountKg) : null;

  const todaysSummary = feedRatios.filter((f) => f.date === form.date);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem || !selectedCow) throw new Error('Select a cow and a feed item');
      const remainingAfter = Math.max(0, (selectedItem.total_quantity_kg || 0) - amountKg);
      await entities.FeedRatio.create({
        cattle_id: form.cattle_id,
        cattle_tag: selectedCow.tag_number,
        cattle_name: selectedCow.name || '',
        date: form.date,
        inventory_id: form.inventory_id,
        feed_name: selectedItem.name,
        feed_amount_kg: amountKg,
        cost_per_kg: selectedItem.cost_per_kg || 0,
        total_cost: +(amountKg * (selectedItem.cost_per_kg || 0)).toFixed(2),
        remaining_inventory_kg: remainingAfter,
        notes: form.notes,
      });
      await entities.Inventory.update(form.inventory_id, { total_quantity_kg: remainingAfter });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['FeedRatio'] });
      queryClient.invalidateQueries({ queryKey: ['Inventory'] });
      toast.success('Feed ratio logged');
      setForm({ cattle_id: '', inventory_id: '', date: form.date, feed_amount_kg: '', notes: '' });
    },
    onError: (e) => toast.error(e.message || 'Failed to log feed ratio'),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Beef className="w-5 h-5 text-emerald-600" /> Feed Ratio — Individual Cow</SheetTitle>
        </SheetHeader>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label>Cow *</Label>
            <Select value={form.cattle_id} onValueChange={(v) => setForm({ ...form, cattle_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select cow" /></SelectTrigger>
              <SelectContent>{cattle.map((c) => <SelectItem key={c.id} value={c.id}>{c.tag_number} {c.name ? `— ${c.name}` : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Feed Item *</Label>
            <Select value={form.inventory_id} onValueChange={(v) => setForm({ ...form, inventory_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select feed item" /></SelectTrigger>
              <SelectContent>{feedItems.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.total_quantity_kg} kg avail.)</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (kg) *</Label>
              <Input type="number" step="0.1" value={form.feed_amount_kg} onChange={(e) => setForm({ ...form, feed_amount_kg: e.target.value })} required />
            </div>
          </div>

          {selectedItem && amountKg > 0 && (
            <div className="bg-muted/60 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Cost</span><span className="font-medium">{(amountKg * (selectedItem.cost_per_kg || 0)).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Stock remaining after</span><span className={remaining <= (selectedItem.reorder_level || 0) ? 'text-amber-600 font-medium' : 'font-medium'}>{remaining?.toFixed(1)} kg</span></div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending || !form.cattle_id || !form.inventory_id}>
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Log Feed Ratio
          </Button>
        </form>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-foreground/90 mb-2">Ratio Summary — {form.date}</h4>
          {todaysSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feed ratio entries logged for this date yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Cow</TableHead><TableHead>Feed</TableHead><TableHead>Kg</TableHead><TableHead>Cost</TableHead></TableRow></TableHeader>
              <TableBody>
                {todaysSummary.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.cattle_tag}</TableCell>
                    <TableCell>{f.feed_name}</TableCell>
                    <TableCell>{f.feed_amount_kg}</TableCell>
                    <TableCell>{f.total_cost ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
