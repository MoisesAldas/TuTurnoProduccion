export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string | null
          avatar_url: string | null
          is_business_owner: boolean
          is_client: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          avatar_url?: string | null
          is_business_owner?: boolean
          is_client?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          avatar_url?: string | null
          is_business_owner?: boolean
          is_client?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          phone: string | null
          email: string | null
          website: string | null
          address: string
          latitude: number | null
          longitude: number | null
          business_category_id: string | null
          logo_url: string | null
          cover_image_url: string | null
          is_active: boolean
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          address: string
          latitude?: number | null
          longitude?: number | null
          business_category_id?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          is_active?: boolean
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          address?: string
          latitude?: number | null
          longitude?: number | null
          business_category_id?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          is_active?: boolean
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      // Agregar más tablas según sea necesario
    }
  }
}