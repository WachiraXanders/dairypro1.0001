import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Legend, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

function Trend({ value, suffix = '', invert = false }) {
  const positive = invert ? value < 0 : value > 0;
  const neutral = value === 0;
  if (neutral) return <span className="flex items-center gap-1 text-muted-foreground text-xs"><Minus className="w-3 h-3" /> —</span>;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

export default function KPIReport({ cattle, milkRecords, feedRatios }) {
  const [sortBy, setSortBy] = useState('milk_to_feed');
  const [period, setPeriod] = useState('90');

  const periodDays = parseInt(period);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - periodDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const kpiData = useMemo(() => {
    return cattle
      .filter(c => c.status === 'Active' || c.status === 'Pregnant')
      .map(cow => {
        // --- Milk production ---
        const allMilk = milkRecords.filter(m => m.cattle_id === cow.id);
        const periodMilk = allMilk.filter(m => m.date >= cutoffStr);

        const totalMilkLifetime = allMilk.reduce((s, m) => s + (m.quantity_liters || 0), 0);
        const periodMilkTotal = periodMilk.reduce((s, m) => s + (m.quantity_liters || 0), 0);

        // Days with at least one record in period (avoid divide-by-zero)
        const uniqueDays = [...new Set(periodMilk.map(m => m.date))].length;
        const avgDailyMilk = uniqueDays > 0 ? periodMilkTotal / uniqueDays : 0;

        // --- Feed consumption ---
        const periodFeed = feedRatios.filter(f => f.cattle_id === cow.id && f.date >= cutoffStr);
        const totalFeedKg = periodFeed.reduce((s, f) => s + (f.feed_amount_kg || 0), 0);
        const totalFeedCost = periodFeed.reduce((s, f) => s + (f.total_cost || 0), 0);

        // Milk-to-feed ratio (liters per kg of feed)
        const milkToFeed = totalFeedKg > 0 ? periodMilkTotal / totalFeedKg : null;

        // Feed cost per liter
        const feedCostPerLiter = periodMilkTotal > 0 ? totalFeedCost / periodMilkTotal : null;

        // --- Average daily gain (weight) ---
        // Approximated from weight_kg vs age; without repeated weigh-ins we show current weight/age
        const ageDays = cow.date_of_birth
          ? differenceInDays(new Date(), parseISO(cow.date_of_birth))
          : null;
        const adg = ageDays && ageDays > 0 && cow.weight_kg
          ? cow.weight_kg / ageDays
          : null; // kg/day from birth (proxy)

        // --- Score (composite 0-100) ---
        // Weighted: milk/feed 50%, avg daily milk 30%, adg 20%
        const score = Math.min(100, Math.round(
          (milkToFeed ? Math.min(milkToFeed / 2, 1) * 50 : 0) +
          (avgDailyMilk ? Math.min(avgDailyMilk / 20, 1) * 30 : 0) +
          (adg ? Math.min(adg / 0.8, 1) * 20 : 0)
        ));

        return {
          id: cow.id,
          name: cow.name || `Tag ${cow.tag_number}`,
          tag: cow.tag_number,
          breed: cow.breed,
          status: cow.status,
          avgDailyMilk: parseFloat(avgDailyMilk.toFixed(1)),
          totalMilkLifetime: parseFloat(totalMilkLifetime.toFixed(1)),
          milkToFeed: milkToFeed !== null ? parseFloat(milkToFeed.toFixed(2)) : null,
          totalFeedKg: parseFloat(totalFeedKg.toFixed(1)),
          feedCostPerLiter: feedCostPerLiter !== null ? parseFloat(feedCostPerLiter.toFixed(2)) : null,
          adg: adg !== null ? parseFloat(adg.toFixed(3)) : null,
          score,
        };
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.score - a.score;
        if (sortBy === 'milk_to_feed') return (b.milkToFeed ?? -1) - (a.milkToFeed ?? -1);
        if (sortBy === 'avg_daily') return b.avgDailyMilk - a.avgDailyMilk;
        if (sortBy === 'lifetime') return b.totalMilkLifetime - a.totalMilkLifetime;
        return 0;
      });
  }, [cattle, milkRecords, feedRatios, cutoffStr, sortBy]);

  const topPerformers = kpiData.filter(c => c.score >= 60);
  const needsAttention = kpiData.filter(c => c.score < 30);

  const avgMilkToFeed = useMemo(() => {
    const valid = kpiData.filter(c => c.milkToFeed !== null);
    return valid.length ? valid.reduce((s, c) => s + c.milkToFeed, 0) / valid.length : 0;
  }, [kpiData]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Period</label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Sort by</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Overall Score</SelectItem>
              <SelectItem value="milk_to_feed">Milk-to-Feed Ratio</SelectItem>
              <SelectItem value="avg_daily">Avg Daily Milk</SelectItem>
              <SelectItem value="lifetime">Lifetime Production</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Cattle Analysed</p>
            <p className="text-2xl font-bold text-foreground">{kpiData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Avg Milk-to-Feed Ratio</p>
            <p className="text-2xl font-bold text-emerald-600">{avgMilkToFeed.toFixed(2)} L/kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Award className="w-3 h-3 text-yellow-500" />Top Performers</p>
            <p className="text-2xl font-bold text-yellow-600">{topPerformers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-rose-500" />Needs Attention</p>
            <p className="text-2xl font-bold text-rose-500">{needsAttention.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Milk-to-Feed Ratio (L/kg feed)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={kpiData.slice(0, 15)} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => v !== null ? `${v} L/kg` : 'No data'} />
                <Bar dataKey="milkToFeed" radius={[0, 4, 4, 0]}>
                  {kpiData.slice(0, 15).map((entry, i) => (
                    <Cell key={entry.id} fill={entry.milkToFeed >= avgMilkToFeed ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Avg Daily Milk Production (L/day)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={kpiData.slice(0, 15)} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v) => `${v} L/day`} />
                <Bar dataKey="avgDailyMilk" radius={[0, 4, 4, 0]}>
                  {kpiData.slice(0, 15).map((entry, i) => (
                    <Cell key={entry.id} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lifetime production chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Lifetime Total Production (L)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...kpiData].sort((a, b) => b.totalMilkLifetime - a.totalMilkLifetime).slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v} L`} />
              <Bar dataKey="totalMilkLifetime" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed KPI table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Individual KPI Breakdown</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 pr-4">Rank</th>
                <th className="text-left py-2 pr-4">Animal</th>
                <th className="text-left py-2 pr-4">Breed</th>
                <th className="text-right py-2 pr-4">Score</th>
                <th className="text-right py-2 pr-4">Avg Daily (L)</th>
                <th className="text-right py-2 pr-4">Milk/Feed (L/kg)</th>
                <th className="text-right py-2 pr-4">Feed Cost/L</th>
                <th className="text-right py-2 pr-4">ADG (kg/day)</th>
                <th className="text-right py-2">Lifetime (L)</th>
              </tr>
            </thead>
            <tbody>
              {kpiData.map((cow, i) => (
                <tr key={cow.id} className="border-b last:border-0 hover:bg-muted/60">
                  <td className="py-2.5 pr-4 font-medium text-muted-foreground">#{i + 1}</td>
                  <td className="py-2.5 pr-4">
                    <div className="font-medium text-foreground">{cow.name}</div>
                    <div className="text-xs text-muted-foreground">Tag: {cow.tag}</div>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{cow.breed || '—'}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <Badge className={`text-xs ${
                      cow.score >= 60 ? 'bg-emerald-100 text-emerald-700' :
                      cow.score >= 30 ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {cow.score}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-medium">{cow.avgDailyMilk}</td>
                  <td className="py-2.5 pr-4 text-right">
                    {cow.milkToFeed !== null
                      ? <span className={cow.milkToFeed >= avgMilkToFeed ? 'text-emerald-600 font-medium' : 'text-amber-600'}>{cow.milkToFeed}</span>
                      : <span className="text-muted-foreground/70">—</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-muted-foreground">
                    {cow.feedCostPerLiter !== null ? `Kshs ${cow.feedCostPerLiter}` : <span className="text-muted-foreground/70">—</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-muted-foreground">
                    {cow.adg !== null ? cow.adg : <span className="text-muted-foreground/70">—</span>}
                  </td>
                  <td className="py-2.5 text-right font-medium text-blue-600">{cow.totalMilkLifetime}</td>
                </tr>
              ))}
              {kpiData.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No active cattle found</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
