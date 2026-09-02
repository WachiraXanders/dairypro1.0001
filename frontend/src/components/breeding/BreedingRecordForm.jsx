import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

const breedingTypes = ["Natural", "Artificial Insemination"];
const pregnancyStatuses = ["Pending", "Confirmed", "Not Pregnant", "Aborted"];
const calvingOutcomes = ["Pending", "Successful", "Stillborn", "Assisted", "C-Section"];
const calfGenders = ["Male", "Female", "Twins"];

export default function BreedingRecordForm({ open, onOpenChange, record, cattle, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    cattle_id: '',
    cattle_tag: '',
    breeding_date: format(new Date(), 'yyyy-MM-dd'),
    breeding_type: 'Artificial Insemination',
    sire_info: '',
    sire_breed: '',
    technician: '',
    heat_detected_date: '',
    pregnancy_check_date: '',
    pregnancy_status: 'Pending',
    expected_calving_date: '',
    actual_calving_date: '',
    calving_outcome: 'Pending',
    calf_gender: '',
    cost: '',
    notes: '',
  });

  useEffect(() => {
    if (record) {
      setFormData({
        cattle_id: record.cattle_id || '',
        cattle_tag: record.cattle_tag || '',
        breeding_date: record.breeding_date || format(new Date(), 'yyyy-MM-dd'),
        breeding_type: record.breeding_type || 'Artificial Insemination',
        sire_info: record.sire_info || '',
        sire_breed: record.sire_breed || '',
        technician: record.technician || '',
        heat_detected_date: record.heat_detected_date || '',
        pregnancy_check_date: record.pregnancy_check_date || '',
        pregnancy_status: record.pregnancy_status || 'Pending',
        expected_calving_date: record.expected_calving_date || '',
        actual_calving_date: record.actual_calving_date || '',
        calving_outcome: record.calving_outcome || 'Pending',
        calf_gender: record.calf_gender || '',
        cost: record.cost || '',
        notes: record.notes || '',
      });
    } else {
      setFormData({
        cattle_id: '',
        cattle_tag: '',
        breeding_date: format(new Date(), 'yyyy-MM-dd'),
        breeding_type: 'Artificial Insemination',
        sire_info: '',
        sire_breed: '',
        technician: '',
        heat_detected_date: '',
        pregnancy_check_date: '',
        pregnancy_status: 'Pending',
        expected_calving_date: '',
        actual_calving_date: '',
        calving_outcome: 'Pending',
        calf_gender: '',
        cost: '',
        notes: '',
      });
    }
  }, [record, open]);

  const handleCattleChange = (cattleId) => {
    const selectedCattle = cattle.find(c => c.id === cattleId);
    setFormData({
      ...formData,
      cattle_id: cattleId,
      cattle_tag: selectedCattle?.tag_number || '',
    });
  };

  const handleBreedingDateChange = (date) => {
    // Auto-calculate expected calving date (~283 days)
    const expectedDate = format(addDays(new Date(date), 283), 'yyyy-MM-dd');
    setFormData({
      ...formData,
      breeding_date: date,
      expected_calving_date: expectedDate,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      cost: formData.cost ? parseFloat(formData.cost) : null,
    };
    onSubmit(submitData);
  };

  const femaleCattle = cattle.filter(c => c.gender === 'Female');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{record ? 'Edit Breeding Record' : 'Add Breeding Record'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label>Select Cow *</Label>
            <Select value={formData.cattle_id} onValueChange={handleCattleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select cow" />
              </SelectTrigger>
              <SelectContent>
                {femaleCattle.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.tag_number} - {c.name || 'Unnamed'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heat_detected_date">Heat Detected Date</Label>
              <Input
                id="heat_detected_date"
                type="date"
                value={formData.heat_detected_date}
                onChange={(e) => setFormData({ ...formData, heat_detected_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breeding_date">Breeding Date *</Label>
              <Input
                id="breeding_date"
                type="date"
                value={formData.breeding_date}
                onChange={(e) => handleBreedingDateChange(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Breeding Type *</Label>
              <Select value={formData.breeding_type} onValueChange={(v) => setFormData({ ...formData, breeding_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {breedingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="technician">Technician</Label>
              <Input
                id="technician"
                value={formData.technician}
                onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                placeholder="AI technician name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sire_info">Sire / Straw Info</Label>
              <Input
                id="sire_info"
                value={formData.sire_info}
                onChange={(e) => setFormData({ ...formData, sire_info: e.target.value })}
                placeholder="Bull ID or straw #"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sire_breed">Sire Breed</Label>
              <Input
                id="sire_breed"
                value={formData.sire_breed}
                onChange={(e) => setFormData({ ...formData, sire_breed: e.target.value })}
                placeholder="e.g., Holstein"
              />
            </div>
          </div>

          <div className="p-4 bg-muted/60 rounded-xl space-y-4">
            <h4 className="font-medium text-foreground/90">Pregnancy Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pregnancy_check_date">Check Date</Label>
                <Input
                  id="pregnancy_check_date"
                  type="date"
                  value={formData.pregnancy_check_date}
                  onChange={(e) => setFormData({ ...formData, pregnancy_check_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.pregnancy_status} onValueChange={(v) => setFormData({ ...formData, pregnancy_status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pregnancyStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_calving_date">Expected Calving Date</Label>
              <Input
                id="expected_calving_date"
                type="date"
                value={formData.expected_calving_date}
                onChange={(e) => setFormData({ ...formData, expected_calving_date: e.target.value })}
              />
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-xl space-y-4">
            <h4 className="font-medium text-purple-700">Calving Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="actual_calving_date">Actual Calving Date</Label>
                <Input
                  id="actual_calving_date"
                  type="date"
                  value={formData.actual_calving_date}
                  onChange={(e) => setFormData({ ...formData, actual_calving_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Outcome</Label>
                <Select value={formData.calving_outcome} onValueChange={(v) => setFormData({ ...formData, calving_outcome: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {calvingOutcomes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Calf Gender</Label>
              <Select value={formData.calf_gender} onValueChange={(v) => setFormData({ ...formData, calf_gender: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {calfGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {formData.calving_outcome === 'Successful' && formData.actual_calving_date && (
              <div className="text-xs text-purple-700 bg-card p-2 rounded border border-purple-200">
                ℹ️ Lactation number will be automatically incremented for this cow
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Cost</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {record ? 'Update' : 'Save Record'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
