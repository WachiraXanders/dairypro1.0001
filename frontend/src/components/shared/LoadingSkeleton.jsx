import React from 'react';
import { cn } from '@/lib/utils';

function Shimmer({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, c) => (
            <Shimmer key={c} className={cn('h-4', c === 0 ? 'w-8' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 p-4 space-y-3">
          <Shimmer className="h-3 w-2/3" />
          <Shimmer className="h-7 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ variant = 'table', ...props }) {
  return variant === 'cards' ? <CardSkeleton {...props} /> : <TableSkeleton {...props} />;
}
