import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Shows a human message with a retry action. Pass `detail` (e.g. the raw
 * error message) only if you want it available for debugging — it renders
 * small and muted, never as the headline.
 */
export default function ErrorState({
  title = "We couldn't load this data",
  description = 'Please try again.',
  detail,
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-5">
          <RefreshCw className="w-4 h-4 mr-1.5" /> Try again
        </Button>
      )}
      {detail && <p className="text-xs text-muted-foreground/60 mt-4 font-mono max-w-md truncate">{detail}</p>}
    </div>
  );
}
