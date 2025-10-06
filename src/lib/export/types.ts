/**
 * Types for Analytics Export Utilities
 * Shared interfaces for CSV, Excel, and PDF exports
 */

export interface AnalyticsExportData {
  // Business Info
  businessName: string
  reportPeriod: string
  generatedDate: string

  // KPIs Summary
  summary: {
    totalRevenue: number
    totalAppointments: number
    completedAppointments: number
    cancelledAppointments: number
    averageTicket: number
    uniqueClients: number
    completionRate: string
  }

  // Daily Revenue Data
  dailyRevenue: Array<{
    date: string
    revenue: number
    appointments_count: number
  }>

  // Employee Performance
  employees: Array<{
    employee_id: string
    employee_name: string
    total_appointments: number
    completed_appointments: number
    total_revenue: number
    average_ticket: number
    completion_rate: number
  }>

  // Top Services
  services: Array<{
    service_id: string
    service_name: string
    times_sold: number
    total_revenue: number
    average_price: number
  }>

  // Payment Distribution
  payments: Array<{
    payment_method: string
    total_amount: number
    transaction_count: number
    percentage: number
  }>
}

export type ExportFormat = 'csv' | 'excel' | 'pdf'

export interface ExportOptions {
  filename?: string
  format: ExportFormat
  data: AnalyticsExportData
}
