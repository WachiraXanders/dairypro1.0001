import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/LoadingSkeleton';

function FieldInput({ field, value, onChange }) {
  const common = { id: field.key, value: value ?? '', onChange: (e) => onChange(field.key, e.target.value) };
  if (field.type === 'select') {
    return (
      <Select value={value ?? ''} onValueChange={(v) => onChange(field.key, v)}>
        <SelectTrigger id={field.key}><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {field.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === 'textarea') {
    return <Textarea {...common} rows={3} />;
  }
  if (field.type === 'number') {
    return <Input {...common} type="number" step="any" onChange={(e) => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))} />;
  }
  if (field.type === 'date') {
    return <Input {...common} type="date" />;
  }
  return <Input {...common} type="text" />;
}

export default function EntityCrudPage({
  entityName, title, description, icon: Icon, columns, fields,
  sortDefault = '-created_date', limit = 1000, searchKeys = [], extraToolbar = null,
  canWrite = true, onRowsLoaded, onAfterCreate,
}) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [entityName],
    queryFn: () => entities[entityName].list(sortDefault, limit),
  });

  React.useEffect(() => { if (onRowsLoaded) onRowsLoaded(rows); }, [rows]); // eslint-disable-line

  const createMutation = useMutation({
    mutationFn: (data) => entities[entityName].create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: [entityName] });
      setFormOpen(false);
      toast.success(`${title} added`);
      if (onAfterCreate) onAfterCreate(created);
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to save'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities[entityName].update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityName] });
      setFormOpen(false);
      setEditing(null);
      toast.success(`${title} updated`);
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities[entityName].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityName] });
      setDeleteTarget(null);
      toast.success(`${title} deleted`);
    },
  });

  const filtered = useMemo(() => {
    if (!search || searchKeys.length === 0) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [rows, search, searchKeys]);

  const openCreate = () => {
    const defaults = {};
    fields.forEach((f) => { if (f.default !== undefined) defaults[f.key] = f.default; });
    setEditing(null);
    setFormData(defaults);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({ ...row });
    setFormOpen(true);
  };

  const handleChange = (key, value) => setFormData((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {};
    fields.forEach((f) => { payload[f.key] = formData[f.key] ?? ''; });
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle={description}
        icon={Icon}
        actions={
          <>
            {extraToolbar}
            {canWrite && (
              <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" /> Add {title}</Button>
            )}
          </>
        }
      />

      {searchKeys.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      <Card className="border-border/60">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton columns={columns.length + (canWrite ? 1 : 0)} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Icon}
              title={search ? 'No matching records' : `No ${title.toLowerCase()} records yet`}
              description={search ? 'Try a different search term.' : `Get started by adding your first ${title.toLowerCase()} record.`}
              actionLabel={!search && canWrite ? `Add ${title}` : undefined}
              onAction={!search && canWrite ? openCreate : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                    {canWrite && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/50">
                      {columns.map((c) => (
                        <TableCell key={c.key}>{c.render ? c.render(row) : (row[c.key] ?? '—')}</TableCell>
                      ))}
                      {canWrite && (
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(row)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.key} className={f.colSpan === 2 ? 'col-span-2 space-y-1.5' : 'space-y-1.5'}>
                  <Label htmlFor={f.key}>{f.label}{f.required && ' *'}</Label>
                  <FieldInput field={f} value={formData[f.key]} onChange={handleChange} />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {editing ? 'Save changes' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
