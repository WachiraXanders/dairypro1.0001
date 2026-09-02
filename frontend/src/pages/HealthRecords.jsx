import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, HeartPulse, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import HealthRecordForm from '@/components/health/HealthRecordForm';
import PageHeader from '@/components/shared/PageHeader';

const STATUS_COLORS = {
  Resolved: 'bg-emerald-100 text-emerald-700',
  Ongoing: 'bg-amber-100 text-amber-700',
  Monitoring: 'bg-blue-100 text-blue-700',
};

export default function HealthRecords() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['HealthRecord'],
    queryFn: () => entities.HealthRecord.list('-date', 1000),
  });
  const { data: cattle = [] } = useQuery({ queryKey: ['Cattle'], queryFn: () => entities.Cattle.list() });

  const createMutation = useMutation({
    mutationFn: (data) => entities.HealthRecord.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['HealthRecord'] }); setFormOpen(false); toast.success('Health record added'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.HealthRecord.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['HealthRecord'] }); setFormOpen(false); setEditing(null); toast.success('Health record updated'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => entities.HealthRecord.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['HealthRecord'] }); setDeleteTarget(null); toast.success('Record deleted'); },
  });

  const cattleById = Object.fromEntries(cattle.map((c) => [c.id, c]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Health Records"
        subtitle="Track vaccinations, treatments, and checkups."
        icon={HeartPulse}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Health Record
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : records.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground text-sm">No health records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Cattle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => {
                    const cow = cattleById[r.cattle_id];
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell>{r.cattle_tag || cow?.tag_number} {cow?.name ? `— ${cow.name}` : ''}</TableCell>
                        <TableCell>{r.record_type}</TableCell>
                        <TableCell>{r.diagnosis || '—'}</TableCell>
                        <TableCell>{r.cost ?? '—'}</TableCell>
                        <TableCell><Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(r)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <HealthRecordForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        record={editing}
        cattle={cattle}
        onSubmit={(data) => editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteTarget.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
