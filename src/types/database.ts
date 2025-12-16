// Tipos base completos
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
  is_business_owner: boolean
  is_client: boolean
  created_at: string
  updated_at: string
}

export interface BusinessCategory {
  id: string
  name: string
  description?: string
  icon_url?: string
  created_at: string
}

export interface Business {
  id: string
  owner_id: string
  name: string
  description?: string
  phone?: string
  email?: string
  website?: string
  address: string
  latitude?: number
  longitude?: number
  business_category_id?: string
  logo_url?: string
  cover_image_url?: string
  is_active: boolean
  timezone: string
  allow_overlapping_appointments?: boolean
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  business_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  position?: string
  bio?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  business_id: string
  name: string
  description?: string
  duration_minutes: number
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AppointmentStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show'

export interface Appointment {
  id: string
  business_id: string
  client_id: string | null  // Nullable para walk-in clients
  business_client_id: string | null  // Nullable para clientes del negocio
  employee_id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  total_price: number
  notes?: string
  client_notes?: string
  walk_in_client_name?: string  // Para clientes walk-in
  walk_in_client_phone?: string  // Para clientes walk-in
  created_at: string
  updated_at: string
  // Relaciones opcionales (cuando se hace JOIN en queries)
  users?: {
    first_name: string
    last_name: string
    phone?: string
    avatar_url?: string
    email?: string
  }
  business_clients?: {
    first_name: string
    last_name: string | null
    phone?: string | null
    email?: string | null
  }
  employees?: {
    first_name: string
    last_name: string
  }
  appointment_services?: Array<{
    service_id: string
    price: number
    services?: {
      name: string
      duration_minutes: number
    }
  }>
}

// ============================================================================
// TIPOS ESPECÍFICOS PARA RESPUESTAS DE SUPABASE
// ============================================================================

// Para el dashboard del cliente - búsqueda de negocios
export interface BusinessWithCategory {
  id: string
  name: string
  description?: string | null
  address: string
  business_categories?: {
    name: string
  } | null
}

// Para las citas del cliente
export interface AppointmentWithDetails {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  businesses?: {
    name: string
    address: string
  } | null
  employees?: {
    first_name: string
    last_name: string
  } | null
}

// Para las citas del negocio
export interface AppointmentWithClient {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  users?: {
    first_name: string
    last_name: string
    phone?: string | null
  } | null
  employees?: {
    first_name: string
    last_name: string
  } | null
}

// Para estadísticas del negocio
export interface BusinessStats {
  total_appointments: number
  pending_appointments: number
  confirmed_appointments: number
  total_employees: number
  total_services: number
}

// ============================================================================
// TIPOS PARA FORMULARIOS Y AUTH
// ============================================================================

export interface BusinessFormData {
  name: string
  description?: string
  phone?: string
  email?: string
  website?: string
  address: string
  business_category_id: string
}

export interface AuthState {
  user: User | null
  session: any | null
  loading: boolean
}

export interface ProfileSetupData {
  first_name: string
  last_name: string
  phone?: string
  user_type: 'client' | 'business_owner'
}