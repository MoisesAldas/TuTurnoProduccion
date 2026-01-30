import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { format, getYear } from "date-fns";
import type {
  DashboardAnalyticsData,
  DashboardFilters,
  UseDashboardAnalyticsReturn,
  UniqueClientsCount,
  TimeSlotData,
  MonthlyAppointments,
  EmployeeAppointmentCount,
  WeekdayData,
  ServiceData,
  DashboardKPIs,
  RevenueAnalytics,
  RevenuePeriod,
  EmployeeRevenueDetailed,
  PaymentMethodData,
  DailyAppointmentStats,
} from "@/types/analytics";

/**
 * Custom hook for fetching dashboard analytics data
 * Calls multiple RPC functions in parallel for optimal performance
 */
export function useDashboardAnalytics(
  businessId: string | undefined,
  filters: DashboardFilters,
): UseDashboardAnalyticsReturn {
  const [data, setData] = useState<DashboardAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  // Cache for monthly appointments data by year
  const monthlyDataCache = useRef<Map<number, MonthlyAppointments[]>>(
    new Map(),
  );
  const lastFetchedYear = useRef<number | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Format dates for RPC calls
      const startDate = format(filters.startDate, "yyyy-MM-dd");
      const endDate = format(filters.endDate, "yyyy-MM-dd");

      // Check if we need to fetch monthly data (only if year changed)
      const currentYear = getYear(filters.startDate);
      const shouldFetchMonthly = currentYear !== lastFetchedYear.current;

      // Prepare monthly data promise - either fetch or use cache
      const monthlyPromise = shouldFetchMonthly
        ? supabase.rpc("get_appointments_by_month", {
            p_business_id: businessId,
            p_months_back: 12,
          })
        : Promise.resolve({
            data: monthlyDataCache.current.get(currentYear) || [],
            error: null,
          });

      // Parallel RPC calls for maximum performance
      const [
        clientsResult,
        kpisResult,
        weekdayResult,
        monthlyResult,
        servicesResult,
        employeeResult,
        timeSlotsResult,
        // NEW: Revenue analytics calls
        revenueAnalyticsResult,
        dailyRevenueResult,
        monthlyRevenueResult,
        employeeRevenueResult,
        paymentMethodsResult,
        // NEW: Daily appointment statistics
        dailyStatsResult,
        // NEW: Total appointments all statuses
        totalAppointmentsAllStatusesResult,
      ] = await Promise.all([
        // 1. Unique clients count
        supabase.rpc("get_unique_clients_count", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
        }),

        // 2. Dashboard KPIs with trends
        supabase.rpc("get_dashboard_kpis", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
        }),

        // 3. Appointments by weekday (with date range)
        supabase.rpc("get_appointments_by_weekday_range", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
        }),

        // 4. Appointments by month (cached or fetched based on year)
        monthlyPromise,

        // 5. Top 5 services
        supabase.rpc("get_top_services_dashboard", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_limit: 5,
        }),

        // 6. Top 5 employees by appointment count
        supabase.rpc("get_employee_appointment_count", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_limit: 5,
        }),

        // 7. Appointments by time slot
        supabase.rpc("get_appointments_by_time_slot", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
        }),

        // 8. Revenue analytics (NEW)
        supabase.rpc("get_revenue_analytics", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
        }),

        // 9. Daily revenue (NEW)
        supabase.rpc("get_revenue_by_period", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_period_type: "day",
        }),

        // 10. Monthly revenue (NEW)
        supabase.rpc("get_revenue_by_period", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_period_type: "month",
        }),

        // 11. Employee revenue - calculated from appointments with paid invoices
        supabase
          .from("appointments")
          .select(
            `
            employee_id,
            employees!inner(first_name, last_name),
            invoices!inner(total, status)
          `,
          )
          .eq("business_id", businessId)
          .gte("appointment_date", startDate)
          .lte("appointment_date", endDate)
          .eq("invoices.status", "paid"),

        // 12. Payment methods (NEW - using existing function)
        supabase.rpc("get_revenue_by_payment_method", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
        }),

        // 13. Daily appointment statistics (NEW)
        supabase.rpc("get_daily_appointment_stats", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
        }),

        // 14. Total appointments all statuses (NEW)
        supabase.rpc("get_total_appointments_all_statuses", {
          p_business_id: businessId,
          p_start_date: startDate,
          p_end_date: endDate,
        }),
      ]);

      // Check for errors
      if (clientsResult.error) throw clientsResult.error;
      if (kpisResult.error) throw kpisResult.error;
      if (weekdayResult.error) throw weekdayResult.error;
      if (monthlyResult.error) throw monthlyResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (employeeResult.error) throw employeeResult.error;
      if (timeSlotsResult.error) throw timeSlotsResult.error;
      if (revenueAnalyticsResult.error) throw revenueAnalyticsResult.error;
      if (dailyRevenueResult.error) throw dailyRevenueResult.error;
      if (monthlyRevenueResult.error) throw monthlyRevenueResult.error;
      if (employeeRevenueResult.error) throw employeeRevenueResult.error;
      if (paymentMethodsResult.error) throw paymentMethodsResult.error;
      if (dailyStatsResult.error) throw dailyStatsResult.error;
      if (totalAppointmentsAllStatusesResult.error)
        throw totalAppointmentsAllStatusesResult.error;

      // Transform employee revenue data from appointments query
      const transformedEmployeeRevenue: EmployeeRevenueDetailed[] = [];
      const revenueByEmployee = new Map<string, number>();

      (employeeRevenueResult.data || []).forEach((item: any) => {
        const empId = item.employee_id;
        const empName = `${item.employees?.first_name || ""} ${
          item.employees?.last_name || ""
        }`.trim();
        const invoiceTotal = item.invoices?.total || 0;

        const current = revenueByEmployee.get(empId) || 0;
        revenueByEmployee.set(empId, current + invoiceTotal);

        // Store employee name for later
        if (!transformedEmployeeRevenue.find((e) => e.employee_id === empId)) {
          transformedEmployeeRevenue.push({
            month_label: format(filters.startDate, "MMM yyyy"),
            month_date: startDate,
            employee_id: empId,
            employee_name: empName,
            total_revenue: 0, // Will be updated below
          });
        }
      });

      // Update totals
      transformedEmployeeRevenue.forEach((emp) => {
        emp.total_revenue = revenueByEmployee.get(emp.employee_id) || 0;
      });

      // Update monthly data cache if we fetched new data
      const monthlyData = (monthlyResult.data as MonthlyAppointments[]) || [];
      if (shouldFetchMonthly && monthlyData.length > 0) {
        monthlyDataCache.current.set(currentYear, monthlyData);
        lastFetchedYear.current = currentYear;
      }

      // Process and set data
      const analyticsData: DashboardAnalyticsData = {
        kpis: kpisResult.data?.[0] || null,
        uniqueClients: clientsResult.data?.[0] || null,
        totalAppointmentsAllStatuses:
          totalAppointmentsAllStatusesResult.data?.[0]
            ?.total_appointments_all_statuses || 0,
        appointmentsByWeekday: (weekdayResult.data as WeekdayData[]) || [],
        appointmentsByMonth: monthlyData,
        topServices: (servicesResult.data as ServiceData[]) || [],
        employeeRanking:
          (employeeResult.data as EmployeeAppointmentCount[]) || [],
        timeSlots: (timeSlotsResult.data as TimeSlotData[]) || [],
        dailyStats: (dailyStatsResult.data as DailyAppointmentStats[]) || [],
        // Revenue analytics (NEW)
        revenueAnalytics: revenueAnalyticsResult.data?.[0] || null,
        dailyRevenue: (dailyRevenueResult.data as RevenuePeriod[]) || [],
        monthlyRevenue: (monthlyRevenueResult.data as RevenuePeriod[]) || [],
        employeeRevenue: transformedEmployeeRevenue,
        paymentMethods:
          (paymentMethodsResult.data as PaymentMethodData[]) || [],
        dateRange: {
          startDate,
          endDate,
        },
      };

      setData(analyticsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      console.error("Error fetching dashboard analytics:", err);
      setError(err instanceof Error ? err : new Error(errorMessage));

      toast({
        variant: "destructive",
        title: "Error al cargar analytics",
        description:
          "No se pudieron cargar los datos del dashboard. Por favor intenta nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  }, [businessId, filters.startDate, filters.endDate, supabase, toast]);

  // Fetch data when businessId or filters change
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
