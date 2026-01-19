/**
 * DataProcessor - Core Module
 * Transforma datos del dashboard al formato de exportación modular
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DashboardAnalyticsData } from "@/types/analytics";
import type {
  AnalyticsExportData,
  BusinessInfo,
  ReportMetadata,
  KPISummary,
  RevenueByPeriod,
  EmployeePerformance,
  ServicePerformance,
  PaymentMethodData,
  WeekdayData,
  TimeSlotData,
} from "../types";

/**
 * Input interface para el processor
 */
export interface ProcessorInput {
  dashboardData: DashboardAnalyticsData;
  businessInfo: BusinessInfo;
  startDate: Date;
  endDate: Date;
}

/**
 * DataProcessor Class
 * Centraliza la lógica de transformación de datos
 */
export class DataProcessor {
  /**
   * Procesa todos los datos y retorna el formato de exportación
   */
  static async process(input: ProcessorInput): Promise<AnalyticsExportData> {
    const { dashboardData, businessInfo, startDate, endDate } = input;

    // Fetch all services for export (not just top 5)
    const services = await this.buildServicePerformance(
      dashboardData,
      businessInfo.id,
      startDate,
      endDate
    );

    return {
      business: businessInfo,
      metadata: this.buildMetadata(startDate, endDate),
      summary: this.buildKPISummary(dashboardData),
      dailyRevenue: this.buildDailyRevenue(dashboardData),
      monthlyRevenue: this.buildMonthlyRevenue(dashboardData),
      weekdayRevenue: this.buildWeekdayRevenue(dashboardData),
      employees: this.buildEmployeePerformance(dashboardData),
      services,
      timeSlots: this.buildTimeSlots(dashboardData),
      payments: this.buildPayments(dashboardData),
    };
  }

  /**
   * Construye metadata del reporte
   */
  private static buildMetadata(startDate: Date, endDate: Date): ReportMetadata {
    const reportPeriod = this.formatReportPeriod(startDate, endDate);
    const generatedDate = format(new Date(), "dd 'de' MMMM, yyyy", {
      locale: es,
    });

    return {
      reportPeriod,
      generatedDate,
      generatedBy: "TuTurno Análisis y Desempeño",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  /**
   * Formatea el período del reporte de forma inteligente
   */
  private static formatReportPeriod(startDate: Date, endDate: Date): string {
    const start = format(startDate, "dd/MM/yyyy");
    const end = format(endDate, "dd/MM/yyyy");

    // Si es el mismo mes
    if (
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear()
    ) {
      return format(startDate, "MMMM yyyy", { locale: es });
    }

    // Si es el mismo año
    if (startDate.getFullYear() === endDate.getFullYear()) {
      return `${start} - ${end}`;
    }

    // Rango completo
    return `${start} - ${end}`;
  }

  /**
   * Construye resumen de KPIs
   */
  private static buildKPISummary(data: DashboardAnalyticsData): KPISummary {
    const kpis = data.kpis;
    const totalAppointments = kpis?.total_appointments || 0;
    const completedAppointments = Math.round(
      (totalAppointments * (kpis?.completion_rate || 0)) / 100
    );
    const cancelledAppointments = totalAppointments - completedAppointments;

    return {
      totalRevenue: data.revenueAnalytics?.total_revenue || 0,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      noShowAppointments: 0, // TODO: Add when available
      averageTicket: data.revenueAnalytics?.average_ticket || 0,
      uniqueClients: data.uniqueClients?.total_unique_clients || 0,
      completionRate: kpis?.completion_rate || 0,
      cancellationRate:
        totalAppointments > 0
          ? (cancelledAppointments / totalAppointments) * 100
          : 0,
    };
  }

  /**
   * Construye datos de ingresos diarios
   */
  private static buildDailyRevenue(
    data: DashboardAnalyticsData
  ): RevenueByPeriod[] {
    return data.dailyRevenue.map((item) => ({
      period_label: item.period_label,
      period_date: item.period_date,
      revenue: item.revenue,
      invoice_count: item.invoice_count,
      appointment_count: item.appointment_count,
    }));
  }

  /**
   * Construye datos de ingresos mensuales
   */
  private static buildMonthlyRevenue(
    data: DashboardAnalyticsData
  ): RevenueByPeriod[] {
    return data.monthlyRevenue.map((item) => ({
      period_label: item.period_label,
      period_date: item.period_date,
      revenue: item.revenue,
      invoice_count: item.invoice_count,
      appointment_count: item.appointment_count,
    }));
  }

  /**
   * Construye datos de ingresos por día de semana
   */
  private static buildWeekdayRevenue(
    data: DashboardAnalyticsData
  ): WeekdayData[] {
    // Mapear weekday data con revenue estimado
    return data.appointmentsByWeekday.map((item) => ({
      day_of_week: item.day_of_week,
      day_name: this.getFullDayName(item.day_name),
      appointment_count: item.appointment_count,
      revenue: 0, // TODO: Calculate actual revenue per weekday
    }));
  }

  /**
   * Convierte nombre corto de día a nombre completo
   */
  private static getFullDayName(abbr: string): string {
    const dayMap: Record<string, string> = {
      Dom: "Domingo",
      Lun: "Lunes",
      Mar: "Martes",
      Mié: "Miércoles",
      Jue: "Jueves",
      Vie: "Viernes",
      Sáb: "Sábado",
    };
    return dayMap[abbr] || abbr;
  }

  /**
   * Construye performance de empleados
   */
  private static buildEmployeePerformance(
    data: DashboardAnalyticsData
  ): EmployeePerformance[] {
    // Primero, crear un mapa de employee_id -> revenue para acceso rápido
    const revenueMap = new Map<string, number>();

    data.employeeRevenue.forEach((rev) => {
      const empId = String(rev.employee_id || "");
      if (empId) {
        // Sumar si ya existe (por si hay múltiples entradas por mes)
        const currentRevenue = revenueMap.get(empId) || 0;
        const newRevenue = rev.total_revenue || 0;
        revenueMap.set(empId, currentRevenue + newRevenue);
      }
    });

    // Ahora mapear employeeRanking con su revenue correspondiente
    return data.employeeRanking.map((emp) => {
      const empId = String(emp.employee_id || "");
      const totalRevenue = revenueMap.get(empId) || 0;
      const completedCount = emp.completed_count || 0;

      return {
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        total_appointments: emp.appointment_count,
        completed_appointments: completedCount,
        total_revenue: totalRevenue,
        average_ticket: completedCount > 0 ? totalRevenue / completedCount : 0,
        completion_rate: emp.completion_rate,
      };
    });
  }

  /**
   * Construye performance de servicios
   * Fetches ALL services for export (not just top 5 from dashboard)
   */
  private static async buildServicePerformance(
    data: DashboardAnalyticsData,
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ServicePerformance[]> {
    // Import supabase client dynamically to avoid circular dependencies
    const { createClient } = await import("@/lib/supabaseClient");
    const { format } = await import("date-fns");
    const supabase = createClient();

    // Fetch ALL services for export (not limited to top 5)
    const { data: allServices, error } = await supabase.rpc(
      "get_top_services_dashboard",
      {
        p_business_id: businessId,
        p_start_date: format(startDate, "yyyy-MM-dd"),
        p_end_date: format(endDate, "yyyy-MM-dd"),
        p_limit: 1000, // Get all services
      }
    );

    if (error || !allServices || allServices.length === 0) {
      console.error("Error fetching all services for export:", error);
      // Fallback to dashboard data if fetch fails
      const totalRevenue = data.revenueAnalytics?.total_revenue || 1;
      return data.topServices.map((service) => ({
        service_id: service.service_id,
        service_name: service.service_name,
        times_sold: service.booking_count,
        total_revenue: service.total_revenue,
        average_price: service.avg_price,
        percentage_of_total: (service.total_revenue / totalRevenue) * 100,
      }));
    }

    // Calculate total revenue from ALL services (not total business revenue)
    const totalServicesRevenue = allServices.reduce(
      (sum: number, s: any) => sum + (s.total_revenue || 0),
      0
    );

    // Map all services with correct percentage calculation
    return allServices.map((service: any) => ({
      service_id: service.service_id,
      service_name: service.service_name,
      times_sold: service.booking_count,
      total_revenue: service.total_revenue,
      average_price: service.avg_price,
      percentage_of_total:
        totalServicesRevenue > 0
          ? (service.total_revenue / totalServicesRevenue) * 100
          : 0,
    }));
  }

  /**
   * Construye datos de time slots
   */
  private static buildTimeSlots(data: DashboardAnalyticsData): TimeSlotData[] {
    return data.timeSlots.map((slot) => ({
      time_slot: slot.time_slot,
      hour_start: slot.hour_start,
      appointment_count: slot.appointment_count,
    }));
  }

  /**
   * Construye datos de métodos de pago
   */
  private static buildPayments(
    data: DashboardAnalyticsData
  ): PaymentMethodData[] {
    return data.paymentMethods.map((payment) => ({
      payment_method:
        payment.payment_method === "Efectivo" ? "cash" : "transfer",
      payment_method_label: payment.payment_method,
      total_amount: payment.total_amount,
      transaction_count: payment.transaction_count,
      percentage: payment.percentage,
    }));
  }
}
