import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TONE_STYLES = {
  emerald: 'bg-primary/10 text-primary',
  gold: 'bg-gold/10 text-gold',
  slate: 'bg-muted text-muted-foreground',
  rose: 'bg-destructive/10 text-destructive',
  blue: 'bg-sky-500/10 text-sky-500',
};

/**
 * value/label are required. Optional `trend` (e.g. +4.2) renders a small
 * up/down/flat indicator — pass `trendLabel` to explain what it's relative to
 * (e.g. "vs last month"). `tone` picks the icon accent; default is emerald.
 */
export default function KpiCard({ label, value, icon: Icon, tone = 'emerald', trend, trendLabel, context }) {
  const showTrend = typeof trend === 'number';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-primary' : trend < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-1">{value}</p>
            {context && <p className="text-xs text-muted-foreground mt-0.5">{context}</p>}
            {showTrend && (
              <div className={cn('flex items-center gap-1 text-xs font-medium mt-1.5', trendColor)}>
                <TrendIcon className="w-3 h-3" />
                <span>{Math.abs(trend)}%</span>
                {trendLabel && <span className="text-muted-foreground font-normal">{trendLabel}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', TONE_STYLES[tone])}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
