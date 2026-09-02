import React, { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api';
import { TrendingDown, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DROP_THRESHOLD = 20; // percent

export default function MilkYieldAlertBanner({ milkRecords = [], cattle = [] }) {
  const queryClient = useQueryClient();
  const cattleByTag = useMemo(() => Object.fromEntries(cattle.map((c) => [c.tag_number, c])), [cattle]);

  const { data: existingAlerts = [] } = useQuery({
    queryKey: ['MilkYieldAlert'],
    queryFn: () => entities.MilkYieldAlert.list('-alert_date', 200),
  });

  const createAlert = useMutation({
    mutationFn: (data) => entities.MilkYieldAlert.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['MilkYieldAlert'] }),
  });
  const dismissAlert = useMutation({
    mutationFn: (id) => entities.MilkYieldAlert.update(id, { status: 'Dismissed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['MilkYieldAlert'] }),
  });

  // Detect yield dips: for each cow, compare today's total to the prior 7-day average.
  const dips = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const byTag = {};
    milkRecords.forEach((m) => {
      if (!m.cattle_tag) return;
      byTag[m.cattle_tag] = byTag[m.cattle_tag] || [];
      byTag[m.cattle_tag].push(m);
    });

    const results = [];
    Object.entries(byTag).forEach(([tag, records]) => {
      const dayTotal = records.filter((r) => r.date === today).reduce((s, r) => s + (Number(r.quantity_liters) || 0), 0);
      if (dayTotal === 0) return;

      const prior7 = [...new Set(records.map((r) => r.date))]
        .filter((date) => date < today)
        .sort()
        .slice(-7);
      if (prior7.length < 3) return; // not enough history yet

      const priorTotal = prior7.reduce(
        (s, date) => s + records.filter((r) => r.date === date).reduce((a, r) => a + (Number(r.quantity_liters) || 0), 0),
        0
      );
      const sevenDayAvg = priorTotal / prior7.length;
      if (sevenDayAvg <= 0) return;

      const dropPercent = ((sevenDayAvg - dayTotal) / sevenDayAvg) * 100;
      if (dropPercent >= DROP_THRESHOLD) {
        results.push({
          cattle_tag: tag,
          alert_date: today,
          day_total: +dayTotal.toFixed(1),
          seven_day_avg: +sevenDayAvg.toFixed(1),
          drop_percent: +dropPercent.toFixed(1),
        });
      }
    });
    return results;
  }, [milkRecords]);

  // Auto-create new alerts (deduped by cattle_tag + alert_date).
  useEffect(() => {
    dips.forEach((dip) => {
      const alreadyExists = existingAlerts.some((a) => a.cattle_tag === dip.cattle_tag && a.alert_date === dip.alert_date);
      if (!alreadyExists) {
        const cow = cattleByTag[dip.cattle_tag];
        createAlert.mutate({ ...dip, cattle_id: cow?.id || '', status: 'Active' });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dips]);

  const activeAlerts = existingAlerts.filter((a) => a.status !== 'Dismissed');

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {activeAlerts.map((a) => {
        const cow = cattleByTag[a.cattle_tag];
        return (
          <div key={a.id} className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-medium">{a.cattle_tag}{cow?.name ? ` (${cow.name})` : ''}</span> — yield down{' '}
                <span className="font-semibold">{a.drop_percent}%</span> today ({a.day_total}L vs {a.seven_day_avg}L 7-day avg)
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="ghost" className="h-7"><Eye className="w-3.5 h-3.5 mr-1" /> Review</Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => dismissAlert.mutate(a.id)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
