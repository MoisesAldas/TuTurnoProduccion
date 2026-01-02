// ========================================
// ANALYTICS TYPES
// TypeScript interfaces for dashboard analytics
// ========================================

// ========================================
// RPC Response Types
// ========================================

export interface UniqueClientsCount {
  total_unique_clients: number;
  registered_clients: number;
  walk_in_clients: number;
  business_clients: number;
}

export interface TimeSlotData {
  time_slot: string; // "08:00 - 09:00"
  hour_start: number; // 8
  appointment_count: number;
}

export interface MonthlyAppointments {
  month_label: string; // "Ene 2025"
  month_date: string; // "2025-01-01"
  appointment_count: number;
}

export interface EmployeeAppointmentCount {
  employee_id: string;
  employee_name: string;
  appointment_count: number;
  completed_count: number;
  completion_rate: number; // Percentage (0-100)
}

export interface WeekdayData {
  day_of_week: number; // 0-6 (0=Sunday)
  day_name: string; // "Lun", "Mar", etc.
  appointment_count: number;
}

export interface ServiceData {
  service_id: string;
  service_name: string;
  booking_count: number;
  total_revenue: number;
  avg_price: number;
}

export interface DashboardKPIs {
  total_revenue: number;
  total_appointments: number;
  completion_rate: number;
  prev_total_revenue: number;
  prev_total_appointments: number;
  prev_completion_rate: number;
  revenue_change_percent: number;
  appointments_change_percent: number;
  completion_rate_change_percent: number;
}

// ========================================
// Revenue Analytics Types (NEW)
// ========================================

export interface RevenueAnalytics {
  total_revenue: number;
  total_invoices: number;
  average_ticket: number;
  revenue_trend: number;
  best_day_date: string;
  best_day_revenue: number;
  best_day_label: string;
  best_month_date: string;
  best_month_revenue: number;
  best_month_label: string;
}

export interface RevenuePeriod {
  period_label: string;
  period_date: string;
  revenue: number;
  invoice_count: number;
  appointment_count: number;
}

export interface EmployeeRevenueDetailed {
  month_label: string;
  month_date: string;
  employee_id: string;
  employee_name: string;
  total_revenue: number;
}

export interface PaymentMethodData {
  payment_method: string; // 'Efectivo' | 'Transferencia'
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

// ========================================
// Filter Types
// ========================================

export type PeriodType = "day" | "month" | "year" | "specific-month" | "custom";

export interface DashboardFilters {
  period: PeriodType;
  startDate: Date;
  endDate: Date;
}

// ========================================
// Aggregated Dashboard Data
// ========================================

export interface DashboardAnalyticsData {
  // KPIs
  kpis: DashboardKPIs | null;
  uniqueClients: UniqueClientsCount | null;

  // Charts Data
  appointmentsByWeekday: WeekdayData[];
  appointmentsByMonth: MonthlyAppointments[];
  topServices: ServiceData[];
  employeeRanking: EmployeeAppointmentCount[];
  timeSlots: TimeSlotData[];

  // Revenue Analytics (NEW)
  revenueAnalytics: RevenueAnalytics | null;
  dailyRevenue: RevenuePeriod[];
  monthlyRevenue: RevenuePeriod[];
  employeeRevenue: EmployeeRevenueDetailed[];
  paymentMethods: PaymentMethodData[];

  // Metadata
  dateRange: {
    startDate: string; // ISO format
    endDate: string; // ISO format
  };
}

// ========================================
// Hook Return Type
// ========================================

export interface UseDashboardAnalyticsReturn {
  data: DashboardAnalyticsData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ========================================
// Export Data Types (for CSV/Excel/PDF)
// ========================================

export interface AnalyticsExportData {
  businessName: string;
  reportPeriod: string;
  generatedDate: string;

  summary: {
    totalRevenue: number;
    totalAppointments: number;
    totalClients: number;
    completionRate: number;
  };

  timeSlots: TimeSlotData[];
  employees: EmployeeAppointmentCount[];
  services: ServiceData[];
  monthlyTrend: MonthlyAppointments[];
  weekdayDistribution: WeekdayData[];
}
