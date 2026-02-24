import { startOfWeek, startOfMonth, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export interface AggregatedData {
  period_label: string;
  period_date: string;
  revenue: number;
  invoice_count: number;
  appointment_count: number;
}

/**
 * Aggregates daily data by week
 */
export function aggregateByWeek<T extends AggregatedData>(
  data: T[],
): AggregatedData[] {
  const groups: Record<string, AggregatedData> = {};

  data.forEach((item) => {
    // Parseamos manualmente YYYY-MM-DD para evitar shift de zona horaria (UTC vs Local)
    const [year, month, day] = item.period_date.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const key = format(weekStart, "yyyy-MM-dd");

    if (!groups[key]) {
      groups[key] = {
        period_label: `Sem. ${format(weekStart, "dd MMM", { locale: es })}`,
        period_date: key,
        revenue: 0,
        invoice_count: 0,
        appointment_count: 0,
      };
    }

    groups[key].revenue += item.revenue;
    groups[key].invoice_count += item.invoice_count;
    groups[key].appointment_count += item.appointment_count;
  });

  return Object.values(groups).sort((a, b) =>
    a.period_date.localeCompare(b.period_date),
  );
}

/**
 * Aggregates daily data by month
 */
export function aggregateByMonth<T extends AggregatedData>(
  data: T[],
): AggregatedData[] {
  const groups: Record<string, AggregatedData> = {};

  data.forEach((item) => {
    // Parseamos manualmente YYYY-MM-DD para evitar shift de zona horaria (UTC vs Local)
    const [year, month, day] = item.period_date.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const monthStart = startOfMonth(date);
    const key = format(monthStart, "yyyy-MM-dd");

    if (!groups[key]) {
      groups[key] = {
        period_label: capitalizeFirstLetter(
          format(monthStart, "MMM yyyy", { locale: es }).replace(".", ""),
        ),
        period_date: key,
        revenue: 0,
        invoice_count: 0,
        appointment_count: 0,
      };
    }

    groups[key].revenue += item.revenue;
    groups[key].invoice_count += item.invoice_count;
    groups[key].appointment_count += item.appointment_count;
  });

  return Object.values(groups).sort((a, b) =>
    a.period_date.localeCompare(b.period_date),
  );
}

/**
 * Calculates a simple moving average for a dataset
 */
export function calculateMovingAverage(
  data: any[],
  key: string,
  windowSize: number = 7,
) {
  return data.map((item, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const subset = data.slice(start, index + 1);
    const sum = subset.reduce((acc, curr) => acc + curr[key], 0);
    return {
      ...item,
      [`${key}MA`]: sum / subset.length,
    };
  });
}
