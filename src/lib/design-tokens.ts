/**
 * Design Tokens - TuTurno Client Dashboard
 *
 * Sistema de diseño consistente basado en principios UI/UX
 * Theme: Cliente (Verde Emerald)
 */

// ============================================
// TYPOGRAPHY SYSTEM
// ============================================

export const typography = {
  // Headings
  h1: 'text-3xl font-bold text-gray-900',
  h2: 'text-2xl font-semibold text-gray-900',
  h3: 'text-xl font-semibold text-gray-900',
  h4: 'text-lg font-medium text-gray-900',

  // Body text
  body: 'text-base text-gray-700',
  bodyMedium: 'text-base font-medium text-gray-900',
  bodySmall: 'text-sm text-gray-600',
  bodyLarge: 'text-lg text-gray-700',

  // Labels & captions
  label: 'text-sm font-medium text-gray-900',
  caption: 'text-xs text-gray-500',
  helper: 'text-sm text-gray-500',

  // Links
  link: 'text-emerald-600 hover:text-emerald-700 underline-offset-4 hover:underline transition-colors',

  // Special
  number: 'text-2xl font-bold text-gray-900 tabular-nums',
  price: 'text-xl font-bold text-emerald-600 tabular-nums',
} as const

// ============================================
// COLOR SYSTEM - Cliente Theme (Emerald)
// ============================================

export const colors = {
  // Primary (Cliente)
  primary: {
    DEFAULT: 'bg-emerald-600 text-white hover:bg-emerald-700',
    subtle: 'bg-emerald-50 text-emerald-700',
    outline: 'border-emerald-600 text-emerald-600 hover:bg-emerald-50',
  },

  // Status colors
  status: {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    pending: 'bg-gray-100 text-gray-800',
  },

  // Interactive states
  interactive: {
    hover: 'hover:bg-emerald-50 transition-colors duration-200',
    active: 'bg-emerald-100',
    focus: 'focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
    disabled: 'opacity-50 cursor-not-allowed',
  },
} as const

// ============================================
// GRADIENTS
// ============================================

export const gradients = {
  client: {
    primary: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600',
    subtle: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    card: 'bg-gradient-to-br from-emerald-600 to-teal-500',
  },
} as const

// ============================================
// SPACING SYSTEM
// ============================================

export const spacing = {
  card: {
    padding: 'p-6',
    gap: 'space-y-4',
  },
  section: {
    padding: 'p-4 sm:p-6 lg:p-8',
    gap: 'space-y-6 sm:space-y-8',
  },
  form: {
    gap: 'space-y-6',
    field: 'space-y-2',
  },
} as const

// ============================================
// BORDER & SHADOW SYSTEM
// ============================================

export const effects = {
  border: {
    DEFAULT: 'border border-gray-200',
    focus: 'border-emerald-500',
    error: 'border-red-500',
    success: 'border-emerald-500',
  },
  shadow: {
    card: 'shadow-sm hover:shadow-md transition-shadow',
    elevated: 'shadow-lg',
    float: 'shadow-xl',
  },
  rounded: {
    DEFAULT: 'rounded-lg',
    full: 'rounded-full',
    card: 'rounded-xl',
  },
} as const

// ============================================
// TRANSITIONS & ANIMATIONS
// ============================================

export const animations = {
  transition: {
    fast: 'transition-all duration-150',
    DEFAULT: 'transition-all duration-200',
    slow: 'transition-all duration-300',
  },
  hover: {
    lift: 'hover:-translate-y-1 transition-transform duration-200',
    scale: 'hover:scale-105 transition-transform duration-200',
    glow: 'hover:shadow-lg transition-shadow duration-200',
  },
} as const

// ============================================
// COMPONENT PATTERNS
// ============================================

export const patterns = {
  button: {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg px-4 py-2 font-medium transition-all duration-200',
    secondary: 'bg-white border border-gray-200 hover:bg-gray-50 rounded-lg px-4 py-2 font-medium transition-all duration-200',
    ghost: 'hover:bg-gray-100 rounded-lg px-4 py-2 font-medium transition-all duration-200',
  },

  input: {
    DEFAULT: 'border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200',
    error: 'border-red-500 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 transition-all duration-200',
    success: 'border-emerald-500 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200',
  },

  card: {
    DEFAULT: 'bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow',
    elevated: 'bg-white rounded-xl p-6 shadow-lg',
    interactive: 'bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow hover:bg-emerald-50 transition-colors duration-200 cursor-pointer',
  },

  emptyState: {
    container: 'text-center py-12 px-4',
    icon: 'w-12 h-12 text-gray-400 mx-auto mb-4',
    title: 'text-lg font-medium text-gray-900 mb-2',
    description: 'text-sm text-gray-600 mb-6 max-w-sm mx-auto',
  },

  statCard: {
    container: 'bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow hover:-translate-y-1 transition-transform duration-200',
    icon: 'p-3 rounded-lg',
    value: 'text-2xl font-bold text-gray-900 tabular-nums',
    label: 'text-sm text-gray-600',
  },
} as const

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Combina múltiples clases de tokens
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Obtiene el color de status según el tipo
 */
export function getStatusColor(status: 'success' | 'warning' | 'error' | 'info' | 'pending'): string {
  return colors.status[status]
}
