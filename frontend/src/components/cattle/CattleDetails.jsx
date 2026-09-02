import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/api';
import { format, differenceInMonths, differenceInYears, differenceInDays } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Edit, Calendar, Weight, Tag, Baby, Heart, Milk } from 'lucide-react';
import { cn } from "@/lib/utils";

const statusColors = {
  Active: "bg-emerald-100 text-emerald-700",
  Dry: "bg-amber-100 text-amber-700",
  Pregnant: "bg-purple-100 text-purple-700",
  Sold: "bg-muted text-foreground/90",
  Deceased: "bg-rose-100 text-rose-700",
};

export default function CattleDetails({ cattle, open, onOpenChange, onEdit }) {
  const { data: breedingRecords = [] } = useQuery({
    queryKey: ['breedingRecords', cattle?.id],
    queryFn: async () => (await entities.BreedingRecord.list()).filter(r => r.cattle_id === cattle.id),
    enabled: !!cattle?.id && open,
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ['healthRecords', cattle?.id],
    queryFn: async () => (await entities.HealthRecord.list('-date', 500)).filter(r => r.cattle_id === cattle.id).slice(0, 10),
    enabled: !!cattle?.id && open,
  });

  const { data: milkProduction = [] } = useQuery({
    queryKey: ['milkProduction', cattle?.id],
    queryFn: async () => (await entities.MilkProduction.list('-date', 2000)).filter(r => r.cattle_id === cattle.id).slice(0, 30),
    enabled: !!cattle?.id && open,
  });

  if (!cattle) return null;

  const getAge = () => {
    if (!cattle.date_of_birth) return 'Unknown';
    const years = differenceInYears(new Date(), new Date(cattle.date_of_birth));
    const months = differenceInMonths(new Date(), new Date(cattle.date_of_birth)) % 12;
    if (years > 0) return `${years} years, ${months} months`;
    return `${months} months`;
  };

  const currentPregnancy = breedingRecords.find(r => r.pregnancy_status === 'Confirmed' && !r.actual_calving_date);
  const lastCalving = breedingRecords
    .filter(r => r.actual_calving_date)
    .sort((a, b) => new Date(b.actual_calving_date) - new Date(a.actual_calving_date))[0];

  const avgMilk = milkProduction.length > 0
    ? (milkProduction.reduce((sum, r) => sum + (r.quantity_liters || 0), 0) / milkProduction.length).toFixed(1)
    : 0;

  const totalMilk = milkProduction.reduce((sum, r) => sum + (r.quantity_liters || 0), 0).toFixed(1);

  const recentHealth = healthRecords.filter(r => r.status === 'Ongoing').length;

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/60">
      <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || 'Not specified'}</p>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Cattle Profile</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {cattle.photo_url ? (
                <img src={cattle.photo_url} alt={cattle.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">
                  {cattle.tag_number?.slice(0, 2) || 'C'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">
                {cattle.name || cattle.tag_number}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Tag: {cattle.tag_number}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={cn("text-xs", statusColors[cattle.status])}>
                  {cattle.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {cattle.breed}
                </Badge>
                {cattle.stage && (
                  <Badge variant="outline" className="text-xs">
                    {cattle.stage}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 mb-1">
                <Milk className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-emerald-700">Avg Milk/Day</p>
              </div>
              <p className="text-lg font-bold text-emerald-800">{avgMilk}L</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <Baby className="w-4 h-4 text-purple-600" />
                <p className="text-xs text-purple-700">Lactation</p>
              </div>
              <p className="text-lg font-bold text-purple-800">#{cattle.lactation_number || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-blue-700">Age</p>
              </div>
              <p className="text-sm font-bold text-blue-800">{getAge()}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-amber-700">Health</p>
              </div>
              <p className="text-lg font-bold text-amber-800">
                {recentHealth > 0 ? `${recentHealth} Active` : 'Good'}
              </p>
            </div>
          </div>

          {currentPregnancy && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
              <div className="flex items-start gap-3">
                <Baby className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-purple-800">Currently Pregnant</h3>
                  <p className="text-xs text-purple-600 mt-1">
                    Expected calving: {currentPregnancy.expected_calving_date
                      ? `${format(new Date(currentPregnancy.expected_calving_date), 'MMM d, yyyy')} (${differenceInDays(new Date(currentPregnancy.expected_calving_date), new Date())} days)`
                      : 'Not set'}
                  </p>
                  {currentPregnancy.sire_info && (
                    <p className="text-xs text-purple-600">Sire: {currentPregnancy.sire_info}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breeding">Breeding</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={Calendar} label="Date of Birth" value={cattle.date_of_birth ? format(new Date(cattle.date_of_birth), 'MMM d, yyyy') : null} />
                <InfoRow icon={Tag} label="Gender" value={cattle.gender} />
                <InfoRow icon={Weight} label="Weight" value={cattle.weight_kg ? `${cattle.weight_kg} kg` : null} />
                <InfoRow icon={Calendar} label="Acquired" value={cattle.acquisition_date ? format(new Date(cattle.acquisition_date), 'MMM d, yyyy') : null} />
                <InfoRow icon={Tag} label="Acquisition Type" value={cattle.acquisition_type} />
              </div>

              {(cattle.sire_id || cattle.dam_id) && (
                <div className="p-4 rounded-xl bg-muted/60">
                  <h3 className="text-sm font-semibold text-foreground/90 mb-3">Lineage</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Sire (Father)</p>
                      <p className="text-sm font-medium text-foreground">{cattle.sire_id || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dam (Mother)</p>
                      <p className="text-sm font-medium text-foreground">{cattle.dam_id || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              )}

              {cattle.notes && (
                <div className="p-4 rounded-xl bg-muted/60">
                  <h3 className="text-sm font-semibold text-foreground/90 mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cattle.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="breeding" className="space-y-3 mt-4">
              {breedingRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Baby className="w-8 h-8 mx-auto text-muted-foreground/70" />
                  <p className="text-sm text-muted-foreground mt-2">No breeding records</p>
                </div>
              ) : (
                <>
                  {lastCalving && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <h4 className="text-sm font-semibold text-emerald-800 mb-2">Last Calving</h4>
                      <p className="text-xs text-emerald-700">
                        {format(new Date(lastCalving.actual_calving_date), 'MMM d, yyyy')}
                        {' '}({differenceInDays(new Date(), new Date(lastCalving.actual_calving_date))} days ago)
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        Outcome: {lastCalving.calving_outcome} • Gender: {lastCalving.calf_gender || 'N/A'}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground/90">Breeding History</h4>
                    {breedingRecords.slice(0, 5).map((record) => (
                      <div key={record.id} className="p-3 rounded-lg bg-muted/60 border border-border">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {format(new Date(record.breeding_date), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {record.breeding_type === 'Artificial Insemination' ? 'AI' : 'Natural'}
                              {record.sire_info && ` • ${record.sire_info}`}
                            </p>
                          </div>
                          <Badge className={cn("text-xs",
                            record.pregnancy_status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                            record.pregnancy_status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-muted text-foreground/90')}>
                            {record.pregnancy_status}
                          </Badge>
                        </div>
                        {record.actual_calving_date && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Calved: {format(new Date(record.actual_calving_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="health" className="space-y-3 mt-4">
              {healthRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="w-8 h-8 mx-auto text-muted-foreground/70" />
                  <p className="text-sm text-muted-foreground mt-2">No health records</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {healthRecords.map((record) => (
                    <div key={record.id} className="p-3 rounded-lg bg-muted/60 border border-border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{record.record_type}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(record.date), 'MMM d, yyyy')}
                          </p>
                          {record.diagnosis && (
                            <p className="text-xs text-foreground/90 mt-1">{record.diagnosis}</p>
                          )}
                          {record.treatment && (
                            <p className="text-xs text-muted-foreground mt-0.5">Treatment: {record.treatment}</p>
                          )}
                        </div>
                        <Badge className={cn("text-xs",
                          record.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                          record.status === 'Ongoing' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700')}>
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="production" className="space-y-3 mt-4">
              {milkProduction.length === 0 ? (
                <div className="text-center py-8">
                  <Milk className="w-8 h-8 mx-auto text-muted-foreground/70" />
                  <p className="text-sm text-muted-foreground mt-2">No production records</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                      <p className="text-xs text-blue-700 mb-1">Total (30 days)</p>
                      <p className="text-xl font-bold text-blue-800">{totalMilk}L</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs text-emerald-700 mb-1">Average/Day</p>
                      <p className="text-xl font-bold text-emerald-800">{avgMilk}L</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground/90">Recent Production</h4>
                    {milkProduction.slice(0, 7).map((record) => (
                      <div key={record.id} className="p-3 rounded-lg bg-muted/60 border border-border flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(record.date), 'MMM d')}
                          </p>
                          <p className="text-xs text-muted-foreground">{record.session}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-700">{record.quantity_liters}L</p>
                          {record.quality_grade && (
                            <p className="text-xs text-muted-foreground">Grade {record.quality_grade}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <Button onClick={() => { onOpenChange(false); onEdit(cattle); }} className="w-full bg-emerald-600 hover:bg-emerald-700">
            <Edit className="w-4 h-4 mr-2" /> Edit Cattle
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
