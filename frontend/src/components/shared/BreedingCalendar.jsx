import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, subDays, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Baby, Flame, MilkOff, CalendarDays } from 'lucide-react';
import { cn } from "@/lib/utils";

// Heat cycle recurs every ~21 days from last breeding date
function getHeatCycles(breedingDate, monthStart, monthEnd) {
  const dates = [];
  const base = parseISO(breedingDate);
  // project forward ~6 cycles
  for (let i = 1; i <= 12; i++) {
    const d = addDays(base, i * 21);
    if (d >= monthStart && d <= monthEnd) dates.push(d);
  }
  return dates;
}

const EVENT_TYPES = {
  calving: { label: 'Calving', color: 'bg-emerald-500', textColor: 'text-emerald-700', bg: 'bg-emerald-50', icon: Baby },
  heat: { label: 'Heat Cycle', color: 'bg-rose-400', textColor: 'text-rose-700', bg: 'bg-rose-50', icon: Flame },
  dryOff: { label: 'Dry-Off', color: 'bg-amber-500', textColor: 'text-amber-700', bg: 'bg-amber-50', icon: MilkOff },
};

export default function BreedingCalendar({ breedingRecords = [], cattle = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of calendar to Monday
  const startPad = (monthStart.getDay() + 6) % 7; // Mon=0
  const paddedDays = Array(startPad).fill(null).concat(days);

  const events = useMemo(() => {
    const map = {}; // dateStr -> event[]

    const addEvent = (date, type, label, cattleInfo) => {
      const key = format(date, 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push({ type, label, cattleInfo });
    };

    breedingRecords.forEach(record => {
      const cow = cattle.find(c => c.id === record.cattle_id);
      const cowLabel = cow ? `${cow.tag_number}${cow.name ? ' ' + cow.name : ''}` : (record.cattle_tag || 'Unknown');

      // Expected calving date
      if (record.expected_calving_date) {
        addEvent(parseISO(record.expected_calving_date), 'calving', `Expected calving: ${cowLabel}`, cowLabel);
      }

      // Actual calving date (if not yet calved)
      if (record.actual_calving_date) {
        addEvent(parseISO(record.actual_calving_date), 'calving', `Calved: ${cowLabel}`, cowLabel);
      }

      // Dry-off: ~60 days before expected calving
      if (record.expected_calving_date && record.pregnancy_status === 'Confirmed') {
        const dryOff = subDays(parseISO(record.expected_calving_date), 60);
        addEvent(dryOff, 'dryOff', `Dry-off: ${cowLabel}`, cowLabel);
      }

      // Heat cycles: project from breeding date for non-confirmed pregnancies
      if (record.breeding_date && record.pregnancy_status !== 'Confirmed') {
        const heatDates = getHeatCycles(record.breeding_date, monthStart, monthEnd);
        heatDates.forEach(d => {
          addEvent(d, 'heat', `Heat cycle: ${cowLabel}`, cowLabel);
        });
      }
    });

    return map;
  }, [breedingRecords, cattle, currentMonth]);

  const selectedEvents = selectedDay ? (events[format(selectedDay, 'yyyy-MM-dd')] || []) : [];

  // Upcoming events in next 30 days
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const upcoming = [];
    for (let i = 0; i <= 30; i++) {
      const d = addDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      if (events[key]) {
        events[key].forEach(e => upcoming.push({ date: d, ...e }));
      }
    }
    return upcoming.slice(0, 10);
  }, [events]);

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-5 h-5 text-emerald-600" />
                Breeding Events Calendar
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold px-3 min-w-32 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4">
              {Object.entries(EVENT_TYPES).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${cfg.color}`} />
                  <span className="text-xs text-muted-foreground">{cfg.label}</span>
                </div>
              ))}
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {paddedDays.map((day, idx) => {
                if (!day) return <div key={`pad-${idx}`} />;
                const key = format(day, 'yyyy-MM-dd');
                const dayEvents = events[key] || [];
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const today = isToday(day);

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={cn(
                      "relative min-h-[52px] p-1 rounded-lg text-left transition-all border",
                      today ? "border-emerald-400 bg-emerald-50" : "border-transparent hover:border-border hover:bg-muted/60",
                      isSelected && "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-medium block text-center",
                      today ? "text-emerald-700 font-bold" : "text-muted-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${EVENT_TYPES[e.type]?.color}`} />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected day events */}
            {selectedDay && (
              <div className="mt-4 p-3 bg-muted/60 rounded-lg border">
                <p className="text-sm font-semibold text-foreground/90 mb-2">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</p>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedEvents.map((e, i) => {
                      const cfg = EVENT_TYPES[e.type];
                      const Icon = cfg.icon;
                      return (
                        <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${cfg.bg}`}>
                          <Icon className={`w-4 h-4 ${cfg.textColor}`} />
                          <span className={`text-sm ${cfg.textColor}`}>{e.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming events panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Next 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No upcoming events in the next 30 days</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((e, i) => {
                  const cfg = EVENT_TYPES[e.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.textColor}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${cfg.textColor}`}>{format(e.date, 'MMM d')}</p>
                        <p className="text-xs text-muted-foreground truncate">{e.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
