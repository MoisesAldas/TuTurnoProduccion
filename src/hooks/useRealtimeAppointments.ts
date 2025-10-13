/**
 * useRealtimeAppointments Hook
 *
 * Hook personalizado para suscribirse a cambios en tiempo real de la tabla appointments.
 * Utiliza Supabase Realtime para escuchar eventos INSERT, UPDATE, DELETE.
 *
 * Features:
 * - Filtrado server-side por business_id
 * - Respeta automáticamente RLS policies
 * - Auto-cleanup al desmontar
 * - Callbacks opcionales para cada tipo de evento
 *
 * @example
 * ```tsx
 * useRealtimeAppointments({
 *   businessId: business.id,
 *   onInsert: (appointment) => {
 *     console.log('Nueva cita:', appointment)
 *     // Actualizar estado local
 *   },
 *   onUpdate: (appointment) => {
 *     console.log('Cita actualizada:', appointment)
 *   },
 *   onDelete: (appointmentId) => {
 *     console.log('Cita eliminada:', appointmentId)
 *   }
 * })
 * ```
 */

import { useEffect, useRef } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabaseClient'
import type { Appointment } from '@/types/database'

interface UseRealtimeAppointmentsProps {
  /**
   * ID del negocio para filtrar eventos
   * Solo se recibirán eventos de citas de este negocio
   */
  businessId: string

  /**
   * Callback cuando se inserta una nueva cita
   * @param appointment - La cita recién creada
   */
  onInsert?: (appointment: Appointment) => void

  /**
   * Callback cuando se actualiza una cita existente
   * @param appointment - La cita con los datos actualizados
   */
  onUpdate?: (appointment: Appointment) => void

  /**
   * Callback cuando se elimina una cita
   * @param appointmentId - ID de la cita eliminada
   */
  onDelete?: (appointmentId: string) => void

  /**
   * Opcional: habilitar logs para debugging
   * @default false
   */
  debug?: boolean
}

export function useRealtimeAppointments({
  businessId,
  onInsert,
  onUpdate,
  onDelete,
  debug = false
}: UseRealtimeAppointmentsProps) {
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    console.log('[Realtime] 🚀 Initializing useRealtimeAppointments hook')
    console.log(`[Realtime] 🏢 Business ID: ${businessId}`)
    console.log(`[Realtime] 🐛 Debug mode: ${debug}`)
    
    // No suscribirse si no hay businessId
    if (!businessId) {
      console.warn('[Realtime] ⚠️ No businessId provided, skipping subscription')
      return
    }

    // Crear canal único por business
    const channelName = `appointments:business_id=eq.${businessId}`
    console.log(`[Realtime] 📡 Subscribing to channel: ${channelName}`)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`
        },
        (payload: RealtimePostgresChangesPayload<Appointment>) => {
          console.log('[Realtime] 🆕 Nueva cita insertada:', payload.new)
          if (debug) {
            console.log('[Realtime] 📊 Payload completo INSERT:', payload)
          }
          onInsert?.(payload.new as Appointment)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`
        },
        (payload: RealtimePostgresChangesPayload<Appointment>) => {
          console.log('[Realtime] ✏️ Cita actualizada:', payload.new)
          if (debug) {
            console.log('[Realtime] 📊 Payload completo UPDATE:', payload)
          }
          onUpdate?.(payload.new as Appointment)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`
        },
        (payload: RealtimePostgresChangesPayload<Appointment>) => {
          console.log('[Realtime] 🗑️ Cita eliminada:', payload.old)
          if (debug) {
            console.log('[Realtime] 📊 Payload completo DELETE:', payload)
          }
          if (payload.old && 'id' in payload.old && payload.old.id) {
            onDelete?.(payload.old.id)
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] 📡 Subscription status: ${status}`)
        
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Successfully subscribed to appointments channel')
          console.log(`[Realtime] 🎯 Listening for appointments with business_id: ${businessId}`)
          console.log('[Realtime] 👂 Ready to receive INSERT, UPDATE, DELETE events')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ❌ Error subscribing to channel')
          console.error('[Realtime] 🔍 Check your Supabase configuration and RLS policies')
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] ⏱️ Subscription timed out')
          console.error('[Realtime] 🔄 Try refreshing the page or check your internet connection')
        } else if (status === 'CLOSED') {
          console.warn('[Realtime] 🔌 Channel closed')
        }
      })

    // Guardar referencia al canal
    channelRef.current = channel

    // Cleanup: desuscribirse al desmontar o cuando cambie businessId
    return () => {
      console.log(`[Realtime] 🔌 Unsubscribing from channel: ${channelName}`)
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        console.log('[Realtime] ✅ Channel removed successfully')
      } else {
        console.log('[Realtime] ⚠️ No channel to remove')
      }
    }
  }, [businessId, debug]) // Solo re-suscribir si cambia businessId

  // No retornamos nada porque el hook maneja todo internamente
  // Los callbacks se ejecutan automáticamente cuando hay eventos
}
