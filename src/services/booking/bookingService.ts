import { createClient } from "@/lib/supabaseClient";
import {
  Business,
  Service,
  Employee,
  SpecialHour,
} from "@/hooks/useBookingFlow";

const supabase = createClient();

export const bookingService = {
  /**
   * Fetches core business details for the booking page.
   */
  async getBusiness(
    businessId: string,
  ): Promise<{ data: Business | null; error: any }> {
    return await supabase
      .from("businesses")
      .select(
        "id, name, address, phone, min_booking_hours, max_booking_days, cancellation_policy_text",
      )
      .eq("id", businessId)
      .eq("is_active", true)
      .single();
  },

  /**
   * Fetches active services for a business.
   */
  async getServices(
    businessId: string,
  ): Promise<{ data: Service[] | null; error: any }> {
    return await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name");
  },

  /**
   * Fetches active employees for a business.
   */
  async getEmployees(
    businessId: string,
  ): Promise<{ data: Employee[] | null; error: any }> {
    return await supabase
      .from("employees")
      .select("id, first_name, last_name, position, avatar_url")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("first_name");
  },

  /**
   * Fetches all employee-service mappings.
   */
  async getEmployeeServices(): Promise<{ data: any[] | null; error: any }> {
    return await supabase
      .from("employee_services")
      .select("employee_id, service_id");
  },

  /**
   * Fetches special hours for a business on a specific date.
   */
  async getSpecialHours(
    businessId: string,
    dateStr: string,
  ): Promise<{ data: SpecialHour | null; error: any }> {
    return await supabase
      .from("business_special_hours")
      .select("*")
      .eq("business_id", businessId)
      .eq("special_date", dateStr)
      .maybeSingle();
  },

  /**
   * Fetches regular business hours for a specific day of the week.
   */
  async getBusinessHours(
    businessId: string,
    dayOfWeek: number,
  ): Promise<{ data: any | null; error: any }> {
    return await supabase
      .from("business_hours")
      .select("is_closed, open_time, close_time")
      .eq("business_id", businessId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();
  },

  /**
   * Checks availability for multiple employees with specific durations.
   */
  async getGranularAvailability(params: {
    p_business_id: string;
    p_employee_ids: string[];
    p_durations: number[];
    p_date: string;
    p_business_start: string;
    p_business_end: string;
    p_slot_step_minutes: number;
  }): Promise<{ data: { slot_time: string }[] | null; error: any }> {
    return await supabase.rpc("get_available_time_slots_granular", params);
  },

  /**
   * Submits a complete appointment with multiple services.
   */
  async submitAppointment(params: {
    p_business_id: string;
    p_client_id: string;
    p_employee_id: string;
    p_appointment_date: string;
    p_start_time: string;
    p_end_time: string;
    p_total_price: number;
    p_client_notes: string | null;
    p_services: {
      service_id: string;
      price: number;
      employee_id: string | undefined;
    }[];
  }): Promise<{ data: string | null; error: any }> {
    return await supabase.rpc("create_complete_appointment", params);
  },
};
