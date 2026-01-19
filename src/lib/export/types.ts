/**
 * Modular Export System - Core Types
 * Sistema de exportación escalable y adaptable para TuTurno
 */

// ========================================
// BUSINESS INFORMATION (Multi-tenant)
// ========================================

export interface BusinessInfo {
  id: string
  name: string
  category: string // 'salon', 'barbershop', 'spa', 'clinic', etc.
  logoUrl: string | null
  ownerName: string
  address?: string
  phone?: string
  email?: string
}

// ========================================
// REPORT METADATA
// ========================================

export interface ReportMetadata {
  reportPeriod: string // "Enero 2026", "01/01/2026 - 31/01/2026"
  generatedDate: string // "02 de Enero, 2026"
  generatedBy: string // "TuTurno"
  startDate: string // ISO format
  endDate: string // ISO format
}

// ========================================
// ANALYTICS DATA (Normalized)
// ========================================

export interface KPISummary {
  totalRevenue: number
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  noShowAppointments: number
  averageTicket: number
  uniqueClients: number
  completionRate: number // 0-100
  cancellationRate: number // 0-100
}

export interface RevenueByPeriod {
  period_label: string // "Lun 15", "Enero", "Semana 3"
  period_date: string // ISO date
  revenue: number
  invoice_count: number
  appointment_count: number
}

export interface EmployeePerformance {
  employee_id: string
  employee_name: string
  total_appointments: number
  completed_appointments: number
  total_revenue: number
  average_ticket: number
  completion_rate: number // 0-100
}

export interface ServicePerformance {
  service_id: string
  service_name: string
  times_sold: number
  total_revenue: number
  average_price: number
  percentage_of_total: number // 0-100
}

export interface PaymentMethodData {
  payment_method: 'cash' | 'transfer'
  payment_method_label: string // "Efectivo", "Transferencia"
  total_amount: number
  transaction_count: number
  percentage: number // 0-100
}

export interface TimeSlotData {
  time_slot: string // "08:00 - 09:00"
  hour_start: number // 8
  appointment_count: number
}

export interface WeekdayData {
  day_of_week: number // 0-6
  day_name: string // "Lunes", "Martes"
  appointment_count: number
  revenue: number
}

// ========================================
// COMPLETE EXPORT DATA (Modular)
// ========================================

export interface AnalyticsExportData {
  // Business & Report Info
  business: BusinessInfo
  metadata: ReportMetadata

  // KPIs
  summary: KPISummary

  // Revenue Analysis
  dailyRevenue: RevenueByPeriod[]
  monthlyRevenue: RevenueByPeriod[]
  weekdayRevenue: WeekdayData[]

  // Performance
  employees: EmployeePerformance[]
  services: ServicePerformance[]
  timeSlots: TimeSlotData[]

  // Payments
  payments: PaymentMethodData[]

  // Analytics (computed insights)
  insights?: string[] // Generated insights
  alerts?: string[] // Detected alerts
  recommendations?: string[] // Actionable recommendations
}

// ========================================
// EXPORT FORMATS & OPTIONS
// ========================================

export type ExportFormat = 'excel' | 'pdf' // Removed CSV

export type TemplateType = 'executive' | 'standard' | 'detailed'

export interface ExportOptions {
  format: ExportFormat
  template?: TemplateType // Default: 'executive'
  filename?: string
  includeCharts?: boolean // Default: true (Phase 4)
  includeInsights?: boolean // Default: true
}

// ========================================
// ADAPTER INTERFACE (for business types)
// ========================================

export interface BusinessAdapter {
  businessType: string
  formatServiceName: (name: string) => string
  formatEmployeeTitle: (name: string) => string
  getRecommendations: (data: AnalyticsExportData) => string[]
  getInsights: (data: AnalyticsExportData) => string[]
}
