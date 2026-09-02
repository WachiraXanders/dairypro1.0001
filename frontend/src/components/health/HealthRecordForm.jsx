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
import { format } from 'date-fns';

const recordTypes = ["Vaccination", "Treatment", "Checkup", "Surgery", "Deworming", "Injury", "Illness", "Other"];
const statuses = ["Resolved", "Ongoing", "Monitoring"];

export default function HealthRecordForm({ open, onOpenChange, record, cattle, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    cattle_id: '',
    cattle_tag: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    record_type: 'Checkup',
    diagnosis: '',
    treatment: '',
    medication: '',
    dosage: '',
    veterinarian: '',
    cost: '',
    follow_up_date: '',
    status: 'Resolved',
    notes: '',
  });

  useEffect(() => {
    if (record) {
      setFormData({
        cattle_id: record.cattle_id || '',
        cattle_tag: record.cattle_tag || '',
        date: record.date || format(new Date(), 'yyyy-MM-dd'),
        record_type: record.record_type || 'Checkup',
        diagnosis: record.diagnosis || '',
        treatment: record.treatment || '',
        medication: record.medication || '',
        dosage: record.dosage || '',
        veterinarian: record.veterinarian || '',
        cost: record.cost || '',
        follow_up_date: record.follow_up_date || '',
        status: record.status || 'Resolved',
        notes: record.notes || '',
      });
    } else {
      setFormData({
        cattle_id: '',
        cattle_tag: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        record_type: 'Checkup',
        diagnosis: '',
        treatment: '',
        medication: '',
        dosage: '',
        veterinarian: '',
        cost: '',
        follow_up_date: '',
        status: 'Resolved',
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      cost: formData.cost ? parseFloat(formData.cost) : null,
    };
    onSubmit(submitData);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{record ? 'Edit Health Record' : 'Add Health Record'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label>Select Cattle *</Label>
            <Select value={formData.cattle_id} onValueChange={handleCattleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select cattle" />
              </SelectTrigger>
              <SelectContent>
                {cattle.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.tag_number} - {c.name || 'Unnamed'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Record Type *</Label>
              <Select value={formData.record_type} onValueChange={(v) => setFormData({ ...formData, record_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recordTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis / Condition</Label>
            <Input
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="e.g., Mastitis, Foot rot"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="treatment">Treatment</Label>
            <Textarea
              id="treatment"
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              placeholder="Describe treatment administered..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medication">Medication</Label>
              <Input
                id="medication"
                value={formData.medication}
                onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                placeholder="e.g., Penicillin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dosage">Dosage</Label>
              <Input
                id="dosage"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g., 10ml 2x daily"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="veterinarian">Veterinarian</Label>
              <Input
                id="veterinarian"
                value={formData.veterinarian}
                onChange={(e) => setFormData({ ...formData, veterinarian: e.target.value })}
                placeholder="Dr. name"
              />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="follow_up_date">Follow-up Date</Label>
              <Input
                id="follow_up_date"
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
