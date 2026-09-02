import { useEffect } from 'react';
import { entities } from '@/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, addDays, isBefore, isAfter, isSameDay } from 'date-fns';

export default function ProcessScheduledFeeds() {
  const queryClient = useQueryClient();

  const { data: scheduledFeeds = [] } = useQuery({
    queryKey: ['scheduledFeeds'],
    queryFn: async () => (await entities.ScheduledFeedRatio.list()).filter((s) => s.active),
    refetchInterval: 60000 // Check every minute
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => entities.Inventory.list(),
  });

  const processScheduleMutation = useMutation({
    mutationFn: async ({ schedule, entriesToCreate }) => {
      const results = [];
      
      for (const entry of entriesToCreate) {
        // Get current inventory
        const currentInventory = inventory.find(i => i.id === schedule.inventory_id);
        if (!currentInventory || currentInventory.total_quantity_kg < entry.feed_amount_kg) {
          console.warn(`Insufficient inventory for ${schedule.feed_name} on ${entry.date}`);
          continue;
        }

        // Create feed ratio entry
        const feedEntry = await entities.FeedRatio.create({
          cattle_id: schedule.cattle_id,
          cattle_tag: schedule.cattle_tag,
          cattle_name: schedule.cattle_name,
          date: entry.date,
          inventory_id: schedule.inventory_id,
          feed_name: schedule.feed_name,
          feed_amount_kg: entry.feed_amount_kg,
          cost_per_kg: currentInventory.cost_per_kg || 0,
          total_cost: entry.feed_amount_kg * (currentInventory.cost_per_kg || 0),
          remaining_inventory_kg: currentInventory.total_quantity_kg - entry.feed_amount_kg,
          notes: `Auto-generated from schedule`
        });

        // Update inventory
        await entities.Inventory.update(schedule.inventory_id, {
          total_quantity_kg: currentInventory.total_quantity_kg - entry.feed_amount_kg
        });

        // Audit log — keeps this in the Adjustment History alongside manual changes
        await entities.StockAdjustment.create({
          inventory_id: schedule.inventory_id,
          item_name: schedule.feed_name,
          adjustment_type: 'Consumption',
          quantity_change: -entry.feed_amount_kg,
          previous_quantity: currentInventory.total_quantity_kg,
          new_quantity: currentInventory.total_quantity_kg - entry.feed_amount_kg,
          date: entry.date,
          reason: `Scheduled feed: ${schedule.cattle_tag || schedule.cattle_name || ''}`,
        });

        results.push(feedEntry);
      }

      // Update schedule's last_processed_date
      const lastDate = entriesToCreate[entriesToCreate.length - 1]?.date;
      if (lastDate) {
        await entities.ScheduledFeedRatio.update(schedule.id, {
          last_processed_date: lastDate
        });

        // If schedule has ended, mark as inactive
        if (isSameDay(parseISO(lastDate), parseISO(schedule.end_date)) || 
            isAfter(parseISO(lastDate), parseISO(schedule.end_date))) {
          await entities.ScheduledFeedRatio.update(schedule.id, {
            active: false
          });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedRatios'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledFeeds'] });
      queryClient.invalidateQueries({ queryKey: ['stockAdjustments'] });
    }
  });

  useEffect(() => {
    if (!scheduledFeeds.length || !inventory.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    scheduledFeeds.forEach(schedule => {
      const startDate = parseISO(schedule.start_date);
      const endDate = parseISO(schedule.end_date);
      const lastProcessed = schedule.last_processed_date ? parseISO(schedule.last_processed_date) : new Date(startDate.getTime() - 86400000);
      
      // Check if schedule is valid and hasn't ended
      if (isAfter(today, endDate)) {
        // Schedule has ended, mark inactive
        if (schedule.active) {
          entities.ScheduledFeedRatio.update(schedule.id, { active: false });
        }
        return;
      }

      // Calculate dates that need processing
      const entriesToCreate = [];
      let currentDate = addDays(lastProcessed, 1);
      
      while (isBefore(currentDate, today) || isSameDay(currentDate, today)) {
        // Only create entries within the schedule range
        if ((isAfter(currentDate, startDate) || isSameDay(currentDate, startDate)) &&
            (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate))) {
          entriesToCreate.push({
            date: format(currentDate, 'yyyy-MM-dd'),
            feed_amount_kg: schedule.feed_amount_kg
          });
        }
        currentDate = addDays(currentDate, 1);
      }

      // Process entries if any
      if (entriesToCreate.length > 0) {
        processScheduleMutation.mutate({ schedule, entriesToCreate });
      }
    });
  }, [scheduledFeeds, inventory]);

  return null; // This is a background component
}
