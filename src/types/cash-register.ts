/**
 * Tipos TypeScript para el Sistema de Cierre de Caja
 */

// =============================================================================
// ENUMS Y TIPOS BASE
// =============================================================================

export type CashSessionStatus = 'open' | 'closed'

export type ExpenseCategory =
  | 'supplies'      // Insumos/Materiales
  | 'services'      // Servicios
  | 'withdrawal'    // Retiros
  | 'refund'        // Devoluciones
  | 'petty_cash'    // Caja Chica
  | 'other'         // Otros

export type DenominationType = 'bill' | 'coin'

export type DifferenceType = 'exacto' | 'faltante' | 'sobrante'

// =============================================================================
// INTERFACES DE TABLAS
// =============================================================================

export interface CashRegisterSession {
  id: string
  business_id: string
  opened_by: string
  closed_by: string | null
  opened_at: string
  closed_at: string | null
  status: CashSessionStatus
  initial_cash_amount: number
  expected_cash_total: number | null
  actual_cash_counted: number | null
  cash_difference: number | null
  total_cash_sales: number | null
  total_transfer_sales: number | null
  total_expenses: number | null
  opening_notes: string | null
  closing_notes: string | null
  created_at: string
  updated_at: string
}

export interface CashRegisterExpense {
  id: string
  session_id: string
  business_id: string
  amount: number
  category: ExpenseCategory
  description: string
  receipt_url: string | null
  created_by: string
  created_at: string
}

export interface CashDenomination {
  id: string
  session_id: string
  denomination_type: DenominationType
  denomination_value: number
  quantity: number
  total: number
  created_at: string
}

// =============================================================================
// INTERFACES CON RELACIONES (JOINS)
// =============================================================================

export interface CashSessionWithUsers extends CashRegisterSession {
  opener: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  closer: {
    id: string
    first_name: string
    last_name: string
    email: string
  } | null
}

export interface CashExpenseWithUser extends CashRegisterExpense {
  creator: {
    id: string
    first_name: string
    last_name: string
  }
}

// =============================================================================
// RESPONSE TYPES (Funciones SQL)
// =============================================================================

export interface OpenCashRegisterResponse {
  success: boolean
  session_id: string
  message: string
  opened_at: string
  initial_cash_amount: number
}

export interface AddExpenseResponse {
  success: boolean
  expense_id: string
  amount: number
  category: ExpenseCategory
  message: string
}

export interface AddDenominationResponse {
  success: boolean
  denomination_value: number
  quantity: number
  total: number
  message: string
}

export interface CloseCashRegisterResponse {
  success: boolean
  session_id: string
  message: string
  closed_at: string
  summary: {
    initial_cash: number
    cash_sales: number
    transfer_sales: number
    total_expenses: number
    expected_cash: number
    actual_cash: number
    difference: number
    difference_type: DifferenceType
  }
}

export interface SessionSummaryResponse {
  session_id: string
  business_id: string
  status: CashSessionStatus
  opened_at: string
  closed_at: string | null
  opened_by: {
    id: string
    name: string
  }
  closed_by: {
    id: string
    name: string
  } | null
  initial_cash: number
  cash_sales: number
  transfer_sales: number
  total_sales: number
  total_expenses: number
  expected_cash: number
  actual_cash: number | null
  difference: number | null
  difference_type: DifferenceType | null
  expenses: Array<{
    id: string
    amount: number
    category: ExpenseCategory
    description: string
    created_at: string
  }>
  denominations: Array<{
    type: DenominationType
    value: number
    quantity: number
    total: number
  }>
}

export interface CurrentOpenSessionResponse {
  session_id: string | null
  business_id: string
  opened_at: string | null
  opened_by: {
    id: string
    name: string
  } | null
  initial_cash: number | null
  current_cash_sales: number | null
  current_transfer_sales: number | null
  current_expenses: number | null
  expected_cash: number | null
}

// =============================================================================
// TIPOS PARA REPORTES
// =============================================================================

export interface DailyPerformanceReport {
  date: string
  business_id: string
  sessions: Array<{
    session_id: string
    opened_at: string
    closed_at: string | null
    status: CashSessionStatus
    opened_by: string
    closed_by: string | null
    duration_hours: number
    initial_cash: number
    cash_sales: number
    transfer_sales: number
    total_expenses: number
    expected_cash: number
    actual_cash: number | null
    difference: number | null
    difference_type: DifferenceType | null
    expenses_count: number
  }>
  totals: {
    sessions_count: number
    total_cash_sales: number
    total_transfer_sales: number
    total_sales: number
    total_expenses: number
    total_differences: number
    net_cash_flow: number
  }
}

export interface MonthlyPerformanceReport {
  period: {
    year: number
    month: number
    start_date: string
    end_date: string
  }
  summary: {
    total_sessions: number
    total_cash_sales: number
    total_transfer_sales: number
    total_sales: number
    total_expenses: number
    net_cash_flow: number
    avg_cash_sales_per_session: number
    avg_transfer_sales_per_session: number
    total_shortages: number
    total_surpluses: number
    exact_closures: number
    shortage_closures: number
    surplus_closures: number
    accuracy_rate: number
  }
  daily_breakdown: Array<{
    date: string
    sessions: number
    cash_sales: number
    transfer_sales: number
    expenses: number
    difference: number
  }>
}

// =============================================================================
// FORM TYPES (Para formularios)
// =============================================================================

export interface OpenCashFormData {
  initial_cash_amount: number
  opening_notes: string
}

export interface AddExpenseFormData {
  amount: number
  category: ExpenseCategory
  description: string
  receipt_file?: File | null
}

export interface CloseCashFormData {
  actual_cash_counted: number
  closing_notes: string
  use_denominations: boolean
  denominations?: Array<{
    denomination_type: DenominationType
    denomination_value: number
    quantity: number
  }>
}

// =============================================================================
// CONSTANTES
// =============================================================================

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  supplies: 'Insumos/Materiales',
  services: 'Servicios',
  withdrawal: 'Retiros',
  refund: 'Devoluciones',
  petty_cash: 'Caja Chica',
  other: 'Otros',
}

export const DENOMINATIONS_USD = {
  bills: [100, 50, 20, 10, 5, 1],
  coins: [1, 0.5, 0.25, 0.1, 0.05, 0.01],
}

export const DENOMINATION_LABELS: Record<number, string> = {
  100: '$100',
  50: '$50',
  20: '$20',
  10: '$10',
  5: '$5',
  1: '$1',
  0.5: '50¢',
  0.25: '25¢',
  0.1: '10¢',
  0.05: '5¢',
  0.01: '1¢',
}
