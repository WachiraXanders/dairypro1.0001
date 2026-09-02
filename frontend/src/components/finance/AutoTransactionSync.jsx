import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

/** Guesses an expense category from an inventory item's name. */
function categorizeInventoryItem(itemName = '') {
  const name = itemName.toLowerCase();
  if (name.includes('feed')) return 'Feed';
  if (name.includes('medicine') || name.includes('vaccine') || name.includes('drug')) return 'Medicine';
  return 'Other';
}

export default function AutoTransactionSync() {
  const queryClient = useQueryClient();

  const { data: stockAdjustments = [] } = useQuery({
    queryKey: ['stockAdjustments'],
    queryFn: () => entities.StockAdjustment.list('-date', 1000),
  });
  const { data: healthRecords = [] } = useQuery({
    queryKey: ['HealthRecord'],
    queryFn: () => entities.HealthRecord.list('-date', 1000),
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ['Transaction'],
    queryFn: () => entities.Transaction.list('-date', 5000),
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => entities.Transaction.create(data),
  });

  const pending = useMemo(() => {
    const existingRefs = new Set(transactions.map((t) => t.reference).filter(Boolean));

    const inventoryPurchases = stockAdjustments.filter(
      (r) => r.adjustment_type === 'Purchase' && r.cost && r.cost > 0
    );
    const pendingInventory = inventoryPurchases.filter((p) => {
      if (existingRefs.has(`INV-${p.id}`)) return false;
      // Secondary guard: same date + amount already recorded manually
      return !transactions.some((t) => t.date === p.date && Math.abs((t.amount || 0) - p.cost) < 0.01);
    });

    const healthWithCosts = healthRecords.filter((h) => h.cost && h.cost > 0);
    const pendingHealth = healthWithCosts.filter((h) => {
      if (existingRefs.has(`HEALTH-${h.id}`)) return false;
      return !transactions.some((t) => t.date === h.date && Math.abs((t.amount || 0) - h.cost) < 0.01);
    });

    return { pendingInventory, pendingHealth };
  }, [stockAdjustments, healthRecords, transactions]);

  const totalPending = pending.pendingInventory.length + pending.pendingHealth.length;

  const syncCosts = async () => {
    try {
      for (const purchase of pending.pendingInventory) {
        await createTransactionMutation.mutateAsync({
          type: 'Expense',
          category: categorizeInventoryItem(purchase.item_name),
          amount: purchase.cost,
          date: purchase.date,
          description: `${purchase.item_name || 'Inventory'} - ${purchase.quantity_change ?? ''} ${purchase.reason || ''}`.trim(),
          reference: `INV-${purchase.id}`,
          payment_method: 'Cash',
        });
      }
      for (const health of pending.pendingHealth) {
        await createTransactionMutation.mutateAsync({
          type: 'Expense',
          category: health.record_type === 'Treatment' || health.record_type === 'Surgery' ? 'Veterinary' : 'Medicine',
          amount: health.cost,
          date: health.date,
          description: `${health.record_type || 'Health'}${health.diagnosis ? ` - ${health.diagnosis}` : ''} (${health.cattle_tag || ''})`,
          reference: `HEALTH-${health.id}`,
          payment_method: 'Cash',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['Transaction'] });
      toast.success(totalPending > 0 ? `Synced ${totalPending} cost record(s) to the ledger` : 'Nothing to sync');
    } catch {
      toast.error('Some records failed to sync — try again');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Auto-Sync Costs to Ledger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Converts inventory purchase costs (from Stock Adjustments) and health treatment costs into expense
          transactions automatically, so you don't have to enter them twice. Each synced record is tagged with a
          reference (<code className="text-xs">INV-…</code> / <code className="text-xs">HEALTH-…</code>) so re-running
          this never creates duplicates.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={syncCosts} disabled={createTransactionMutation.isPending || totalPending === 0}>
            {createTransactionMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1.5" />
            )}
            Sync Costs Now
          </Button>
          {totalPending === 0 ? (
            <span className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Ledger is up to date</span>
          ) : (
            <span className="text-sm text-amber-600">{totalPending} cost record(s) not yet in the ledger</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
