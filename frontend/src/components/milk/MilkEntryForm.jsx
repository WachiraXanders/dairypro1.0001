import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sun, Sunset, Moon } from 'lucide-react';
import { format } from 'date-fns';

const SESSION_MAP = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
const SESSION_ICONS = { morning: Sun, afternoon: Sunset, evening: Moon };

const emptySession = { quantity_liters: '', milk_used_by_calves: '', fat_percentage: '', protein_percentage: '', quality_grade: 'A', notes: '' };

function buildEmptyForm() {
  return {
    date: format(new Date(), 'yyyy-MM-dd'),
    cattle_id: '',
    cattle_tag: '',
    morning: { ...emptySession },
    afternoon: { ...emptySession },
    evening: { ...emptySession },
  };
}

/**
 * Used for both logging a full day (all 3 sessions at once, `onSubmit`
 * receives an array of records — one per session with a quantity > 0) and
 * editing a single existing record (`record` prop set, `onSubmit` receives a
 * single object for just that session).
 */
export default function MilkEntryForm({ open, onOpenChange, record, cattle = [], onSubmit, isLoading }) {
  const [formData, setFormData] = useState(buildEmptyForm());

  useEffect(() => {
    if (record) {
      const sessionKey = record.session?.toLowerCase();
      setFormData({
        date: record.date || format(new Date(), 'yyyy-MM-dd'),
        cattle_id: record.cattle_id || '',
        cattle_tag: record.cattle_tag || '',
        morning: { ...emptySession },
        afternoon: { ...emptySession },
        evening: { ...emptySession },
        [sessionKey]: {
          quantity_liters: record.quantity_liters ?? '',
          milk_used_by_calves: record.milk_used_by_calves ?? '',
          fat_percentage: record.fat_percentage ?? '',
          protein_percentage: record.protein_percentage ?? '',
          quality_grade: record.quality_grade || 'A',
          notes: record.notes || '',
        },
      });
    } else if (open) {
      setFormData(buildEmptyForm());
    }
  }, [record, open]);

  const milkingCattle = cattle.filter((c) => c.status === 'Active' || c.status === 'Pregnant');

  const handleCattleChange = (cattleId) => {
    const cow = cattle.find((c) => c.id === cattleId);
    setFormData({ ...formData, cattle_id: cattleId, cattle_tag: cow?.tag_number || '' });
  };

  const setSession = (key, field, value) => {
    setFormData({ ...formData, [key]: { ...formData[key], [field]: value } });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (record) {
      const sessionKey = record.session?.toLowerCase();
      const s = formData[sessionKey];
      onSubmit({
        cattle_id: formData.cattle_id,
        cattle_tag: formData.cattle_tag,
        date: formData.date,
        session: record.session,
        quantity_liters: parseFloat(s.quantity_liters) || 0,
        milk_used_by_calves: parseFloat(s.milk_used_by_calves) || 0,
        fat_percentage: s.fat_percentage ? parseFloat(s.fat_percentage) : null,
        protein_percentage: s.protein_percentage ? parseFloat(s.protein_percentage) : null,
        quality_grade: s.quality_grade,
        notes: s.notes,
      });
      return;
    }

    const records = [];
    Object.entries(SESSION_MAP).forEach(([key, sessionName]) => {
      const s = formData[key];
      if (s.quantity_liters && parseFloat(s.quantity_liters) > 0) {
        records.push({
          cattle_id: formData.cattle_id,
          cattle_tag: formData.cattle_tag,
          date: formData.date,
          session: sessionName,
          quantity_liters: parseFloat(s.quantity_liters) || 0,
          milk_used_by_calves: parseFloat(s.milk_used_by_calves) || 0,
          fat_percentage: s.fat_percentage ? parseFloat(s.fat_percentage) : null,
          protein_percentage: s.protein_percentage ? parseFloat(s.protein_percentage) : null,
          quality_grade: s.quality_grade,
          notes: s.notes,
        });
      }
    });
    if (records.length > 0) onSubmit(records);
  };

  const sessionKeysToShow = record ? [record.session?.toLowerCase()] : ['morning', 'afternoon', 'evening'];
  const anyQuantityEntered = sessionKeysToShow.some((k) => formData[k]?.quantity_liters && parseFloat(formData[k].quantity_liters) > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{record ? `Edit ${record.session} Entry` : 'Log Milk — All Sessions'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Cow *</Label>
              <Select value={formData.cattle_id} onValueChange={handleCattleChange}>
                <SelectTrigger><SelectValue placeholder="Select cow" /></SelectTrigger>
                <SelectContent>
                  {milkingCattle.map((c) => <SelectItem key={c.id} value={c.id}>{c.tag_number} {c.name ? `— ${c.name}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!record && (
            <p className="text-xs text-muted-foreground">
              Fill in whichever sessions you have data for — only sessions with a quantity entered will be saved.
              Leave a session blank to skip it for today.
            </p>
          )}

          {sessionKeysToShow.map((key) => {
            const Icon = SESSION_ICONS[key];
            const s = formData[key] || emptySession;
            return (
              <div key={key} className="p-4 rounded-xl border border-border space-y-3">
                <h4 className="font-medium text-foreground/90 flex items-center gap-2">
                  <Icon className="w-4 h-4 text-emerald-600" /> {SESSION_MAP[key]}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantity (L){!record && ' — leave blank to skip'}</Label>
                    <Input type="number" step="0.1" min="0" value={s.quantity_liters} onChange={(e) => setSession(key, 'quantity_liters', e.target.value)} required={!!record} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Used by Calves (L)</Label>
                    <Input type="number" step="0.1" min="0" value={s.milk_used_by_calves} onChange={(e) => setSession(key, 'milk_used_by_calves', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fat %</Label>
                    <Input type="number" step="0.01" value={s.fat_percentage} onChange={(e) => setSession(key, 'fat_percentage', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Protein %</Label>
                    <Input type="number" step="0.01" value={s.protein_percentage} onChange={(e) => setSession(key, 'protein_percentage', e.target.value)} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Quality Grade</Label>
                    <Select value={s.quality_grade} onValueChange={(v) => setSession(key, 'quality_grade', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={isLoading || (!record && !anyQuantityEntered) || !formData.cattle_id} className="flex-1">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {record ? 'Save Changes' : 'Log Milk'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
