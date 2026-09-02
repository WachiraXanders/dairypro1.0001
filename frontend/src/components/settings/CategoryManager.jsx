import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Package, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

const CONTEXTS = [
  {
    key: 'inventory',
    label: 'Inventory Categories',
    description: 'Used when adding inventory items',
    icon: Package,
    color: 'emerald',
    defaults: ['Feed', 'Medicine', 'Supplement', 'Equipment', 'Supplies', 'Other'],
  },
  {
    key: 'finance_income',
    label: 'Finance — Income Categories',
    description: 'Used when recording income transactions',
    icon: TrendingUp,
    color: 'blue',
    defaults: ['Milk Sales', 'Cattle Sales', 'Other'],
  },
  {
    key: 'finance_expense',
    label: 'Finance — Expense Categories',
    description: 'Used when recording expense transactions',
    icon: TrendingDown,
    color: 'rose',
    defaults: ['Feed', 'Medicine', 'Veterinary', 'Labor', 'Equipment', 'Utilities', 'Transportation', 'Other'],
  },
];

const colorMap = {
  emerald: { badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700', icon: 'bg-emerald-100 text-emerald-600' },
  blue: { badge: 'bg-blue-100 text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700', icon: 'bg-blue-100 text-blue-600' },
  rose: { badge: 'bg-rose-100 text-rose-700', btn: 'bg-rose-600 hover:bg-rose-700', icon: 'bg-rose-100 text-rose-600' },
};

function ContextPanel({ ctx, allRecords, onAdd, onDelete, isAdding, isDeleting }) {
  const [newName, setNewName] = useState('');
  const colors = colorMap[ctx.color];
  const Icon = ctx.icon;

  const records = allRecords.filter(r => r.context === ctx.key);
  // Merge defaults + custom, deduplicate by name
  const customNames = records.map(r => r.name);
  const defaultItems = ctx.defaults.map(name => ({ name, isDefault: true, id: null }));
  const customItems = records.map(r => ({ name: r.name, isDefault: r.is_default, id: r.id }));
  // Show defaults first, then custom ones not already in defaults
  const allItems = [
    ...defaultItems,
    ...customItems.filter(c => !ctx.defaults.includes(c.name)),
  ];

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (allItems.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    onAdd({ context: ctx.key, name: trimmed, is_default: false });
    setNewName('');
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colors.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{ctx.label}</h3>
          <p className="text-sm text-muted-foreground">{ctx.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 min-h-[2.5rem]">
        {allItems.map((item) => (
          <div key={item.name} className="flex items-center gap-1">
            <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-medium", colors.badge)}>
              {item.name}
            </span>
            {!item.isDefault && item.id && (
              <button
                onClick={() => onDelete(item.id)}
                disabled={isDeleting}
                className="text-muted-foreground hover:text-rose-500 transition-colors"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder="Add new category..."
          className="flex-1"
        />
        <Button
          onClick={handleAdd}
          disabled={!newName.trim() || isAdding}
          className={cn("gap-1", colors.btn)}
        >
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Default categories (shown without ✕) cannot be removed. Custom ones can be deleted.</p>
    </div>
  );
}

export default function CategoryManager() {
  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ['categorySettings'],
    queryFn: () => entities.CategorySettings.list(),
  });

  const addMutation = useMutation({
    mutationFn: (data) => entities.CategorySettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorySettings'] });
      toast.success('Category added');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.CategorySettings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorySettings'] });
      toast.success('Category removed');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Category Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the category options available in Inventory and Finance forms. Default categories are always available; you can add your own custom ones.
        </p>
      </div>
      {CONTEXTS.map(ctx => (
        <ContextPanel
          key={ctx.key}
          ctx={ctx}
          allRecords={records}
          onAdd={(data) => addMutation.mutate(data)}
          onDelete={(id) => deleteMutation.mutate(id)}
          isAdding={addMutation.isPending}
          isDeleting={deleteMutation.isPending}
        />
      ))}
    </div>
  );
}
