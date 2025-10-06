'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

interface Business {
  id: string
  name: string
  description?: string
  address: string
  phone?: string
  email?: string
  website?: string
  business_category_id: string
  is_active: boolean
  created_at: string
  business_categories?: {
    name: string
  }
}

interface BusinessCategory {
  id: string
  name: string
  description?: string
}

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [categories, setCategories] = useState<BusinessCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { authState } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (authState.user?.is_business_owner) {
      fetchBusiness()
    }
    fetchCategories()
  }, [authState.user])

  const fetchBusiness = async () => {
    if (!authState.user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          business_categories (name)
        `)
        .eq('owner_id', authState.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setBusiness(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('business_categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err: any) {
      console.error('Error fetching categories:', err)
    }
  }

  const createBusiness = async (businessData: Omit<Business, 'id' | 'created_at' | 'is_active'>) => {
    if (!authState.user) throw new Error('Usuario no autenticado')

    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert({
          ...businessData,
          owner_id: authState.user.id,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      setBusiness(data)
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updateBusiness = async (updates: Partial<Business>) => {
    if (!business) throw new Error('No hay negocio para actualizar')

    try {
      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', business.id)
        .select()
        .single()

      if (error) throw error

      setBusiness(data)
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  return {
    business,
    categories,
    loading,
    error,
    createBusiness,
    updateBusiness,
    refetch: fetchBusiness
  }
}