import { api } from './apiClient';

// Generic client for a single entity collection, mirroring the shape the
// app's pages already expect: list(sort, limit), get(id), create(data),
// update(id, data), delete(id).
function makeEntityClient(entityType) {
  return {
    list: async (sort = '-created_date', limit = 1000) => {
      const { data } = await api.get(`/api/entities/${entityType}`, { params: { sort, limit } });
      return data;
    },
    get: async (id) => {
      const { data } = await api.get(`/api/entities/${entityType}/${id}`);
      return data;
    },
    create: async (payload) => {
      const { data } = await api.post(`/api/entities/${entityType}`, payload);
      return data;
    },
    update: async (id, payload) => {
      const { data } = await api.put(`/api/entities/${entityType}/${id}`, payload);
      return data;
    },
    delete: async (id) => {
      const { data } = await api.delete(`/api/entities/${entityType}/${id}`);
      return data;
    },
  };
}

const ENTITY_NAMES = [
  'Cattle', 'CattleGroup', 'MilkProduction', 'HealthRecord', 'BreedingRecord',
  'Inventory', 'ConsumptionRecord', 'StockAdjustment', 'ScheduledFeedRatio',
  'FeedRatio', 'ShoppingList', 'Task', 'Transaction', 'Vendor',
  'CategorySettings', 'MilkPrice', 'MilkYieldAlert', 'DashboardSettings',
  'Settings',
];

export const entities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, makeEntityClient(name)]));
