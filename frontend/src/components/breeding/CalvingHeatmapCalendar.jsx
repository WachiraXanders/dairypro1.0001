import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Baby } from 'lucide-react';
import { cn } from "@/lib/utils";

function intensityClass(count) {
  if (count === 0) return '';
  if (count === 1) return 'bg-emerald-100 border-emerald-200';
  if (count === 2) return 'bg-emerald-300 border-emerald-400';
  if (count === 3) return 'bg-emerald-500 border-emerald-600 text-white';
  return 'bg-emerald-700 border-emerald-800 text-white';
}

export default function CalvingHeatmapCalendar({ breedingRecords = [], cattle = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = (monthStart.getDay() + 6) % 7;
  const paddedDays = Array(startPad).fill(null).concat(days);

  const calvingMap = useMemo(() => {
    const map = {};
    breedingRecords.forEach(r => {
      const cow = cattle.find(c => c.id === r.cattle_id);
      if (r.expected_calving_date && r.pregnancy_status === 'Confirmed' && r.calving_outcome === 'Pending') {
        const key = r.expected_calving_date;
        if (!map[key]) map[key] = [];
        map[key].push({ tag: r.cattle_tag || 'Unknown', name: cow?.name || '', type: 'expected', sire: r.sire_info || '', breed: r.sire_breed || '' });
      }
      if (r.actual_calving_date && r.calving_outcome === 'Successful') {
        const key = r.actual_calving_date;
        if (!map[key]) map[key] = [];
        map[key].push({ tag: r.cattle_tag || 'Unknown', name: cow?.name || '', type: 'actual', sire: r.sire_info || '', breed: r.sire_breed || '' });
      }
    });
    return map;
  }, [breedingRecords, cattle]);

  const monthTotal = useMemo(() => {
    let expected = 0, actual = 0;
    days.forEach(d => {
      const key = format(d, 'yyyy-MM-dd');
      const entries = calvingMap[key] || [];
      expected += entries.filter(e => e.type === 'expected').length;
      actual += entries.filter(e => e.type === 'actual').length;
    });
    return { expected, actual };
  }, [days, calvingMap]);

  const upcoming = useMemo(() => {
    const result = [];
    for (let i = 0; i <= 60; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const key = format(date, 'yyyy-MM-dd');
      if (calvingMap[key]) {
        calvingMap[key].filter(e => e.type === 'expected').forEach(e => result.push({ date, key, ...e }));
      }
    }
    return result.slice(0, 12);
  }, [calvingMap]);

  const selectedEntries = selectedDay ? (calvingMap[format(selectedDay, 'yyyy-MM-dd')] || []) : [];
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-5 h-5 text-emerald-600" /> Calving Map
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm font-semibold px-3 min-w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="flex gap-3 pt-2 text-xs text-muted-foreground">
              <span>{monthTotal.expected} expected this month</span>
              <span>·</span>
              <span>{monthTotal.actual} actual calvings this month</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {paddedDays.map((day, idx) => {
                if (!day) return <div key={`pad-${idx}`} />;
                const key = format(day, 'yyyy-MM-dd');
                const entries = calvingMap[key] || [];
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const today = isToday(day);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={cn(
                      "relative min-h-[52px] p-1 rounded-lg text-left transition-all border",
                      entries.length > 0 ? intensityClass(entries.length) : (today ? "border-emerald-400" : "border-transparent hover:border-border hover:bg-muted/60"),
                      isSelected && "ring-2 ring-emerald-500"
                    )}
                  >
                    <span className={cn("text-xs font-medium block text-center", today && "font-bold")}>{format(day, 'd')}</span>
                    {entries.length > 0 && (
                      <span className="text-[9px] block text-center mt-0.5 flex items-center justify-center gap-0.5">
                        <Baby className="w-2.5 h-2.5" />{entries.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDay && (
              <div className="mt-4 p-3 bg-muted/60 rounded-lg border">
                <p className="text-sm font-semibold text-foreground/90 mb-2">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</p>
                {selectedEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No calvings</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedEntries.map((e, i) => (
                      <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-card border text-sm">
                        <span>{e.tag} {e.name && `— ${e.name}`}</span>
                        <Badge variant="outline" className="text-xs">{e.type === 'expected' ? 'Expected' : 'Calved'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Upcoming Calvings (60 days)</CardTitle></CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No expected calvings in the next 60 days</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50">
                    <Baby className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-700" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-emerald-700">{format(e.date, 'MMM d')}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.tag} {e.name && `— ${e.name}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
