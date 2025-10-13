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
    // No suscribirse si no hay businessId
    if (!businessId) {
      if (debug) console.warn('[Realtime] No businessId provided, skipping subscription')
      return
    }

    // Crear canal único por business
    const channelName = `appointments:business_id=eq.${businessId}`

    if (debug) {
      console.log(`[Realtime] Subscribing to channel: ${channelName}`)
    }

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
          if (debug) {
            console.log('[Realtime] 🆕 Nueva cita insertada:', payload.new)
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
          if (debug) {
            console.log('[Realtime] ✏️ Cita actualizada:', payload.new)
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
          if (debug) {
            console.log('[Realtime] 🗑️ Cita eliminada:', payload.old)
          }
          if (payload.old && 'id' in payload.old && payload.old.id) {
            onDelete?.(payload.old.id)
          }
        }
      )
      .subscribe((status) => {
        if (debug) {
          console.log(`[Realtime] Subscription status: ${status}`)
        }

        if (status === 'SUBSCRIBED') {
          if (debug) {
            console.log('[Realtime] ✅ Successfully subscribed to appointments channel')
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ❌ Error subscribing to channel')
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] ⏱️ Subscription timed out')
        }
      })

    // Guardar referencia al canal
    channelRef.current = channel

    // Cleanup: desuscribirse al desmontar o cuando cambie businessId
    return () => {
      if (debug) {
        console.log(`[Realtime] Unsubscribing from channel: ${channelName}`)
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [businessId, debug]) // Solo re-suscribir si cambia businessId

  // No retornamos nada porque el hook maneja todo internamente
  // Los callbacks se ejecutan automáticamente cuando hay eventos
}
