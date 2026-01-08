/**
 * Hook principal para operaciones del Sistema de Cierre de Caja
 * Maneja todas las operaciones CRUD y funciones SQL
 */

'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import type {
  OpenCashRegisterResponse,
  AddExpenseResponse,
  AddDenominationResponse,
  CloseCashRegisterResponse,
  SessionSummaryResponse,
  DailyPerformanceReport,
  ExpenseCategory,
  DenominationType,
} from '@/types/cash-register'

interface UseCashRegisterReturn {
  // Estados
  isLoading: boolean
  error: string | null

  // Operaciones de sesión
  openCashRegister: (params: {
    businessId: string
    userId: string
    initialCashAmount: number
    openingNotes?: string
  }) => Promise<OpenCashRegisterResponse | null>

  closeCashRegister: (params: {
    sessionId: string
    userId: string
    actualCashCounted?: number
    closingNotes?: string
  }) => Promise<CloseCashRegisterResponse | null>

  // Operaciones de gastos
  addExpense: (params: {
    sessionId: string
    businessId: string
    amount: number
    category: ExpenseCategory
    description: string
    createdBy: string
    receiptUrl?: string
  }) => Promise<AddExpenseResponse | null>

  // Operaciones de denominaciones
  addDenomination: (params: {
    sessionId: string
    denominationType: DenominationType
    denominationValue: number
    quantity: number
  }) => Promise<AddDenominationResponse | null>

  // Consultas
  getSessionSummary: (sessionId: string) => Promise<SessionSummaryResponse | null>
  getDailyReport: (businessId: string, date?: string) => Promise<DailyPerformanceReport | null>
}

export function useCashRegister(): UseCashRegisterReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // ==========================================================================
  // ABRIR CAJA
  // ==========================================================================
  const openCashRegister = useCallback(
    async (params: {
      businessId: string
      userId: string
      initialCashAmount: number
      openingNotes?: string
    }): Promise<OpenCashRegisterResponse | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: rpcError } = await supabase.rpc('open_cash_register', {
          p_business_id: params.businessId,
          p_user_id: params.userId,
          p_initial_cash_amount: params.initialCashAmount,
          p_opening_notes: params.openingNotes || null,
        })

        if (rpcError) throw rpcError

        return data as OpenCashRegisterResponse
      } catch (err) {
        console.error('Error opening cash register:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al abrir caja'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  // ==========================================================================
  // CERRAR CAJA
  // ==========================================================================
  const closeCashRegister = useCallback(
    async (params: {
      sessionId: string
      userId: string
      actualCashCounted?: number
      closingNotes?: string
    }): Promise<CloseCashRegisterResponse | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: rpcError } = await supabase.rpc('close_cash_register', {
          p_session_id: params.sessionId,
          p_user_id: params.userId,
          p_actual_cash_counted: params.actualCashCounted ?? null,
          p_closing_notes: params.closingNotes || null,
        })

        if (rpcError) throw rpcError

        return data as CloseCashRegisterResponse
      } catch (err) {
        console.error('Error closing cash register:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al cerrar caja'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  // ==========================================================================
  // AGREGAR GASTO
  // ==========================================================================
  const addExpense = useCallback(
    async (params: {
      sessionId: string
      businessId: string
      amount: number
      category: ExpenseCategory
      description: string
      createdBy: string
      receiptUrl?: string
    }): Promise<AddExpenseResponse | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: rpcError } = await supabase.rpc('add_cash_expense', {
          p_session_id: params.sessionId,
          p_business_id: params.businessId,
          p_amount: params.amount,
          p_category: params.category,
          p_description: params.description,
          p_created_by: params.createdBy,
          p_receipt_url: params.receiptUrl || null,
        })

        if (rpcError) throw rpcError

        return data as AddExpenseResponse
      } catch (err) {
        console.error('Error adding expense:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al registrar gasto'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  // ==========================================================================
  // AGREGAR DENOMINACIÓN
  // ==========================================================================
  const addDenomination = useCallback(
    async (params: {
      sessionId: string
      denominationType: DenominationType
      denominationValue: number
      quantity: number
    }): Promise<AddDenominationResponse | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: rpcError } = await supabase.rpc('add_cash_denomination', {
          p_session_id: params.sessionId,
          p_denomination_type: params.denominationType,
          p_denomination_value: params.denominationValue,
          p_quantity: params.quantity,
        })

        if (rpcError) throw rpcError

        return data as AddDenominationResponse
      } catch (err) {
        console.error('Error adding denomination:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al registrar denominación'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  // ==========================================================================
  // OBTENER RESUMEN DE SESIÓN
  // ==========================================================================
  const getSessionSummary = useCallback(
    async (sessionId: string): Promise<SessionSummaryResponse | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: rpcError } = await supabase.rpc('get_session_summary', {
          p_session_id: sessionId,
        })

        if (rpcError) throw rpcError

        return data as SessionSummaryResponse
      } catch (err) {
        console.error('Error fetching session summary:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar resumen'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  // ==========================================================================
  // OBTENER REPORTE DIARIO
  // ==========================================================================
  const getDailyReport = useCallback(
    async (businessId: string, date?: string): Promise<DailyPerformanceReport | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const { data, error: rpcError } = await supabase.rpc('get_cash_performance_daily', {
          p_business_id: businessId,
          p_date: date || undefined,
        })

        if (rpcError) throw rpcError

        return data as DailyPerformanceReport
      } catch (err) {
        console.error('Error fetching daily report:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar reporte'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  return {
    isLoading,
    error,
    openCashRegister,
    closeCashRegister,
    addExpense,
    addDenomination,
    getSessionSummary,
    getDailyReport,
  }
}
