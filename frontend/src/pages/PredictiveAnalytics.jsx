import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { entities } from '@/api';
import AIInsights from '@/components/analytics/AIInsights';
import MilkTrendForecast from '@/components/analytics/MilkTrendForecast';
import PageHeader from '@/components/shared/PageHeader';

export default function PredictiveAnalytics() {
  const { data: cattle = [] } = useQuery({ queryKey: ['Cattle'], queryFn: () => entities.Cattle.list() });
  const { data: milkRecords = [] } = useQuery({ queryKey: ['MilkProduction'], queryFn: () => entities.MilkProduction.list('-date', 5000) });
  const { data: healthRecords = [] } = useQuery({ queryKey: ['HealthRecord'], queryFn: () => entities.HealthRecord.list('-date', 2000) });
  const { data: breedingRecords = [] } = useQuery({ queryKey: ['BreedingRecord'], queryFn: () => entities.BreedingRecord.list('-breeding_date', 500) });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Predictive Analytics"
        subtitle="AI-assisted insights and forward-looking forecasts for your farm."
        icon={Sparkles}
      />

      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai"><Sparkles className="w-4 h-4 mr-1.5" /> AI Insights</TabsTrigger>
          <TabsTrigger value="milk"><TrendingUp className="w-4 h-4 mr-1.5" /> Milk Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="pt-4">
          <AIInsights cattle={cattle} milkRecords={milkRecords} healthRecords={healthRecords} breedingRecords={breedingRecords} />
        </TabsContent>

        <TabsContent value="milk" className="pt-4">
          <MilkTrendForecast cattle={cattle} milkRecords={milkRecords} />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">Looking for financial forecasting? That's now under Finance → Forecast.</p>
    </div>
  );
}
