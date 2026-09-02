import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Milk, Beef, Package, DollarSign, Heart, CalendarDays, BarChart2 } from 'lucide-react';
import MilkProductionReport from '@/components/reports/MilkProductionReport';
import FeedConsumptionReport from '@/components/reports/FeedConsumptionReport';
import InventoryReport from '@/components/reports/InventoryReport';
import FinancialReport from '@/components/reports/FinancialReport';
import HealthReport from '@/components/reports/HealthReport';
import BreedingCalendar from '@/components/shared/BreedingCalendar';
import KPIReport from '@/components/reports/KPIReport';
import PageHeader from '@/components/shared/PageHeader';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('milk');

  const { data: cattle = [] } = useQuery({ queryKey: ['Cattle'], queryFn: () => entities.Cattle.list() });
  const { data: milkRecords = [] } = useQuery({ queryKey: ['MilkProduction'], queryFn: () => entities.MilkProduction.list('-date', 5000) });
  const { data: healthRecords = [] } = useQuery({ queryKey: ['HealthRecord'], queryFn: () => entities.HealthRecord.list('-date', 2000) });
  const { data: feedRatios = [] } = useQuery({ queryKey: ['FeedRatio'], queryFn: () => entities.FeedRatio.list('-date', 5000) });
  const { data: inventory = [] } = useQuery({ queryKey: ['Inventory'], queryFn: () => entities.Inventory.list() });
  const { data: transactions = [] } = useQuery({ queryKey: ['Transaction'], queryFn: () => entities.Transaction.list('-date', 5000) });
  const { data: milkPrices = [] } = useQuery({ queryKey: ['MilkPrice'], queryFn: () => entities.MilkPrice.list() });
  const { data: breedingRecords = [] } = useQuery({ queryKey: ['BreedingRecord'], queryFn: () => entities.BreedingRecord.list('-breeding_date', 500) });

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" subtitle="Generate detailed reports with custom date ranges and export options" icon={BarChart2} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 lg:w-auto">
          <TabsTrigger value="calendar" className="gap-2"><CalendarDays className="w-4 h-4" /> Calendar</TabsTrigger>
          <TabsTrigger value="milk" className="gap-2"><Milk className="w-4 h-4" /> Milk Production</TabsTrigger>
          <TabsTrigger value="feed" className="gap-2"><Beef className="w-4 h-4" /> Feed Consumption</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2"><Package className="w-4 h-4" /> Inventory</TabsTrigger>
          <TabsTrigger value="financial" className="gap-2"><DollarSign className="w-4 h-4" /> Financial</TabsTrigger>
          <TabsTrigger value="health" className="gap-2"><Heart className="w-4 h-4" /> Health</TabsTrigger>
          <TabsTrigger value="kpi" className="gap-2"><BarChart2 className="w-4 h-4" /> KPI Report</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <BreedingCalendar breedingRecords={breedingRecords} cattle={cattle} />
        </TabsContent>
        <TabsContent value="milk">
          <MilkProductionReport cattle={cattle} milkRecords={milkRecords} />
        </TabsContent>
        <TabsContent value="feed">
          <FeedConsumptionReport cattle={cattle} feedRatios={feedRatios} />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryReport inventory={inventory} />
        </TabsContent>
        <TabsContent value="financial">
          <FinancialReport transactions={transactions} milkRecords={milkRecords} milkPrices={milkPrices} />
        </TabsContent>
        <TabsContent value="health">
          <HealthReport cattle={cattle} healthRecords={healthRecords} />
        </TabsContent>
        <TabsContent value="kpi">
          <KPIReport cattle={cattle} milkRecords={milkRecords} feedRatios={feedRatios} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
