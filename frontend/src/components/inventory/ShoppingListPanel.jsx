import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities, integrations } from '@/api';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Zap, CheckCircle2, Package, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

const PRIORITY_STYLES = {
  Critical: 'bg-rose-100 text-rose-700 border-rose-200',
  High: 'bg-amber-100 text-amber-700 border-amber-200',
  Medium: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_STYLES = {
  Pending: 'bg-muted text-foreground/90',
  Ordered: 'bg-purple-100 text-purple-700',
  Received: 'bg-emerald-100 text-emerald-700',
  Dismissed: 'bg-gray-100 text-gray-500',
};

export default function ShoppingListPanel({ inventory = [] }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('active');

  const { data: shoppingList = [], isLoading } = useQuery({
    queryKey: ['shoppingList'],
    queryFn: () => entities.ShoppingList.list('-created_date', 200),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => entities.Settings.list(),
  });

  // Auto-generate shopping items for low-stock feed items not already pending
  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      const lowStockFeed = inventory.filter(
        item => item.category === 'Feed' && item.total_quantity_kg <= item.reorder_level
      );
      const pendingIds = shoppingList
        .filter(s => s.status === 'Pending')
        .map(s => s.inventory_id);

      const toCreate = lowStockFeed.filter(item => !pendingIds.includes(item.id));

      if (toCreate.length === 0) return { count: 0, criticalItems: [] };

      const created = await Promise.all(toCreate.map(item => {
        const deficit = item.reorder_level - item.total_quantity_kg;
        const suggested = Math.max(deficit * 2, item.reorder_level);
        const stockRatio = item.total_quantity_kg / item.reorder_level;
        const priority = stockRatio <= 0.25 ? 'Critical' : stockRatio <= 0.5 ? 'High' : 'Medium';
        const estimatedCost = item.cost_per_kg ? Math.round(suggested * item.cost_per_kg) : null;

        return entities.ShoppingList.create({
          inventory_id: item.id,
          item_name: item.name,
          category: item.category,
          current_stock_kg: item.total_quantity_kg,
          reorder_level_kg: item.reorder_level,
          suggested_quantity_kg: Math.round(suggested),
          estimated_cost: estimatedCost,
          supplier: item.supplier || '',
          priority,
          status: 'Pending',
          auto_generated: true,
        }).then(() => ({ ...item, priority, estimatedCost, suggested: Math.round(suggested) }));
      }));

      // Send email alerts for Critical items
      const managerEmail = settings[0]?.email;
      const farmName = settings[0]?.farm_name || 'Your Farm';
      const criticalItems = created.filter(i => i.priority === 'Critical');

      if (managerEmail && criticalItems.length > 0) {
        await Promise.all(criticalItems.map(item => {
          const costLine = item.estimatedCost
            ? `\n• Estimated Cost: Kshs ${item.estimatedCost.toLocaleString()}`
            : '';
          const supplierLine = item.supplier
            ? `\n• Supplier Contact: ${item.supplier}`
            : '\n• Supplier: Not on record';

          return integrations.sendEmail(
            managerEmail,
            `🚨 Critical Stock Alert: ${item.name} — ${farmName}`,
            `Dear Farm Manager,

A CRITICAL low-stock alert has been automatically generated for the following feed item:

━━━━━━━━━━━━━━━━━━━━━━━━
ITEM DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━
• Item Name: ${item.name}
• Current Stock: ${item.total_quantity_kg} kg
• Reorder Level: ${item.reorder_level} kg
• Suggested Order: ${item.suggested} kg${costLine}${supplierLine}

━━━━━━━━━━━━━━━━━━━━━━━━
ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━
Stock is at or below 25% of the reorder threshold. Please place an order immediately to avoid feed shortages.

This item has been added to your Shopping List in DairyPro. Log in to update its status once ordered.

— DairyPro Automated Alert System`
          );
        }));
      }

      return { count: toCreate.length, criticalItems };
    },
    onSuccess: ({ count, criticalItems }) => {
      queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
      if (count === 0) {
        toast.success('All low-stock items already in shopping list');
      } else {
        toast.success(`${count} shopping item${count > 1 ? 's' : ''} generated`);
        if (criticalItems.length > 0 && settings[0]?.email) {
          toast.warning(`📧 Critical alert email sent for: ${criticalItems.map(i => i.name).join(', ')}`);
        } else if (criticalItems.length > 0 && !settings[0]?.email) {
          toast.warning('Critical items found — add a manager email in Settings to receive alerts');
        }
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => entities.ShoppingList.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingList'] });
      toast.success('Status updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.ShoppingList.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shoppingList'] }),
  });

  const filteredList = useMemo(() => {
    if (statusFilter === 'active') {
      return shoppingList.filter(s => s.status === 'Pending' || s.status === 'Ordered');
    }
    if (statusFilter === 'all') return shoppingList;
    return shoppingList.filter(s => s.status === statusFilter);
  }, [shoppingList, statusFilter]);

  const summary = useMemo(() => {
    const pending = shoppingList.filter(s => s.status === 'Pending').length;
    const ordered = shoppingList.filter(s => s.status === 'Ordered').length;
    const totalEstimate = shoppingList
      .filter(s => s.status === 'Pending' || s.status === 'Ordered')
      .reduce((sum, s) => sum + (s.estimated_cost || 0), 0);
    return { pending, ordered, totalEstimate };
  }, [shoppingList]);

  const lowStockFeedCount = inventory.filter(
    i => i.category === 'Feed' && i.total_quantity_kg <= i.reorder_level
  ).length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{summary.ordered}</p>
              <p className="text-xs text-muted-foreground">Ordered</p>
            </div>
            {summary.totalEstimate > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  Kshs {summary.totalEstimate.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Est. Total</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lowStockFeedCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lowStockFeedCount} low-stock feed item{lowStockFeedCount > 1 ? 's' : ''}
            </div>
          )}
          <Button
            onClick={() => autoGenerateMutation.mutate()}
            disabled={autoGenerateMutation.isPending || lowStockFeedCount === 0}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Zap className="w-4 h-4 mr-1.5" />
            {autoGenerateMutation.isPending ? 'Generating...' : 'Auto-Generate'}
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active Items</SelectItem>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Ordered">Ordered</SelectItem>
            <SelectItem value="Received">Received</SelectItem>
            <SelectItem value="Dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/70 mb-3" />
            <p className="text-muted-foreground font-medium">No shopping items</p>
            <p className="text-xs text-muted-foreground mt-1">
              {lowStockFeedCount > 0
                ? 'Click "Auto-Generate" to add low-stock feed items'
                : 'All feed stocks are above reorder levels'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Item</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Stock / Reorder</TableHead>
                <TableHead>Suggested Qty</TableHead>
                <TableHead>Est. Cost</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((item) => (
                <TableRow key={item.id} className={cn(
                  "hover:bg-muted/60",
                  item.status === 'Dismissed' && "opacity-50"
                )}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-xs', PRIORITY_STYLES[item.priority])}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-semibold text-rose-600">{item.current_stock_kg} kg</p>
                    <p className="text-xs text-muted-foreground">min: {item.reorder_level_kg} kg</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{item.suggested_quantity_kg} kg</p>
                  </TableCell>
                  <TableCell>
                    {item.estimated_cost
                      ? <p className="text-sm text-emerald-700 font-medium">Kshs {item.estimated_cost?.toLocaleString()}</p>
                      : <p className="text-xs text-muted-foreground">—</p>}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground">{item.supplier || '—'}</p>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.status}
                      onValueChange={(val) => updateStatusMutation.mutate({ id: item.id, status: val })}
                    >
                      <SelectTrigger className={cn('h-7 text-xs w-28 border-0', STATUS_STYLES[item.status])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Ordered">Ordered</SelectItem>
                        <SelectItem value="Received">Received</SelectItem>
                        <SelectItem value="Dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
