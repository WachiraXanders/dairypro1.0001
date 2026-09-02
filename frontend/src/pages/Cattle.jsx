import React, { useState } from 'react';
import { Beef } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EntityCrudPage from '@/components/EntityCrudPage';
import CattleDetails from '@/components/cattle/CattleDetails';

const BREEDS = ['Holstein', 'Jersey', 'Guernsey', 'Ayrshire', 'Brown Swiss', 'Milking Shorthorn', 'Crossbreed', 'Other'];
const STATUS_COLORS = {
  Active: 'bg-emerald-100 text-emerald-700',
  Dry: 'bg-muted text-foreground/90',
  Pregnant: 'bg-pink-100 text-pink-700',
  Sold: 'bg-amber-100 text-amber-700',
  Deceased: 'bg-red-100 text-red-700',
};

const fields = [
  { key: 'tag_number', label: 'Tag Number', type: 'text', required: true },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'breed', label: 'Breed', type: 'select', options: BREEDS, required: true },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male'], default: 'Female', required: true },
  { key: 'status', label: 'Status', type: 'select', options: Object.keys(STATUS_COLORS), default: 'Active', required: true },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { key: 'weight_kg', label: 'Weight (kg)', type: 'number' },
  { key: 'acquisition_date', label: 'Acquisition Date', type: 'date' },
  { key: 'acquisition_type', label: 'Acquisition Type', type: 'select', options: ['Born on Farm', 'Purchased', 'Gifted'], default: 'Born on Farm' },
  { key: 'group_name', label: 'Group', type: 'text' },
  { key: 'sire_id', label: "Sire's Tag", type: 'text' },
  { key: 'dam_id', label: "Dam's Tag", type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
];

export default function Cattle() {
  const [detailsTarget, setDetailsTarget] = useState(null);

  const columns = [
    { key: 'tag_number', label: 'Tag #' },
    {
      key: 'name', label: 'Name',
      render: (r) => (
        <button className="text-emerald-700 hover:underline font-medium" onClick={() => setDetailsTarget(r)}>
          {r.name || r.tag_number}
        </button>
      ),
    },
    { key: 'breed', label: 'Breed' },
    { key: 'gender', label: 'Gender' },
    {
      key: 'status', label: 'Status',
      render: (r) => <Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge>,
    },
    { key: 'group_name', label: 'Group' },
  ];

  return (
    <>
      <EntityCrudPage
        entityName="Cattle"
        title="Cattle"
        description="Register and manage your herd."
        icon={Beef}
        columns={columns}
        fields={fields}
        searchKeys={['tag_number', 'name', 'breed']}
      />
      <CattleDetails
        cattle={detailsTarget}
        open={!!detailsTarget}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
        onEdit={() => setDetailsTarget(null)}
      />
    </>
  );
}
