import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * Never just "No data found." — explain what's missing, why it matters, and
 * give the user a concrete next action where there is one.
 */
export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center py-16 px-6 overflow-hidden rounded-2xl">
      {/* subtle contour-line brand signature, not decoration for its own sake */}
      <svg className="absolute inset-x-0 bottom-0 w-full h-24 opacity-[0.06] pointer-events-none" viewBox="0 0 400 100" preserveAspectRatio="none">
        <path d="M0,70 C80,50 140,80 220,60 C300,40 340,70 400,55" stroke="currentColor" strokeWidth="1" fill="none" />
        <path d="M0,85 C90,65 150,90 230,75 C310,60 350,85 400,72" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>

      {Icon && (
        <div className="relative w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="relative text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="relative text-sm text-muted-foreground mt-1.5 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="relative mt-5">{actionLabel}</Button>
      )}
    </div>
  );
}
