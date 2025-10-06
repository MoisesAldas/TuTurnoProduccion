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