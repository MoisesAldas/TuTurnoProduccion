/**
 * Hook para gestionar la sesión activa de caja
 * Optimizado para performance con polling inteligente
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import type { CurrentOpenSessionResponse } from '@/types/cash-register'

interface UseCurrentSessionOptions {
  businessId: string
  pollingInterval?: number // milliseconds (default: 30000 = 30 seconds)
  enabled?: boolean
}

interface UseCurrentSessionReturn {
  session: CurrentOpenSessionResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  hasOpenSession: boolean
}

export function useCurrentSession({
  businessId,
  pollingInterval = 30000,
  enabled = true,
}: UseCurrentSessionOptions): UseCurrentSessionReturn {
  const [session, setSession] = useState<CurrentOpenSessionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSession = useCallback(async () => {
    if (!enabled || !businessId) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('get_current_open_session', {
        p_business_id: businessId,
      })

      if (rpcError) throw rpcError

      setSession(data as CurrentOpenSessionResponse)
    } catch (err) {
      console.error('Error fetching current session:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar sesión')
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }, [businessId, enabled, supabase])

  // Initial fetch
  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // Polling
  useEffect(() => {
    if (!enabled || pollingInterval <= 0) return

    intervalRef.current = setInterval(fetchSession, pollingInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchSession, enabled, pollingInterval])

  const hasOpenSession = session?.session_id !== null && session?.session_id !== undefined

  return {
    session,
    isLoading,
    error,
    refetch: fetchSession,
    hasOpenSession,
  }
}
