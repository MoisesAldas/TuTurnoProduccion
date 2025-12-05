/**
 * StatsCard - Predefined Color Variants
 *
 * Estos son los gradientes y colores de íconos predefinidos
 * que siguen la línea de diseño de TuTurno.
 */

export const statsCardVariants = {
  // Business Theme - Orange/Amber
  orange: {
    gradientFrom: 'from-orange-100 dark:from-orange-900',
    gradientTo: 'to-amber-100 dark:to-amber-900',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },

  // Success Theme - Emerald/Green
  green: {
    gradientFrom: 'from-emerald-100 dark:from-emerald-900',
    gradientTo: 'to-green-100 dark:to-green-900',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },

  // Info Theme - Blue/Cyan
  blue: {
    gradientFrom: 'from-blue-100 dark:from-blue-900',
    gradientTo: 'to-cyan-100 dark:to-cyan-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },

  // Warning Theme - Yellow/Amber
  yellow: {
    gradientFrom: 'from-yellow-100 dark:from-yellow-900',
    gradientTo: 'to-amber-100 dark:to-amber-900',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },

  // Accent Theme - Purple/Pink
  purple: {
    gradientFrom: 'from-purple-100 dark:from-purple-900',
    gradientTo: 'to-pink-100 dark:to-pink-900',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },

  // Revenue Theme - Green/Emerald
  revenue: {
    gradientFrom: 'from-green-100 dark:from-green-900',
    gradientTo: 'to-emerald-100 dark:to-emerald-900',
    iconColor: 'text-green-600 dark:text-green-400',
  },

  // Neutral Theme - Gray
  gray: {
    gradientFrom: 'from-gray-100 dark:from-gray-800',
    gradientTo: 'to-gray-200 dark:to-gray-700',
    iconColor: 'text-gray-600 dark:text-gray-400',
  },

  // Danger Theme - Red
  red: {
    gradientFrom: 'from-red-100 dark:from-red-900',
    gradientTo: 'to-pink-100 dark:to-pink-900',
    iconColor: 'text-red-600 dark:text-red-400',
  },
}

export type StatsCardVariant = keyof typeof statsCardVariants
