import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const BREEDS = ['Holstein', 'Jersey', 'Guernsey', 'Ayrshire', 'Brown Swiss', 'Milking Shorthorn', 'Crossbreed', 'Other'];
const STATUSES = ['Active', 'Dry', 'Pregnant', 'Sold', 'Deceased'];
const ACQUISITION_TYPES = ['Born on Farm', 'Purchased', 'Gifted'];

const emptyForm = {
  tag_number: '', name: '', breed: 'Holstein', gender: 'Female', status: 'Active',
  date_of_birth: '', weight_kg: '', acquisition_date: format(new Date(), 'yyyy-MM-dd'),
  acquisition_type: 'Born on Farm', group_name: '', stage: '', sire_id: '', dam_id: '', notes: '',
};

/**
 * Reusable Cattle add/edit form. Accepts `defaultValues` so callers (e.g. the
 * breeding page's auto-calf-registration flow) can pre-fill the sheet.
 */
export default function CattleForm({ open, onOpenChange, cattleRecord, defaultValues, onSubmit, isLoading }) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (cattleRecord) {
      setFormData({ ...emptyForm, ...cattleRecord });
    } else if (defaultValues) {
      setFormData({ ...emptyForm, ...defaultValues });
    } else {
      setFormData(emptyForm);
    }
  }, [cattleRecord, defaultValues, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{cattleRecord ? 'Edit Cattle' : 'Register Cattle'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tag Number *</Label>
              <Input value={formData.tag_number} onChange={(e) => setFormData({ ...formData, tag_number: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Breed *</Label>
              <Select value={formData.breed} onValueChange={(v) => setFormData({ ...formData, breed: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BREEDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" value={formData.weight_kg} onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Acquisition Type</Label>
              <Select value={formData.acquisition_type} onValueChange={(v) => setFormData({ ...formData, acquisition_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACQUISITION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Acquisition Date</Label>
              <Input type="date" value={formData.acquisition_date} onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Input value={formData.group_name} onChange={(e) => setFormData({ ...formData, group_name: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sire's Tag</Label>
              <Input value={formData.sire_id} onChange={(e) => setFormData({ ...formData, sire_id: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Dam's Tag</Label>
              <Input value={formData.dam_id} onChange={(e) => setFormData({ ...formData, dam_id: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {cattleRecord ? 'Update' : 'Register'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
