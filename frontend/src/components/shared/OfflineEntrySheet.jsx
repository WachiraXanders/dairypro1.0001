import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Milk, HeartPulse } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useOfflineEntity } from '@/hooks/useOfflineEntity';

const MILK_DEFAULTS = { date: format(new Date(), 'yyyy-MM-dd'), cattle_tag: '', session: 'Morning', quantity_liters: '' };
const HEALTH_DEFAULTS = { date: format(new Date(), 'yyyy-MM-dd'), cattle_tag: '', record_type: 'Checkup', diagnosis: '', notes: '' };

export default function OfflineEntrySheet({ open, onOpenChange }) {
  const [kind, setKind] = useState('milk'); // 'milk' | 'health'
  const [milkForm, setMilkForm] = useState(MILK_DEFAULTS);
  const [healthForm, setHealthForm] = useState(HEALTH_DEFAULTS);
  const [saving, setSaving] = useState(false);

  const milkEntity = useOfflineEntity('MilkProduction');
  const healthEntity = useOfflineEntity('HealthRecord');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (kind === 'milk') {
        await milkEntity.create({ ...milkForm, quantity_liters: Number(milkForm.quantity_liters) || 0 });
        setMilkForm(MILK_DEFAULTS);
      } else {
        await healthEntity.create({ ...healthForm, status: 'Ongoing' });
        setHealthForm(HEALTH_DEFAULTS);
      }
      toast.success(navigator.onLine ? 'Saved' : 'Saved locally — will sync when back online');
    } catch {
      toast.error('Could not save this entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Quick Log {!navigator.onLine && <span className="text-amber-600 text-sm font-normal">(offline — will sync later)</span>}</SheetTitle>
        </SheetHeader>

        <div className="flex gap-1 bg-muted p-1 rounded-lg mt-4 w-fit">
          <button
            type="button"
            onClick={() => setKind('milk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${kind === 'milk' ? 'bg-card shadow-sm text-emerald-700' : 'text-muted-foreground'}`}
          >
            <Milk className="w-4 h-4" /> Milk
          </button>
          <button
            type="button"
            onClick={() => setKind('health')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${kind === 'health' ? 'bg-card shadow-sm text-emerald-700' : 'text-muted-foreground'}`}
          >
            <HeartPulse className="w-4 h-4" /> Health
          </button>
        </div>

        {kind === 'milk' ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={milkForm.date} onChange={(e) => setMilkForm({ ...milkForm, date: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Cattle Tag</Label><Input value={milkForm.cattle_tag} onChange={(e) => setMilkForm({ ...milkForm, cattle_tag: e.target.value })} required /></div>
            <div className="space-y-1.5">
              <Label>Session</Label>
              <Select value={milkForm.session} onValueChange={(v) => setMilkForm({ ...milkForm, session: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Afternoon">Afternoon</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Quantity (L)</Label><Input type="number" step="0.1" value={milkForm.quantity_liters} onChange={(e) => setMilkForm({ ...milkForm, quantity_liters: e.target.value })} required /></div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save Milk Entry
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={healthForm.date} onChange={(e) => setHealthForm({ ...healthForm, date: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Cattle Tag</Label><Input value={healthForm.cattle_tag} onChange={(e) => setHealthForm({ ...healthForm, cattle_tag: e.target.value })} required /></div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={healthForm.record_type} onValueChange={(v) => setHealthForm({ ...healthForm, record_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Vaccination', 'Treatment', 'Checkup', 'Surgery', 'Deworming', 'Injury', 'Illness', 'Other'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Diagnosis / Note</Label><Input value={healthForm.diagnosis} onChange={(e) => setHealthForm({ ...healthForm, diagnosis: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save Health Entry
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
