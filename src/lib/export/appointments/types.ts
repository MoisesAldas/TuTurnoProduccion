/**
 * Tipos para exportación de citas
 */

export type AppointmentExportRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number | null;
  employee_name: string | null;
  client_name: string | null;
  client_phone: string | null;
  is_walk_in: boolean;
  service_names: string[] | null;
};

export type AppointmentExportParams = {
  businessName: string;
  data: AppointmentExportRow[];
  dateFrom?: string;
  dateTo?: string;
};
