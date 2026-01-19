export interface ServiceEmployeePair {
  service: Service;
  employee: Employee | null;
  employees: Employee[]; // Empleados disponibles para este servicio
  isSelected: boolean;
  isCompatible: boolean;
  disabledReason?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  avatar_url?: string;
  is_active: boolean;
}

export interface AppointmentServiceCreate {
  service_id: string;
  employee_id: string;
  price: number;
  start_time?: string;
  end_time?: string;
  sequence_order: number;
}
