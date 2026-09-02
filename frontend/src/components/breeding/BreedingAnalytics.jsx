import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts';
import { Award, Syringe, Baby, Percent } from 'lucide-react';
import KpiCard from '@/components/shared/KpiCard';

const SEASON_MAP = {
  Dec: 'Summer', Jan: 'Summer', Feb: 'Summer',
  Mar: 'Autumn', Apr: 'Autumn', May: 'Autumn',
  Jun: 'Winter', Jul: 'Winter', Aug: 'Winter',
  Sep: 'Spring', Oct: 'Spring', Nov: 'Spring',
};

function getSuccessRate(recs) {
  if (recs.length === 0) return 0;
  const successes = recs.filter(r => r.pregnancy_status === 'Confirmed' || r.calving_outcome === 'Successful').length;
  return Math.round((successes / recs.length) * 100);
}



export default function BreedingAnalytics({ records = [] }) {
  const byBreed = useMemo(() => {
    const groups = {};
    records.forEach(r => {
      const breed = r.sire_breed || 'Unknown';
      if (!groups[breed]) groups[breed] = [];
      groups[breed].push(r);
    });
    return Object.entries(groups)
      .map(([breed, recs]) => ({
        breed,
        total: recs.length,
        successRate: getSuccessRate(recs),
        confirmed: recs.filter(r => r.pregnancy_status === 'Confirmed' || r.calving_outcome === 'Successful').length,
        notPregnant: recs.filter(r => r.pregnancy_status === 'Not Pregnant').length,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [records]);

  const bySeason = useMemo(() => {
    const groups = { Summer: [], Autumn: [], Winter: [], Spring: [] };
    records.forEach(r => {
      if (!r.breeding_date) return;
      const monthAbbr = new Date(r.breeding_date).toLocaleString('en-US', { month: 'short' });
      const season = SEASON_MAP[monthAbbr];
      if (season) groups[season].push(r);
    });
    return Object.entries(groups).map(([season, recs]) => ({
      season,
      successRate: getSuccessRate(recs),
      total: recs.length,
    }));
  }, [records]);

  const kpis = useMemo(() => {
    const total = records.length;
    const confirmedOrCalved = records.filter(r => r.pregnancy_status === 'Confirmed' || r.calving_outcome === 'Successful').length;
    const successRate = total > 0 ? Math.round((confirmedOrCalved / total) * 100) : 0;
    const calvings = records.filter(r => r.calving_outcome === 'Successful').length;
    const calvingRate = total > 0 ? Math.round((calvings / total) * 100) : 0;
    const aiCount = records.filter(r => r.breeding_type === 'Artificial Insemination').length;
    const aiRate = total > 0 ? Math.round((aiCount / total) * 100) : 0;
    return { total, successRate, calvingRate, aiRate };
  }, [records]);

  const bestBreed = byBreed.filter(b => b.total >= 2).sort((a, b) => b.successRate - a.successRate)[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Baby} label="Total Breedings" value={kpis.total} tone="blue" />
        <KpiCard icon={Percent} label="Pregnancy Success Rate" value={`${kpis.successRate}%`} tone="emerald" />
        <KpiCard icon={Award} label="Calving Rate" value={`${kpis.calvingRate}%`} tone="gold" />
        <KpiCard icon={Syringe} label="AI Rate" value={`${kpis.aiRate}%`} tone="rose" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pregnancy Success Rate by Sire Breed</CardTitle>
          {bestBreed && (
            <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Best: {bestBreed.breed} ({bestBreed.successRate}%)
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {byBreed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Not enough data yet — add sire breed on breeding records.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBreed} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="breed" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="successRate" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Breeding Performance by Season</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={bySeason}>
                <PolarGrid />
                <PolarAngleAxis dataKey="season" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Success Rate %" dataKey="successRate" stroke="#059669" fill="#059669" fillOpacity={0.4} />
                <Legend />
                <Tooltip formatter={(v) => `${v}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
