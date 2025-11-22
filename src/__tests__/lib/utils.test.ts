/**
 * Pruebas unitarias para utils.ts
 *
 * Prueba la función cn() que combina clases de Tailwind CSS
 */

import { cn } from '@/lib/utils'

describe('utils', () => {
  describe('cn (className merger)', () => {
    it('debe combinar clases simples', () => {
      const result = cn('text-red-500', 'bg-blue-500')

      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-blue-500')
    })

    it('debe manejar clases condicionales', () => {
      const isActive = true
      const isDisabled = false

      const result = cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      )

      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
      expect(result).not.toContain('disabled-class')
    })

    it('debe resolver conflictos de Tailwind (última gana)', () => {
      const result = cn('text-red-500', 'text-blue-500')

      // tailwind-merge debe quedarse con la última
      expect(result).toBe('text-blue-500')
    })

    it('debe manejar arrays de clases', () => {
      const result = cn(['class1', 'class2'], 'class3')

      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    it('debe manejar undefined y null', () => {
      const result = cn('base', undefined, null, 'end')

      expect(result).toContain('base')
      expect(result).toContain('end')
      expect(result).not.toContain('undefined')
      expect(result).not.toContain('null')
    })

    it('debe manejar strings vacíos', () => {
      const result = cn('base', '', 'end')

      expect(result).toBe('base end')
    })

    it('debe manejar objetos condicionales', () => {
      const result = cn({
        'always-on': true,
        'always-off': false,
        'dynamic-on': 1 > 0,
        'dynamic-off': 1 < 0,
      })

      expect(result).toContain('always-on')
      expect(result).not.toContain('always-off')
      expect(result).toContain('dynamic-on')
      expect(result).not.toContain('dynamic-off')
    })

    it('debe resolver conflictos de padding', () => {
      const result = cn('p-4', 'p-2')

      expect(result).toBe('p-2')
    })

    it('debe resolver conflictos de margin', () => {
      const result = cn('m-4', 'mx-2', 'my-6')

      // mx-2 y my-6 son más específicos que m-4
      expect(result).toContain('mx-2')
      expect(result).toContain('my-6')
    })

    it('debe manejar variantes responsive', () => {
      const result = cn('text-sm', 'md:text-lg', 'lg:text-xl')

      expect(result).toContain('text-sm')
      expect(result).toContain('md:text-lg')
      expect(result).toContain('lg:text-xl')
    })

    it('debe manejar variantes de hover/focus', () => {
      const result = cn(
        'bg-white',
        'hover:bg-gray-100',
        'focus:bg-gray-200'
      )

      expect(result).toContain('bg-white')
      expect(result).toContain('hover:bg-gray-100')
      expect(result).toContain('focus:bg-gray-200')
    })

    it('debe retornar string vacío si no hay clases', () => {
      const result = cn()

      expect(result).toBe('')
    })

    it('debe manejar clases complejas de componentes', () => {
      const result = cn(
        'inline-flex items-center justify-center',
        'rounded-md text-sm font-medium',
        'ring-offset-background transition-colors',
        'focus-visible:outline-none focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-50'
      )

      expect(result).toContain('inline-flex')
      expect(result).toContain('items-center')
      expect(result).toContain('rounded-md')
      expect(result).toContain('disabled:opacity-50')
    })
  })
})
