import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/api';
import { format } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Leaf, Users, TrendingDown } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ConsumptionHistoryTab({ inventory = [] }) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['consumptionRecords'],
    queryFn: () => entities.ConsumptionRecord.list('-date', 200),
  });

  const groups = useMemo(() => {
    const seen = new Set();
    return records
      .filter(r => r.group_name && !seen.has(r.group_name) && seen.add(r.group_name))
      .map(r => r.group_name);
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchSearch = !search || r.item_name?.toLowerCase().includes(search.toLowerCase()) || r.group_name?.toLowerCase().includes(search.toLowerCase());
      const matchGroup = groupFilter === 'all' || r.group_name === groupFilter;
      return matchSearch && matchGroup;
    });
  }, [records, search, groupFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const thisMonth = records.filter(r => r.date?.startsWith(format(new Date(), 'yyyy-MM')));
    return {
      totalKg: thisMonth.reduce((s, r) => s + (r.quantity_kg || 0), 0),
      totalCost: thisMonth.reduce((s, r) => s + (r.total_cost || 0), 0),
      entries: thisMonth.length,
    };
  }, [records]);

  return (
    <div className="space-y-4">
      {/* Monthly summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">This Month – Total Consumed</p>
          <p className="text-xl font-bold text-foreground">{stats.totalKg.toFixed(1)} kg</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">This Month – Feed Cost</p>
          <p className="text-xl font-bold text-emerald-600">Kshs {stats.totalCost.toFixed(0)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Log Entries</p>
          <p className="text-xl font-bold text-foreground">{stats.entries}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by item or group..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Leaf className="w-10 h-10 mx-auto text-muted-foreground/70 mb-3" />
            <p className="text-muted-foreground font-medium">No consumption records yet</p>
            <p className="text-xs text-muted-foreground mt-1">Use "Log Consumption" to record feed usage</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Date</TableHead>
                <TableHead>Feed Item</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Qty (kg)</TableHead>
                <TableHead>Head Count</TableHead>
                <TableHead>kg/Head</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Stock After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/60">
                  <TableCell className="font-medium text-sm">
                    {r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-sm font-medium text-foreground">{r.item_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.group_name ? (
                      <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                        <Users className="w-3 h-3 mr-1" />
                        {r.group_name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-foreground">{r.quantity_kg}</span> kg
                  </TableCell>
                  <TableCell className="text-sm">{r.head_count || '—'}</TableCell>
                  <TableCell className="text-sm">{r.kg_per_head ? `${r.kg_per_head} kg` : '—'}</TableCell>
                  <TableCell>
                    {r.total_cost ? (
                      <span className="text-sm text-emerald-700 font-medium">Kshs {r.total_cost.toFixed(2)}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {r.stock_after_kg !== undefined && r.stock_after_kg !== null ? (
                      <span className={cn(
                        "text-sm font-medium",
                        r.stock_after_kg <= 0 ? 'text-rose-600' : r.stock_after_kg < 50 ? 'text-amber-600' : 'text-muted-foreground'
                      )}>
                        {r.stock_after_kg} kg
                      </span>
                    ) : '—'}
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
