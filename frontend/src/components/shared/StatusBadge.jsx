import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Every status word used across the app maps to one of four semantic states.
// Add new labels here rather than inventing a new color scheme per page.
const STATUS_MAP = {
  // positive / active
  active: 'good', resolved: 'good', completed: 'good', paid: 'good', confirmed: 'good',
  successful: 'good', 'in stock': 'good', approved: 'good', synced: 'good', income: 'good',
  // attention / in progress
  pending: 'warn', ongoing: 'warn', monitoring: 'warn', 'in progress': 'warn',
  low: 'warn', medium: 'warn', 'low stock': 'warn', dry: 'warn', assisted: 'warn', ordered: 'warn',
  expense: 'warn',
  // critical / negative
  overdue: 'bad', critical: 'bad', high: 'bad', urgent: 'bad', 'out of stock': 'bad',
  stillborn: 'bad', aborted: 'bad', rejected: 'bad', outstanding: 'bad', failed: 'bad',
  // neutral / inactive
  inactive: 'neutral', sold: 'neutral', deceased: 'neutral', dismissed: 'neutral',
  cancelled: 'neutral', draft: 'neutral',
};

const STATE_STYLES = {
  good: 'bg-primary/10 text-primary border-primary/20',
  warn: 'bg-gold/10 text-gold border-gold/20',
  bad: 'bg-destructive/10 text-destructive border-destructive/20',
  neutral: 'bg-muted text-muted-foreground border-border',
};

/**
 * <StatusBadge value="Active" /> — looks up the semantic state for the
 * label (case-insensitive) and falls back to neutral for anything unmapped.
 */
export default function StatusBadge({ value, className }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const state = STATUS_MAP[String(value).toLowerCase()] || 'neutral';
  return (
    <Badge variant="outline" className={cn(STATE_STYLES[state], className)}>
      {value}
    </Badge>
  );
}
