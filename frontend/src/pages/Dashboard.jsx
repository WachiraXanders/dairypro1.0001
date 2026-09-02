import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Beef, Milk, ListChecks, AlertTriangle, Wallet, Loader2, TrendingUp, TrendingDown,
  Baby, HeartPulse, AlertCircle, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { entities, analytics } from '@/api';
import { useAuth } from '@/lib/AuthContext';
import MilkYieldAlertBanner from '@/components/dashboard/MilkYieldAlertBanner';
import BreedingCalendar from '@/components/shared/BreedingCalendar';
import KpiCard from '@/components/shared/KpiCard';

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const { data: cattle = [] } = useQuery({ queryKey: ['Cattle'], queryFn: () => entities.Cattle.list() });
  const { data: milk = [] } = useQuery({ queryKey: ['MilkProduction'], queryFn: () => entities.MilkProduction.list('-date', 1000) });
  const { data: healthRecords = [] } = useQuery({ queryKey: ['HealthRecord'], queryFn: () => entities.HealthRecord.list('-date', 50) });
  const { data: breedingRecords = [] } = useQuery({ queryKey: ['BreedingRecord'], queryFn: () => entities.BreedingRecord.list('-breeding_date', 100) });
  const { data: transactions = [] } = useQuery({ queryKey: ['Transaction'], queryFn: () => entities.Transaction.list('-date', 500) });
  const { data: milkPrices = [] } = useQuery({ queryKey: ['MilkPrice'], queryFn: () => entities.MilkPrice.list() });

  const { data: tasks = [] } = useQuery({ queryKey: ['Task'], queryFn: () => entities.Task.list() });
  const { data: inventory = [] } = useQuery({ queryKey: ['Inventory'], queryFn: () => entities.Inventory.list() });
  const { data: insights, isLoading: insightsLoading } = useQuery({ queryKey: ['insights'], queryFn: analytics.insights });

  const activeCattle = cattle.filter((c) => c.status === 'Active' || c.status === 'Pregnant' || c.status === 'Dry').length;
  const todayMilk = milk.filter((m) => m.date === today).reduce((s, m) => s + (Number(m.quantity_liters) || 0), 0);
  const pendingTasks = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
  const lowStock = inventory.filter((i) => i.reorder_level && Number(i.total_quantity_kg) <= Number(i.reorder_level)).length;

  const monthlyStats = useMemo(() => {
    const monthMilk = milk.filter((m) => (m.date || '').startsWith(thisMonth));
    const totalMilk = monthMilk.reduce((s, m) => s + (Number(m.quantity_liters) || 0), 0);
    const netMilk = totalMilk - monthMilk.reduce((s, m) => s + (Number(m.milk_used_by_calves) || 0), 0);

    const monthTx = transactions.filter((t) => (t.date || '').startsWith(thisMonth));
    const expenditure = monthTx.filter((t) => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const otherIncome = monthTx.filter((t) => t.type === 'Income' && t.category !== 'Milk Sales').reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const priceRecord = milkPrices.find((p) => p.month === thisMonth);
    const milkSalesIncome = netMilk * (priceRecord?.price_per_liter || 0);
    const totalIncome = milkSalesIncome + otherIncome;
    const profit = totalIncome - expenditure;

    return { totalMilk, netMilk, expenditure, totalIncome, profit };
  }, [milk, transactions, milkPrices, thisMonth]);

  const productionChartData = useMemo(() => {
    const byDate = {};
    milk.filter((m) => (m.date || '').startsWith(thisMonth)).forEach((m) => {
      byDate[m.date] = (byDate[m.date] || 0) + (Number(m.quantity_liters) || 0);
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, liters]) => ({ date: date.slice(8), liters: +liters.toFixed(1) }));
  }, [milk, thisMonth]);

  const perCowProduction = useMemo(() => {
    const monthMilk = milk.filter((m) => (m.date || '').startsWith(thisMonth));
    return cattle
      .filter((c) => c.status === 'Active' || c.status === 'Pregnant')
      .map((cow) => {
        const cowMilk = monthMilk.filter((m) => m.cattle_tag === cow.tag_number);
        const total = cowMilk.reduce((s, m) => s + (Number(m.quantity_liters) || 0), 0);
        const net = total - cowMilk.reduce((s, m) => s + (Number(m.milk_used_by_calves) || 0), 0);
        return { ...cow, total: +total.toFixed(1), net: +net.toFixed(1) };
      })
      .sort((a, b) => b.total - a.total);
  }, [cattle, milk, thisMonth]);

  const upcomingEvents = useMemo(() => {
    const events = [];
    breedingRecords.forEach((b) => {
      if (b.expected_calving_date && b.pregnancy_status === 'Confirmed' && b.calving_outcome === 'Pending' && b.expected_calving_date >= today) {
        events.push({ date: b.expected_calving_date, type: 'calving', label: `Expected calving — ${b.cattle_tag}` });
      }
    });
    healthRecords.forEach((h) => {
      if (h.follow_up_date && h.status !== 'Resolved' && h.follow_up_date >= today) {
        events.push({ date: h.follow_up_date, type: 'health', label: `Follow-up — ${h.cattle_tag}${h.diagnosis ? `: ${h.diagnosis}` : ''}` });
      }
    });
    return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [breedingRecords, healthRecords, today]);

  const recentActivity = useMemo(() => {
    const items = [
      ...milk.slice(0, 3).map((m) => ({ date: m.date, label: `Milk: ${m.quantity_liters}L — ${m.cattle_tag} (${m.session})`, icon: Milk })),
      ...healthRecords.slice(0, 2).map((h) => ({ date: h.date, label: `Health: ${h.record_type} — ${h.cattle_tag}`, icon: HeartPulse })),
    ];
    return items.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
  }, [milk, healthRecords]);

  const alerts = useMemo(() => {
    const list = [];
    breedingRecords.forEach((b) => {
      if (b.expected_calving_date && b.pregnancy_status === 'Confirmed' && b.calving_outcome === 'Pending') {
        const daysUntil = Math.ceil((new Date(b.expected_calving_date) - new Date(today)) / 86400000);
        if (daysUntil >= 0 && daysUntil <= 30) {
          list.push({ type: 'pregnancy', message: `${b.cattle_tag}: expected calving in ${daysUntil} day${daysUntil === 1 ? '' : 's'}` });
        }
      }
    });
    if (monthlyStats.profit < 0) {
      list.push({ type: 'loss', message: `This month is currently running at a loss (${monthlyStats.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}).` });
    }
    return list;
  }, [breedingRecords, monthlyStats.profit, today]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {timeGreeting()}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening across your farm today.</p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${
                a.type === 'loss' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-primary/10 border-primary/20 text-primary'
              }`}
            >
              {a.type === 'loss' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Baby className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      <MilkYieldAlertBanner milkRecords={milk} cattle={cattle} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Cattle" value={activeCattle} icon={Beef} tone="emerald" />
        <KpiCard label="Today's Milk" value={`${todayMilk.toFixed(1)} L`} icon={Milk} tone="blue" />
        <KpiCard label="Pending Tasks" value={pendingTasks} icon={ListChecks} tone="gold" />
        <KpiCard label="Low Stock Items" value={lowStock} icon={AlertTriangle} tone="rose" />
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">This Month</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Total Milk" value={`${monthlyStats.totalMilk.toLocaleString(undefined, { maximumFractionDigits: 0 })} L`} icon={Milk} tone="blue" />
          <KpiCard label="Net Milk" value={`${monthlyStats.netMilk.toLocaleString(undefined, { maximumFractionDigits: 0 })} L`} icon={Milk} tone="blue" />
          <KpiCard label="Income" value={monthlyStats.totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })} icon={TrendingUp} tone="emerald" />
          <KpiCard label="Expenditure" value={monthlyStats.expenditure.toLocaleString(undefined, { maximumFractionDigits: 0 })} icon={TrendingDown} tone="rose" />
          <KpiCard label="Profit" value={monthlyStats.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })} icon={Wallet} tone={monthlyStats.profit >= 0 ? 'gold' : 'rose'} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Milk Production This Month</CardTitle></CardHeader>
          <CardContent>
            {productionChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No milk records this month yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productionChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(v) => `${v}L`}
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--popover-foreground))' }}
                    />
                    <Bar dataKey="liters" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              recentActivity.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-foreground/90">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Per-Cow Production This Month</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {perCowProduction.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active milking cattle yet.</p>
            ) : (
              perCowProduction.map((cow) => (
                <div key={cow.id} className="flex items-center justify-between text-sm border-b border-border/60 last:border-0 pb-2 last:pb-0">
                  <span>{cow.tag_number} {cow.name ? `— ${cow.name}` : ''}</span>
                  <span className="font-medium">{cow.total}L <span className="text-muted-foreground font-normal">({cow.net}L net)</span></span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Upcoming Events</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing coming up in the next few weeks.</p>
            ) : (
              upcomingEvents.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-border/60 last:border-0 pb-2 last:pb-0">
                  <span className="flex items-center gap-1.5">
                    {e.type === 'calving' ? <Baby className="w-3.5 h-3.5 text-gold" /> : <HeartPulse className="w-3.5 h-3.5 text-destructive" />}
                    {e.label}
                  </span>
                  <span className="text-muted-foreground">{e.date}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Quick Insights</CardTitle></CardHeader>
        <CardContent>
          {insightsLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground/90">{insights?.summary}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">Milk trend: {insights?.milk_forecast?.trend}</Badge>
                <Badge variant="outline">{insights?.health_risk?.high_risk_count} high health risk</Badge>
                <Badge variant="outline">{insights?.breeding?.recommendations?.length || 0} breeding follow-ups</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Breeding Calendar</h2>
        <BreedingCalendar breedingRecords={breedingRecords} cattle={cattle} />
      </div>
    </div>
  );
}
