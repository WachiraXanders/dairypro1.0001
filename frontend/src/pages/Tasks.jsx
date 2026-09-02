import React from 'react';
import { ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EntityCrudPage from '@/components/EntityCrudPage';

const PRIORITY_COLORS = {
  Low: 'bg-muted text-foreground/90',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-amber-100 text-amber-700',
  Urgent: 'bg-red-100 text-red-700',
};
const STATUS_COLORS = {
  Pending: 'bg-muted text-foreground/90',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Overdue: 'bg-red-100 text-red-700',
};

const fields = [
  { key: 'title', label: 'Title', type: 'text', required: true, colSpan: 2 },
  { key: 'category', label: 'Category', type: 'select', options: ['Milking', 'Vaccination', 'Cleaning', 'Feeding', 'Health Check', 'Breeding', 'Maintenance', 'Other'], required: true },
  { key: 'assigned_to', label: 'Assigned To', type: 'text' },
  { key: 'due_date', label: 'Due Date', type: 'date', required: true },
  { key: 'priority', label: 'Priority', type: 'select', options: Object.keys(PRIORITY_COLORS), default: 'Medium', required: true },
  { key: 'status', label: 'Status', type: 'select', options: Object.keys(STATUS_COLORS), default: 'Pending', required: true },
  { key: 'recurrence', label: 'Recurrence', type: 'select', options: ['None', 'Daily', 'Weekly', 'Monthly'], default: 'None' },
  { key: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
];

const columns = [
  { key: 'title', label: 'Task' },
  { key: 'category', label: 'Category' },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'due_date', label: 'Due' },
  { key: 'priority', label: 'Priority', render: (r) => <Badge className={PRIORITY_COLORS[r.priority] || ''}>{r.priority}</Badge> },
  { key: 'status', label: 'Status', render: (r) => <Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge> },
];

export default function Tasks() {
  return (
    <EntityCrudPage
      entityName="Task"
      title="Tasks"
      description="Daily farm to-dos and reminders."
      icon={ListChecks}
      columns={columns}
      fields={fields}
      sortDefault="-due_date"
      searchKeys={['title', 'assigned_to', 'category']}
    />
  );
}
