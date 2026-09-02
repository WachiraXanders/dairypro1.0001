/**
 * Financial Forecasting Engine
 * Derives trends from historical data and projects forward N months.
 */

import { format, addMonths, startOfMonth, endOfMonth, subMonths } from 'date-fns';

/**
 * Compute monthly aggregates for milk production.
 * Returns array of { month: 'YYYY-MM', totalLiters, netLiters } sorted oldest first.
 */
export function getMonthlyMilkAggregates(milkRecords, lookbackMonths = 6) {
  const cutoff = format(subMonths(new Date(), lookbackMonths), 'yyyy-MM');
  const buckets = {};
  milkRecords.forEach(m => {
    const month = m.date?.slice(0, 7);
    if (!month || month < cutoff) return;
    if (!buckets[month]) buckets[month] = { month, totalLiters: 0, netLiters: 0 };
    buckets[month].totalLiters += m.quantity_liters || 0;
    buckets[month].netLiters += (m.quantity_liters || 0) - (m.milk_used_by_calves || 0);
  });
  return Object.values(buckets).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Compute monthly expense aggregates from transactions.
 */
export function getMonthlyExpenseAggregates(transactions, lookbackMonths = 6) {
  const cutoff = format(subMonths(new Date(), lookbackMonths), 'yyyy-MM');
  const buckets = {};
  transactions.filter(t => t.type === 'Expense').forEach(t => {
    const month = t.date?.slice(0, 7);
    if (!month || month < cutoff) return;
    if (!buckets[month]) buckets[month] = { month, total: 0, byCategory: {} };
    buckets[month].total += t.amount || 0;
    buckets[month].byCategory[t.category] = (buckets[month].byCategory[t.category] || 0) + (t.amount || 0);
  });
  return Object.values(buckets).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Simple linear regression on an array of numbers.
 * Returns { slope, intercept } where y = slope*i + intercept, i is 0-indexed.
 */
export function linearRegression(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  values.forEach((y, i) => { num += (i - meanX) * (y - meanY); den += (i - meanX) ** 2; });
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: meanY - slope * meanX };
}

/**
 * Generate forecast for the next `forecastMonths` months.
 *
 * scenarioMilkPrice: override price per liter (null = use trend from milkPrices)
 * scenarioHerdMultiplier: scale milk production by this factor (1 = no change)
 * scenarioExpenseGrowth: monthly expense growth rate, e.g. 0.02 = +2%/month
 *
 * Returns array of { month, forecastedIncome, forecastedExpenses, forecastedProfit,
 *   forecastedMilkLiters, milkPrice, isScenario } for each future month.
 */
export function generateForecast({
  milkRecords,
  transactions,
  milkPrices,
  forecastMonths = 6,
  scenarioMilkPrice = null,
  scenarioHerdMultiplier = 1,
  scenarioExpenseGrowth = 0,
  lookbackMonths = 6,
}) {
  const milkAgg = getMonthlyMilkAggregates(milkRecords, lookbackMonths);
  const expAgg = getMonthlyExpenseAggregates(transactions, lookbackMonths);

  // Regression on milk net liters
  const netLitersSeries = milkAgg.map(m => m.netLiters);
  const milkReg = linearRegression(netLitersSeries);
  const baselineOffset = netLitersSeries.length;

  // Regression on monthly expenses
  const expSeries = expAgg.map(m => m.total);
  const expReg = linearRegression(expSeries);
  const expOffset = expSeries.length;

  // Derive milk price trend
  const sortedPrices = [...milkPrices].sort((a, b) => a.month.localeCompare(b.month));
  const recentPrices = sortedPrices.slice(-lookbackMonths);
  const priceSeries = recentPrices.map(p => p.price_per_liter || 0);
  const priceReg = linearRegression(priceSeries);
  const priceOffset = priceSeries.length;
  const lastKnownPrice = priceSeries.at(-1) || 0;

  // Non-milk income trend (other income from transactions)
  const otherIncBuckets = {};
  transactions.filter(t => t.type === 'Income' && t.category !== 'Milk Sales').forEach(t => {
    const month = t.date?.slice(0, 7);
    if (!month) return;
    otherIncBuckets[month] = (otherIncBuckets[month] || 0) + (t.amount || 0);
  });
  const otherIncSeries = Object.values(otherIncBuckets).sort();
  const otherIncReg = linearRegression(otherIncSeries.length ? otherIncSeries.map(Number) : [0]);

  const result = [];
  for (let i = 0; i < forecastMonths; i++) {
    const futureDate = addMonths(startOfMonth(new Date()), i + 1);
    const month = format(futureDate, 'yyyy-MM');

    // Milk production forecast (with herd multiplier)
    const rawMilkLiters = milkReg.slope * (baselineOffset + i) + milkReg.intercept;
    const forecastedMilkLiters = Math.max(0, rawMilkLiters) * scenarioHerdMultiplier;

    // Milk price forecast
    let milkPrice;
    if (scenarioMilkPrice !== null) {
      milkPrice = scenarioMilkPrice;
    } else {
      const projected = priceReg.slope * (priceOffset + i) + priceReg.intercept;
      milkPrice = Math.max(0, projected || lastKnownPrice);
    }

    // Income
    const milkIncome = forecastedMilkLiters * milkPrice;
    const otherIncome = Math.max(0, otherIncReg.slope * (otherIncSeries.length + i) + otherIncReg.intercept);
    const forecastedIncome = milkIncome + otherIncome;

    // Expenses
    const baseExp = expReg.slope * (expOffset + i) + expReg.intercept;
    const growthFactor = Math.pow(1 + scenarioExpenseGrowth, i + 1);
    const forecastedExpenses = Math.max(0, baseExp) * growthFactor;

    const forecastedProfit = forecastedIncome - forecastedExpenses;

    result.push({
      month,
      forecastedMilkLiters: +forecastedMilkLiters.toFixed(1),
      milkPrice: +milkPrice.toFixed(2),
      milkIncome: +milkIncome.toFixed(2),
      otherIncome: +otherIncome.toFixed(2),
      forecastedIncome: +forecastedIncome.toFixed(2),
      forecastedExpenses: +forecastedExpenses.toFixed(2),
      forecastedProfit: +forecastedProfit.toFixed(2),
    });
  }

  return result;
}

/**
 * Get historical monthly summary (income + expenses + profit) for chart overlay.
 */
export function getHistoricalMonthlySummary(transactions, milkRecords, milkPrices, lookbackMonths = 6) {
  const cutoff = format(subMonths(new Date(), lookbackMonths), 'yyyy-MM');
  const months = new Set([
    ...transactions.map(t => t.date?.slice(0, 7)),
    ...milkRecords.map(m => m.date?.slice(0, 7)),
  ].filter(m => m && m >= cutoff));

  return [...months].sort().map(month => {
    const monthTx = transactions.filter(t => t.date?.startsWith(month));
    const expenses = monthTx.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0);
    const otherIncome = monthTx.filter(t => t.type === 'Income' && t.category !== 'Milk Sales').reduce((s, t) => s + (t.amount || 0), 0);

    const monthMilk = milkRecords.filter(m => m.date?.startsWith(month));
    const netLiters = monthMilk.reduce((s, m) => s + (m.quantity_liters || 0) - (m.milk_used_by_calves || 0), 0);
    const priceRecord = milkPrices.find(p => p.month === month);
    const milkIncome = netLiters * (priceRecord?.price_per_liter || 0);
    const income = milkIncome + otherIncome;
    const profit = income - expenses;

    return { month, income: +income.toFixed(2), expenses: +expenses.toFixed(2), profit: +profit.toFixed(2) };
  });
}
