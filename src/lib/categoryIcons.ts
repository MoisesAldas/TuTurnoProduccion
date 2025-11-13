import { Building2, Sparkles, Scissors, Heart, Dumbbell, Activity, type LucideIcon } from 'lucide-react'

/**
 * Mapeo de categorías de negocios a sus iconos correspondientes
 * @param categoryName - Nombre de la categoría del negocio
 * @returns Componente de icono de Lucide correspondiente
 */
export function getCategoryIcon(categoryName?: string): LucideIcon {
  if (!categoryName) return Building2

  const iconMap: Record<string, LucideIcon> = {
    'salón de belleza': Sparkles,
    'salon de belleza': Sparkles,
    'barbería': Scissors,
    'barberia': Scissors,
    'spa': Heart,
    'uñas': Sparkles,
    'masajes': Activity,
    'gimnasio': Dumbbell,
    'clínica': Activity,
    'clinica': Activity,
  }

  return iconMap[categoryName.toLowerCase()] || Building2
}

/**
 * Obtiene el color temático para una categoría
 * @param categoryName - Nombre de la categoría del negocio
 * @returns Clases de color de Tailwind
 */
export function getCategoryColor(categoryName?: string): string {
  if (!categoryName) return 'text-gray-500'

  const colorMap: Record<string, string> = {
    'salón de belleza': 'text-pink-500',
    'salon de belleza': 'text-pink-500',
    'barbería': 'text-blue-500',
    'barberia': 'text-blue-500',
    'spa': 'text-purple-500',
    'uñas': 'text-rose-500',
    'masajes': 'text-indigo-500',
    'gimnasio': 'text-orange-500',
    'clínica': 'text-teal-500',
    'clinica': 'text-teal-500',
  }

  return colorMap[categoryName.toLowerCase()] || 'text-gray-500'
}
