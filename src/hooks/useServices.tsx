'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import type { Service } from '@/types/database'

interface CreateServiceData {
  business_id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
  is_active?: boolean
}

interface UpdateServiceData {
  name?: string
  description?: string
  price?: number
  duration_minutes?: number
  is_active?: boolean
}

interface UseServicesReturn {
  services: Service[]
  loading: boolean
  error: string | null
  fetchServices: (businessId: string) => Promise<void>
  createService: (data: CreateServiceData) => Promise<Service | null>
  updateService: (serviceId: string, data: UpdateServiceData) => Promise<boolean>
  deleteService: (serviceId: string) => Promise<boolean>
  toggleServiceStatus: (serviceId: string, isActive: boolean) => Promise<boolean>
  getActiveServices: (businessId: string) => Promise<Service[]>
  getServiceById: (serviceId: string) => Promise<Service | null>
  refreshServices: () => Promise<void>
}

export function useServices(businessId?: string): UseServicesReturn {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchServices = useCallback(async (busId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', busId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setServices(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar servicios'
      setError(errorMessage)
      console.error('Error fetching services:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const createService = useCallback(async (data: CreateServiceData): Promise<Service | null> => {
    try {
      setLoading(true)
      setError(null)

      const { data: newService, error: createError } = await supabase
        .from('services')
        .insert([{
          business_id: data.business_id,
          name: data.name,
          description: data.description || null,
          price: data.price,
          duration_minutes: data.duration_minutes,
          is_active: data.is_active ?? true
        }])
        .select()
        .single()

      if (createError) {
        throw new Error(createError.message)
      }

      // Actualizar lista local
      setServices(prev => [newService, ...prev])

      return newService
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear servicio'
      setError(errorMessage)
      console.error('Error creating service:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const updateService = useCallback(async (serviceId: string, data: UpdateServiceData): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: updatedService, error: updateError } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', serviceId)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Actualizar lista local
      setServices(prev =>
        prev.map(service =>
          service.id === serviceId ? updatedService : service
        )
      )

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar servicio'
      setError(errorMessage)
      console.error('Error updating service:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const deleteService = useCallback(async (serviceId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      // Soft delete - marcar como inactivo
      const { error: deleteError } = await supabase
        .from('services')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      // Remover de lista local
      setServices(prev => prev.filter(service => service.id !== serviceId))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar servicio'
      setError(errorMessage)
      console.error('Error deleting service:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const toggleServiceStatus = useCallback(async (serviceId: string, isActive: boolean): Promise<boolean> => {
    try {
      setError(null)

      const { data: updatedService, error: updateError } = await supabase
        .from('services')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Actualizar lista local
      setServices(prev =>
        prev.map(service =>
          service.id === serviceId ? updatedService : service
        )
      )

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar estado del servicio'
      setError(errorMessage)
      console.error('Error toggling service status:', err)
      return false
    }
  }, [supabase])

  const getActiveServices = useCallback(async (busId: string): Promise<Service[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', busId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      return data || []
    } catch (err) {
      console.error('Error fetching active services:', err)
      return []
    }
  }, [supabase])

  const getServiceById = useCallback(async (serviceId: string): Promise<Service | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      return data
    } catch (err) {
      console.error('Error fetching service by id:', err)
      return null
    }
  }, [supabase])

  const refreshServices = useCallback(async () => {
    if (businessId) {
      await fetchServices(businessId)
    }
  }, [fetchServices, businessId])

  return {
    services,
    loading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService,
    toggleServiceStatus,
    getActiveServices,
    getServiceById,
    refreshServices
  }
}