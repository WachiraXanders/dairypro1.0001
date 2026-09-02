import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, CalendarClock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { cattle_id: '', inventory_id: '', feed_amount_kg: '', start_date: '', end_date: '', active: true };

export default function FeedingSchedulesTab() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['ScheduledFeedRatio'],
    queryFn: () => entities.ScheduledFeedRatio.list(),
  });
  const { data: cattle = [] } = useQuery({ queryKey: ['Cattle'], queryFn: () => entities.Cattle.list() });
  const { data: inventory = [] } = useQuery({ queryKey: ['Inventory'], queryFn: () => entities.Inventory.list() });
  const { data: feedRatios = [] } = useQuery({ queryKey: ['FeedRatio'], queryFn: () => entities.FeedRatio.list('-date', 100) });

  const feedItems = inventory.filter((i) => i.category === 'Feed' || i.category === 'Supplement');

  const createMutation = useMutation({
    mutationFn: () => {
      const cattleRec = cattle.find((c) => c.id === form.cattle_id);
      const invRec = feedItems.find((i) => i.id === form.inventory_id);
      return entities.ScheduledFeedRatio.create({
        cattle_id: form.cattle_id,
        cattle_tag: cattleRec?.tag_number || '',
        cattle_name: cattleRec?.name || '',
        inventory_id: form.inventory_id,
        feed_name: invRec?.name || '',
        feed_amount_kg: Number(form.feed_amount_kg),
        start_date: form.start_date,
        end_date: form.end_date,
        active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ScheduledFeedRatio'] });
      setOpen(false);
      setForm(emptyForm);
      toast.success('Feeding schedule created — entries will be generated automatically');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => entities.ScheduledFeedRatio.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ScheduledFeedRatio'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.ScheduledFeedRatio.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ScheduledFeedRatio'] }); toast.success('Schedule removed'); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Automatic Feeding Schedules</h3>
          <p className="text-sm text-muted-foreground">Feed entries and stock deductions are created automatically each day this schedule is active.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> New Schedule</Button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : schedules.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground text-sm">No feeding schedules yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cattle</TableHead>
                <TableHead>Feed</TableHead>
                <TableHead>Kg/day</TableHead>
                <TableHead>Range</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.cattle_tag || s.cattle_name || s.cattle_id}</TableCell>
                  <TableCell>{s.feed_name}</TableCell>
                  <TableCell>{s.feed_amount_kg} kg</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.start_date} → {s.end_date}</TableCell>
                  <TableCell>
                    <Switch checked={!!s.active} onCheckedChange={(v) => toggleMutation.mutate({ id: s.id, active: v })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Recent Auto-Generated Feed Entries</h3>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {feedRatios.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">No feed entries logged yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Date</TableHead><TableHead>Cattle</TableHead><TableHead>Feed</TableHead><TableHead>Kg</TableHead><TableHead>Cost</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {feedRatios.slice(0, 20).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.date}</TableCell>
                    <TableCell>{f.cattle_tag}</TableCell>
                    <TableCell>{f.feed_name}</TableCell>
                    <TableCell>{f.feed_amount_kg} kg</TableCell>
                    <TableCell>{f.total_cost ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Feeding Schedule</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cattle</Label>
              <Select value={form.cattle_id} onValueChange={(v) => setForm({ ...form, cattle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select cattle" /></SelectTrigger>
                <SelectContent>{cattle.map((c) => <SelectItem key={c.id} value={c.id}>{c.tag_number} {c.name ? `— ${c.name}` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Feed Item</Label>
              <Select value={form.inventory_id} onValueChange={(v) => setForm({ ...form, inventory_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select feed item" /></SelectTrigger>
                <SelectContent>{feedItems.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.total_quantity_kg} kg avail.)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount per day (kg)</Label>
              <Input type="number" step="0.1" value={form.feed_amount_kg} onChange={(e) => setForm({ ...form, feed_amount_kg: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.cattle_id || !form.inventory_id || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Create Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
