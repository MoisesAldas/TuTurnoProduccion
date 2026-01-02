import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
} from "@/types/analytics";

/**
 * Custom hook for fetching dashboard analytics data
 * Calls multiple RPC functions in parallel for optimal performance
 */
export function useDashboardAnalytics(
  businessId: string | undefined,
  filters: DashboardFilters
): UseDashboardAnalyticsReturn {
  const [data, setData] = useState<DashboardAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

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

        // 3. Appointments by weekday
        supabase.rpc("get_appointments_by_weekday", {
          p_business_id: businessId,
          p_period: "custom", // We use custom dates
        }),

        // 4. Appointments by month (last 12 months)
        supabase.rpc("get_appointments_by_month", {
          p_business_id: businessId,
          p_months_back: 12,
        }),

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

        // 11. Employee revenue (NEW - using existing function)
        supabase.rpc("get_revenue_by_employee", {
          p_business_id: businessId,
          p_months_back: 3,
        }),

        // 12. Payment methods (NEW - using existing function)
        supabase.rpc("get_revenue_by_payment_method", {
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

      // Process and set data
      const analyticsData: DashboardAnalyticsData = {
        kpis: kpisResult.data?.[0] || null,
        uniqueClients: clientsResult.data?.[0] || null,
        appointmentsByWeekday: (weekdayResult.data as WeekdayData[]) || [],
        appointmentsByMonth:
          (monthlyResult.data as MonthlyAppointments[]) || [],
        topServices: (servicesResult.data as ServiceData[]) || [],
        employeeRanking:
          (employeeResult.data as EmployeeAppointmentCount[]) || [],
        timeSlots: (timeSlotsResult.data as TimeSlotData[]) || [],
        // Revenue analytics (NEW)
        revenueAnalytics: revenueAnalyticsResult.data?.[0] || null,
        dailyRevenue: (dailyRevenueResult.data as RevenuePeriod[]) || [],
        monthlyRevenue: (monthlyRevenueResult.data as RevenuePeriod[]) || [],
        employeeRevenue:
          (employeeRevenueResult.data as EmployeeRevenueDetailed[]) || [],
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
