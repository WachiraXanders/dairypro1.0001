import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Milk, AlertCircle, Info } from 'lucide-react';
import {
  ComposedChart, Line, Bar, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { generateForecast, getHistoricalMonthlySummary } from '@/lib/forecastEngine';
import { cn } from '@/lib/utils';

const fmt = (n) => `Kshs ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const SCENARIOS = [
  { id: 'base', label: 'Base Case', color: '#10b981', description: 'Trend continuation' },
  { id: 'bull', label: 'Optimistic', color: '#3b82f6', description: '+20% milk price, +10% herd' },
  { id: 'bear', label: 'Pessimistic', color: '#ef4444', description: '-20% milk price, +5% expenses/mo' },
  { id: 'custom', label: 'Custom', color: '#8b5cf6', description: 'Your parameters' },
];

export default function FinancialForecast({ transactions, milkRecords, milkPrices, cattle }) {
  const [forecastMonths, setForecastMonths] = useState('6');
  const [lookback, setLookback] = useState('6');
  const [activeScenario, setActiveScenario] = useState('base');

  // Custom scenario params
  const [customMilkPrice, setCustomMilkPrice] = useState('');
  const [customHerdMult, setCustomHerdMult] = useState('1');
  const [customExpGrowth, setCustomExpGrowth] = useState('0');

  const latestMilkPrice = useMemo(() => {
    const sorted = [...milkPrices].sort((a, b) => b.month.localeCompare(a.month));
    return sorted[0]?.price_per_liter || 0;
  }, [milkPrices]);

  const historical = useMemo(() =>
    getHistoricalMonthlySummary(transactions, milkRecords, milkPrices, parseInt(lookback)),
    [transactions, milkRecords, milkPrices, lookback]
  );

  const fMonths = Math.max(1, Math.min(12, parseInt(forecastMonths) || 6));
  const lMonths = Math.max(3, Math.min(24, parseInt(lookback) || 6));

  const scenarioParams = useMemo(() => ({
    base: { scenarioMilkPrice: null, scenarioHerdMultiplier: 1, scenarioExpenseGrowth: 0 },
    bull: { scenarioMilkPrice: latestMilkPrice * 1.2, scenarioHerdMultiplier: 1.1, scenarioExpenseGrowth: 0 },
    bear: { scenarioMilkPrice: latestMilkPrice * 0.8, scenarioHerdMultiplier: 1, scenarioExpenseGrowth: 0.05 },
    custom: {
      scenarioMilkPrice: customMilkPrice !== '' ? parseFloat(customMilkPrice) : null,
      scenarioHerdMultiplier: parseFloat(customHerdMult) || 1,
      scenarioExpenseGrowth: parseFloat(customExpGrowth) / 100 || 0,
    },
  }), [latestMilkPrice, customMilkPrice, customHerdMult, customExpGrowth]);

  // Generate all 4 scenario forecasts
  const forecasts = useMemo(() => {
    const common = { milkRecords, transactions, milkPrices, forecastMonths: fMonths, lookbackMonths: lMonths };
    return Object.fromEntries(
      SCENARIOS.map(s => [s.id, generateForecast({ ...common, ...scenarioParams[s.id] })])
    );
  }, [milkRecords, transactions, milkPrices, fMonths, lMonths, scenarioParams]);

  const activeForecast = forecasts[activeScenario];

  // Combined historical + forecast for chart
  const chartData = useMemo(() => {
    const hist = historical.map(h => ({ ...h, type: 'historical' }));
    const fore = activeForecast.map(f => ({
      month: f.month,
      forecastIncome: f.forecastedIncome,
      forecastExpenses: f.forecastedExpenses,
      forecastProfit: f.forecastedProfit,
      type: 'forecast',
    }));
    return [...hist, ...fore];
  }, [historical, activeForecast]);

  // Scenario comparison table (totals)
  const scenarioTotals = useMemo(() =>
    SCENARIOS.map(s => {
      const fc = forecasts[s.id];
      const totalIncome = fc.reduce((a, b) => a + b.forecastedIncome, 0);
      const totalExpenses = fc.reduce((a, b) => a + b.forecastedExpenses, 0);
      const totalProfit = totalIncome - totalExpenses;
      return { ...s, totalIncome, totalExpenses, totalProfit };
    }),
    [forecasts]
  );

  const currentScenario = SCENARIOS.find(s => s.id === activeScenario);

  return (
    <div className="space-y-6">
      {/* Config bar */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Forecast Period</label>
              <Select value={forecastMonths} onValueChange={setForecastMonths}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 6, 9, 12].map(n => <SelectItem key={n} value={String(n)}>{n} months</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Historical Lookback</label>
              <Select value={lookback} onValueChange={setLookback}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 6, 9, 12].map(n => <SelectItem key={n} value={String(n)}>{n} months</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Scenario</label>
              <Select value={activeScenario} onValueChange={setActiveScenario}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCENARIOS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {activeScenario === 'custom' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground font-medium">Milk Price (Kshs/L)</label>
                  <Input placeholder={`${latestMilkPrice} (current)`} value={customMilkPrice} onChange={e => setCustomMilkPrice(e.target.value)} className="w-36" type="number" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground font-medium">Herd Multiplier</label>
                  <Input placeholder="1.0" value={customHerdMult} onChange={e => setCustomHerdMult(e.target.value)} className="w-28" type="number" step="0.1" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground font-medium">Expense Growth %/mo</label>
                  <Input placeholder="0" value={customExpGrowth} onChange={e => setCustomExpGrowth(e.target.value)} className="w-28" type="number" step="0.5" />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scenario badge */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: currentScenario.color }} />
        <span className="font-semibold text-foreground/90">{currentScenario.label} Scenario</span>
        <span className="text-sm text-muted-foreground">— {currentScenario.description}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
          <Info className="w-3 h-3" /> Based on linear trend from last {lookback} months
        </div>
      </div>

      {/* Forecast KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Total Forecast Income (${fMonths}mo)`, value: fmt(activeForecast.reduce((a, f) => a + f.forecastedIncome, 0)), color: 'text-emerald-600', icon: TrendingUp },
          { label: `Total Forecast Expenses (${fMonths}mo)`, value: fmt(activeForecast.reduce((a, f) => a + f.forecastedExpenses, 0)), color: 'text-rose-600', icon: TrendingDown },
          { label: `Forecast Profit (${fMonths}mo)`, value: fmt(activeForecast.reduce((a, f) => a + f.forecastedProfit, 0)), color: activeForecast.reduce((a, f) => a + f.forecastedProfit, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600', icon: DollarSign },
          { label: `Avg Monthly Milk (L)`, value: `${(activeForecast.reduce((a, f) => a + f.forecastedMilkLiters, 0) / Math.max(fMonths, 1)).toFixed(0)}L`, color: 'text-blue-600', icon: Milk },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
              </div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Forecast Chart</TabsTrigger>
          <TabsTrigger value="table">Monthly Breakdown</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Comparison</TabsTrigger>
        </TabsList>

        {/* Combined historical + forecast chart */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Historical vs. Forecasted Financials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      formatter={(v, name) => [fmt(v), name]}
                    />
                    <Legend />
                    {/* Historical bars */}
                    <Bar dataKey="income" fill="#10b981" name="Historical Income" opacity={0.7} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" fill="#f87171" name="Historical Expenses" opacity={0.7} radius={[3, 3, 0, 0]} />
                    {/* Forecast lines */}
                    <Line dataKey="forecastIncome" stroke="#059669" strokeWidth={2} strokeDasharray="5 3" name="Forecast Income" dot={{ r: 3 }} />
                    <Line dataKey="forecastExpenses" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 3" name="Forecast Expenses" dot={{ r: 3 }} />
                    <Line dataKey="forecastProfit" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 3" name="Forecast Profit" dot={{ r: 3 }} />
                    <Line dataKey="profit" stroke="#94a3b8" strokeWidth={1.5} name="Historical Profit" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Solid bars = historical actuals · Dashed lines = forecast projections
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly breakdown table */}
        <TabsContent value="table">
          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Month</th>
                    <th className="py-2 pr-4 text-right">Milk (L)</th>
                    <th className="py-2 pr-4 text-right">Price/L</th>
                    <th className="py-2 pr-4 text-right">Income</th>
                    <th className="py-2 pr-4 text-right">Expenses</th>
                    <th className="py-2 text-right">Profit/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {activeForecast.map((row, i) => (
                    <tr key={row.month} className={cn('border-b border-border', i % 2 === 0 ? 'bg-muted/60' : '')}>
                      <td className="py-2 pr-4 font-medium text-foreground/90">{row.month}</td>
                      <td className="py-2 pr-4 text-right text-blue-600">{row.forecastedMilkLiters}L</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">{row.milkPrice}</td>
                      <td className="py-2 pr-4 text-right text-emerald-600 font-medium">{fmt(row.forecastedIncome)}</td>
                      <td className="py-2 pr-4 text-right text-rose-600 font-medium">{fmt(row.forecastedExpenses)}</td>
                      <td className={cn('py-2 text-right font-bold', row.forecastedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                        {row.forecastedProfit >= 0 ? '+' : ''}{fmt(row.forecastedProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted">
                  <tr>
                    <td className="py-2 pr-4 font-bold">Total</td>
                    <td className="py-2 pr-4 text-right text-blue-700 font-bold">
                      {activeForecast.reduce((a, r) => a + r.forecastedMilkLiters, 0).toFixed(0)}L
                    </td>
                    <td className="py-2 pr-4" />
                    <td className="py-2 pr-4 text-right text-emerald-700 font-bold">
                      {fmt(activeForecast.reduce((a, r) => a + r.forecastedIncome, 0))}
                    </td>
                    <td className="py-2 pr-4 text-right text-rose-700 font-bold">
                      {fmt(activeForecast.reduce((a, r) => a + r.forecastedExpenses, 0))}
                    </td>
                    <td className={cn('py-2 text-right font-bold text-lg',
                      activeForecast.reduce((a, r) => a + r.forecastedProfit, 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    )}>
                      {fmt(activeForecast.reduce((a, r) => a + r.forecastedProfit, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenario comparison */}
        <TabsContent value="scenarios">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Summary cards */}
            {scenarioTotals.map(s => (
              <Card key={s.id} className={cn('cursor-pointer transition-all border-2', activeScenario === s.id ? 'border-current shadow-md' : 'border-transparent')}
                style={activeScenario === s.id ? { borderColor: s.color } : {}}
                onClick={() => setActiveScenario(s.id)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                    {s.label}
                    <span className="font-normal text-muted-foreground ml-1">— {s.description}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Income</p>
                      <p className="font-bold text-emerald-600 text-sm">{fmt(s.totalIncome)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expenses</p>
                      <p className="font-bold text-rose-600 text-sm">{fmt(s.totalExpenses)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Profit</p>
                      <p className={cn('font-bold text-sm', s.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                        {fmt(s.totalProfit)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Scenario overlay chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Profit Comparison Across Scenarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecasts.base.map((_, i) => ({ month: forecasts.base[i].month }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v, name) => [fmt(v), name]} contentStyle={{ borderRadius: '8px' }} />
                      <Legend />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                      {SCENARIOS.map(s => (
                        <Line
                          key={s.id}
                          data={forecasts[s.id].map(f => ({ month: f.month, profit: f.forecastedProfit }))}
                          dataKey="profit"
                          name={s.label}
                          stroke={s.color}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
