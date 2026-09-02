import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Milk, Plus, DollarSign, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { entities } from '@/api';
import MilkEntryForm from '@/components/milk/MilkEntryForm';
import MilkPriceDialog from '@/components/milk/MilkPriceDialog';
import PageHeader from '@/components/shared/PageHeader';
import KpiCard from '@/components/shared/KpiCard';
import EmptyState from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/LoadingSkeleton';

export default function MilkProduction() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['MilkProduction'],
    queryFn: () => entities.MilkProduction.list('-date', 500),
  });
  const { data: cattle = [] } = useQuery({ queryKey: ['Cattle'], queryFn: () => entities.Cattle.list() });
  const { data: milkPrices = [] } = useQuery({ queryKey: ['MilkPrice'], queryFn: () => entities.MilkPrice.list('-month', 12) });

  const currentMonthPrice = milkPrices.find((p) => p.month === thisMonth);

  // Creates the MilkProduction record, then — if a price is on file for that
  // month — an Income transaction using NET liters (quantity minus
  // calf-used). This must stay in one place and match what Finance/Dashboard
  // use for their own recomputation, or the numbers drift apart.
  const createRecordWithTransaction = async (record) => {
    const created = await entities.MilkProduction.create(record);
    const month = record.date.slice(0, 7);
    const priceRecord = milkPrices.find((p) => p.month === month);
    if (priceRecord?.price_per_liter) {
      const netLiters = (Number(record.quantity_liters) || 0) - (Number(record.milk_used_by_calves) || 0);
      if (netLiters > 0) {
        await entities.Transaction.create({
          type: 'Income',
          category: 'Milk Sales',
          amount: +(netLiters * priceRecord.price_per_liter).toFixed(2),
          date: record.date,
          description: `Milk sale — ${netLiters.toFixed(1)}L net @ ${priceRecord.price_per_liter}/L (${record.cattle_tag || 'herd'}, ${record.session})`,
          reference: `MILK-${created.id}`,
          payment_method: 'Cash',
        });
      }
    }
    return created;
  };

  const createMutation = useMutation({
    mutationFn: async (records) => {
      // MilkEntryForm submits an array (all sessions logged at once) when
      // creating, or a single object when editing one session.
      const list = Array.isArray(records) ? records : [records];
      for (const record of list) {
        await createRecordWithTransaction(record);
      }
      return list.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['MilkProduction'] });
      queryClient.invalidateQueries({ queryKey: ['Transaction'] });
      setFormOpen(false);
      toast.success(`Logged ${count} session${count === 1 ? '' : 's'}`);
    },
    onError: () => toast.error('Failed to save milk entry'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.MilkProduction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['MilkProduction'] });
      setFormOpen(false);
      setEditing(null);
      toast.success('Entry updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.MilkProduction.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['MilkProduction'] }); setDeleteTarget(null); toast.success('Entry deleted'); },
  });

  const handleSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const todayRows = useMemo(() => rows.filter((r) => r.date === today), [rows, today]);
  const todayTotal = useMemo(() => todayRows.reduce((s, r) => s + (Number(r.quantity_liters) || 0), 0), [todayRows]);
  const todayNet = useMemo(
    () => todayRows.reduce((s, r) => s + (Number(r.quantity_liters) || 0) - (Number(r.milk_used_by_calves) || 0), 0),
    [todayRows]
  );

  // Daily totals aggregated per cow per day — top 20 most recent day/cow combos.
  const dailyTotals = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const key = `${r.date}|${r.cattle_tag}`;
      if (!map[key]) map[key] = { date: r.date, cattle_tag: r.cattle_tag, sessions: 0, total: 0, net: 0 };
      map[key].sessions += 1;
      map[key].total += Number(r.quantity_liters) || 0;
      map[key].net += (Number(r.quantity_liters) || 0) - (Number(r.milk_used_by_calves) || 0);
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [rows]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Milk Production"
        subtitle="Log milking sessions and track daily yield."
        icon={Milk}
        actions={
          <>
            <Button variant="outline" onClick={() => setPriceDialogOpen(true)}>
              <DollarSign className="w-4 h-4 mr-1.5" /> Set Price
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-1.5" /> Log Milk
            </Button>
          </>
        }
      />

      {!currentMonthPrice && (
        <div className="flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold text-sm rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-foreground/90">
            No milk price set for {thisMonth} — milk sales won't be added to the ledger, and income shown across the
            app for this month will be understated until you set one.
          </span>
          <Button size="sm" variant="outline" className="ml-auto h-7 shrink-0" onClick={() => setPriceDialogOpen(true)}>Set Price</Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl">
        <KpiCard label="Today's Total" value={`${todayTotal.toFixed(1)} L`} icon={Milk} tone="blue" />
        <KpiCard label="Today's Net" value={`${todayNet.toFixed(1)} L`} icon={Milk} tone="emerald" />
        <KpiCard label="This Month's Price" value={currentMonthPrice ? currentMonthPrice.price_per_liter : '—'} icon={DollarSign} tone="gold" />
      </div>

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="daily">Daily Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="pt-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              {isLoading ? (
                <TableSkeleton columns={7} />
              ) : rows.length === 0 ? (
                <EmptyState
                  icon={Milk}
                  title="No milk records yet"
                  description="Log your first milking session to start tracking daily yield."
                  actionLabel="Log Milk"
                  onAction={() => { setEditing(null); setFormOpen(true); }}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Cattle</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Liters</TableHead>
                        <TableHead>Calf Used</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.date}</TableCell>
                          <TableCell>{r.cattle_tag}</TableCell>
                          <TableCell>{r.session}</TableCell>
                          <TableCell>{r.quantity_liters}</TableCell>
                          <TableCell>{r.milk_used_by_calves || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{r.quality_grade}</Badge></TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="pt-4">
          <Card>
            <CardContent className="p-0">
              {dailyTotals.length === 0 ? (
                <p className="text-center py-16 text-muted-foreground text-sm">No milk records yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Date</TableHead><TableHead>Cattle</TableHead><TableHead>Sessions</TableHead><TableHead>Total (L)</TableHead><TableHead>Net (L)</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyTotals.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell>{d.date}</TableCell>
                        <TableCell>{d.cattle_tag}</TableCell>
                        <TableCell>{d.sessions}</TableCell>
                        <TableCell className="font-medium">{d.total.toFixed(1)}</TableCell>
                        <TableCell className="text-emerald-600">{d.net.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MilkEntryForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        record={editing}
        cattle={cattle}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <MilkPriceDialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the milk record only — any auto-created sales transaction for it will stay in the Finance
              ledger unless you remove it there too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteTarget.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
