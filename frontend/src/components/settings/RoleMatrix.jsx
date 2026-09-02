import React from 'react';
import { Check, Minus, Crown, Shield, User, Eye } from 'lucide-react';
import { cn } from "@/lib/utils";
import { PERMISSION_MATRIX } from '@/lib/permissions';

const ROLES = [
  { key: 'admin', label: 'Admin', icon: Crown, color: 'text-rose-600', bg: 'bg-rose-50' },
  { key: 'manager', label: 'Manager', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'staff', label: 'Staff', icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'viewer', label: 'Viewer', icon: Eye, color: 'text-muted-foreground', bg: 'bg-muted/60' },
];

function Cell({ value }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-600 mx-auto" />;
  if (value === false) return <Minus className="w-4 h-4 text-muted-foreground/70 mx-auto" />;
  return null;
}

export default function RoleMatrix() {
  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <p className="text-sm text-emerald-800">
          <strong>Enforced:</strong> This matrix defines the active access levels per role. Navigation and page access are automatically filtered based on the user's assigned role. Assign roles in the <em>Users</em> tab.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="text-left px-5 py-3 text-sm font-semibold text-muted-foreground min-w-[220px]">Module / Permission</th>
                {ROLES.map(role => {
                  const Icon = role.icon;
                  return (
                    <th key={role.key} className="px-4 py-3 text-center min-w-[90px]">
                      <div className={cn("inline-flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg", role.bg)}>
                        <Icon className={cn("w-4 h-4", role.color)} />
                        <span className={cn("text-xs font-semibold", role.color)}>{role.label}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row, idx) => (
                <tr
                  key={row.module}
                  className={cn(
                    "border-b border-border/60 hover:bg-muted/60 transition-colors",
                    idx % 2 === 0 ? '' : 'bg-muted/60'
                  )}
                >
                  <td className="px-5 py-3 text-sm text-foreground/90">{row.module}</td>
                  {ROLES.map(role => (
                    <td key={role.key} className="px-4 py-3 text-center">
                      <Cell value={row.permissions[role.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-emerald-600" /> Allowed
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Minus className="w-4 h-4 text-muted-foreground/70" /> Not Allowed
        </div>
      </div>
    </div>
  );
}
