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

export interface BusinessSetupData {
  name: string
  description?: string
  phone?: string
  email?: string
  website?: string
  address: string
  business_category_id: string
  latitude?: number
  longitude?: number
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
  created_at: string
  updated_at: string
  business_categories?: BusinessCategory
}

export interface BusinessCategory {
  id: string
  name: string
  description?: string
  icon_url?: string
  created_at: string
}

export type AppointmentStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show'

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

export interface AppointmentService {
  id: string
  appointment_id: string
  service_id: string
  price: number
  created_at: string
  services?: Service
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

export interface Appointment {
  id: string
  business_id: string
  client_id: string | null
  employee_id?: string
  appointment_date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  total_price: number
  notes?: string
  client_notes?: string
  created_at: string
  updated_at: string
  walk_in_client_name?: string
  walk_in_client_phone?: string
  businesses?: Business
  users?: User
  employees?: Employee
  appointment_services?: AppointmentService[]
}

export interface BusinessStats {
  total_appointments: number
  pending_appointments: number
  confirmed_appointments: number
  total_employees: number
  total_services: number
}

export type NotificationType = 
  | 'appointment_confirmed' 
  | 'appointment_reminder' 
  | 'appointment_cancelled' 
  | 'appointment_rescheduled'

export interface Notification {
  id: string
  user_id: string
  appointment_id?: string
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  sent_at?: string
  created_at: string
}