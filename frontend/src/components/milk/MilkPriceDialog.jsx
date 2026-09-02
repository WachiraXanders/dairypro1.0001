import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';

export default function MilkPriceDialog({ open, onOpenChange }) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [price, setPrice] = useState('');

  const queryClient = useQueryClient();

  const { data: prices = [] } = useQuery({
    queryKey: ['milkPrices'],
    queryFn: () => entities.MilkPrice.list('-month', 24),
  });

  // Generate last 24 months + current month for selection (newest first)
  const monthOptions = React.useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const m = subMonths(now, i);
      opts.push({
        value: format(m, 'yyyy-MM'),
        label: format(m, 'MMMM yyyy'),
      });
    }
    return opts;
  }, []);

  const selectedPrice = prices.find(p => p.month === selectedMonth);

  useEffect(() => {
    if (selectedPrice) {
      setPrice(selectedPrice.price_per_liter?.toString() || '');
    } else {
      setPrice('');
    }
  }, [selectedMonth, selectedPrice]);

  const createMutation = useMutation({
    mutationFn: (data) => entities.MilkPrice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milkPrices'] });
      toast.success(`Milk price set for ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`);
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.MilkPrice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milkPrices'] });
      toast.success(`Milk price updated for ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`);
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      month: selectedMonth,
      price_per_liter: parseFloat(price),
    };

    if (selectedPrice) {
      updateMutation.mutate({ id: selectedPrice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Milk Price</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="month">Month *</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger id="month">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}{prices.find(p => p.month === m.value) ? ' ✓' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price per Liter (Kshs) *</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 45.00"
              required
            />
            <p className="text-xs text-muted-foreground">This price will apply to all milk production recorded in the selected month</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending} 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedPrice ? 'Update Price' : 'Set Price'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

