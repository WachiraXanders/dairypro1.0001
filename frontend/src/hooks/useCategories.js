import { useQuery } from '@tanstack/react-query';
import { entities } from '@/api';

const DEFAULTS = {
  inventory: ['Feed', 'Medicine', 'Supplement', 'Equipment', 'Supplies', 'Other'],
  finance_income: ['Milk Sales', 'Cattle Sales', 'Other'],
  finance_expense: ['Feed', 'Medicine', 'Veterinary', 'Labor', 'Equipment', 'Utilities', 'Transportation', 'Other'],
};

export function useCategories(context) {
  const { data: records = [] } = useQuery({
    queryKey: ['CategorySettings'],
    queryFn: () => entities.CategorySettings.list(),
  });

  const defaults = DEFAULTS[context] || [];
  const custom = records
    .filter((r) => r.context === context)
    .map((r) => r.name)
    .filter((name) => !defaults.includes(name));

  return [...defaults, ...custom];
}
