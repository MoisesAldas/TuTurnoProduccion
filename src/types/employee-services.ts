// ============================================================================
// TIPOS PARA EMPLOYEE SERVICES
// ============================================================================

export interface EmployeeService {
  id: string;
  employee_id: string;
  service_id: string;
  created_at: string;
}

export interface ServiceWithAssignment {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  is_assigned: boolean; // Indica si está asignado al empleado actual
}

export interface EmployeeWithServices {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  avatar_url?: string;
  is_active: boolean;
  services: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}
