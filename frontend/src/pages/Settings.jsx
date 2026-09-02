import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Settings as SettingsIcon, Tags, Users, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoryManager from '@/components/settings/CategoryManager';
import UserAdmin from '@/components/settings/UserAdmin';
import RoleMatrix from '@/components/settings/RoleMatrix';
import { canAccessSettingsTab } from '@/lib/permissions';
import PageHeader from '@/components/shared/PageHeader';

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
];

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role || 'staff';
  const defaultSettingsTab = canAccessSettingsTab('farm', userRole) ? 'farm' : 'categories';

  const [formData, setFormData] = useState({
    farm_name: '', currency: 'USD', currency_symbol: '$', location: '', phone: '', email: '',
  });

  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['Settings'],
    queryFn: () => entities.Settings.list(),
  });

  const currentSettings = settings[0];

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        farm_name: currentSettings.farm_name || '',
        currency: currentSettings.currency || 'USD',
        currency_symbol: currentSettings.currency_symbol || '$',
        location: currentSettings.location || '',
        phone: currentSettings.phone || '',
        email: currentSettings.email || '',
      });
    }
  }, [currentSettings]);

  const createMutation = useMutation({
    mutationFn: (data) => entities.Settings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Settings'] });
      toast.success('Settings saved successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => entities.Settings.update(currentSettings.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Settings'] });
      toast.success('Settings updated successfully');
    },
  });

  const handleCurrencyChange = (currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    setFormData({ ...formData, currency: currencyCode, currency_symbol: currency?.symbol || currencyCode });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentSettings) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <PageHeader title="Settings" subtitle="Configure your farm settings and preferences" icon={SettingsIcon} />
      </div>

      <Tabs defaultValue={defaultSettingsTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto w-full sm:w-auto">
          {canAccessSettingsTab('farm', userRole) && (
            <TabsTrigger value="farm" className="gap-2"><SettingsIcon className="w-4 h-4" /> Farm & Alerts</TabsTrigger>
          )}
          {canAccessSettingsTab('categories', userRole) && (
            <TabsTrigger value="categories" className="gap-2"><Tags className="w-4 h-4" /> Categories</TabsTrigger>
          )}
          {canAccessSettingsTab('users', userRole) && (
            <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> Users</TabsTrigger>
          )}
          {canAccessSettingsTab('roles', userRole) && (
            <TabsTrigger value="roles" className="gap-2"><ShieldCheck className="w-4 h-4" /> Role Matrix</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>

        <TabsContent value="users">
          <UserAdmin currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="roles">
          <RoleMatrix />
        </TabsContent>

        <TabsContent value="farm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Farm Information</h2>
                  <p className="text-sm text-muted-foreground">Basic details about your farm</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="farm_name">Farm Name *</Label>
                  <Input id="farm_name" value={formData.farm_name} onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })} placeholder="e.g., Green Valley Dairy Farm" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Farm address or location" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1234567890" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Manager Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contact@farm.com" />
                    <p className="text-xs text-muted-foreground">Used for critical stock alerts and other automated notifications.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="mb-6">
                <h2 className="font-semibold text-foreground">Currency Settings</h2>
                <p className="text-sm text-muted-foreground">Choose your preferred currency for financial transactions</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol} - {c.name} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 bg-muted/60 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-semibold">{formData.currency_symbol} ({formData.currency})</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 px-8">
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
