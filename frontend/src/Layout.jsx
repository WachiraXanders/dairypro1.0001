import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { canAccessPage } from '@/lib/permissions';
import {
  LayoutDashboard, Beef, Milk, HeartPulse, Users2, Warehouse, ListChecks,
  Wallet, Truck, BarChart3, Sparkles, Settings as SettingsIcon, LogOut, Menu,
  Sun, Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ key: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Livestock',
    items: [
      { key: 'Cattle', label: 'Cattle', icon: Beef },
      { key: 'HealthRecords', label: 'Health', icon: HeartPulse },
      { key: 'Breeding', label: 'Breeding', icon: Users2 },
      { key: 'MilkProduction', label: 'Milk Production', icon: Milk },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'Inventory', label: 'Inventory', icon: Warehouse },
      { key: 'Tasks', label: 'Tasks', icon: ListChecks },
      { key: 'Vendors', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    label: 'Business',
    items: [
      { key: 'Finance', label: 'Finance', icon: Wallet },
      { key: 'Reports', label: 'Reports', icon: BarChart3 },
      { key: 'PredictiveAnalytics', label: 'Predictive Analytics', icon: Sparkles },
    ],
  },
  {
    label: 'System',
    items: [{ key: 'Settings', label: 'Settings', icon: SettingsIcon }],
  },
];

export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role || 'staff';

  const groups = NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccessPage(item.key, role)) }))
    .filter((group) => group.items.length > 0);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center font-bold text-white shadow-sm shadow-primary/30">D</div>
        <span className="font-semibold text-sidebar-foreground text-lg tracking-tight">DairyPro</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ key, label, icon: Icon }) => {
                const active = location.pathname === `/${key}` || (key === 'Dashboard' && location.pathname === '/');
                return (
                  <Link
                    key={key}
                    to={`/${key}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />}
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0">
            <p className="text-sm text-sidebar-foreground truncate">{user?.full_name || user?.email}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{role}</p>
          </div>
          <button onClick={logout} className="text-sidebar-foreground/50 hover:text-sidebar-foreground p-2" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-foreground">{currentPageName}</span>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="p-2 text-muted-foreground">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setMobileOpen(true)} className="text-foreground p-2">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
