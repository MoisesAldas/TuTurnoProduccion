/**
 * Pruebas unitarias para dateUtils.ts
 *
 * Estas pruebas verifican que las funciones de manejo de fechas
 * funcionen correctamente sin problemas de zona horaria.
 */

import {
  parseDateString,
  formatDateString,
  toDateString,
  formatSpanishDate,
} from '@/lib/dateUtils'

describe('dateUtils', () => {
  describe('parseDateString', () => {
    it('debe convertir string YYYY-MM-DD a Date correctamente', () => {
      const result = parseDateString('2025-10-15')

      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(9) // Octubre es mes 9 (0-indexed)
      expect(result.getDate()).toBe(15)
    })

    it('debe manejar el primer día del mes', () => {
      const result = parseDateString('2025-01-01')

      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(0) // Enero
      expect(result.getDate()).toBe(1)
    })

    it('debe manejar el último día del mes', () => {
      const result = parseDateString('2025-12-31')

      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(11) // Diciembre
      expect(result.getDate()).toBe(31)
    })

    it('debe crear la fecha al mediodía para evitar problemas de zona horaria', () => {
      const result = parseDateString('2025-10-15')

      expect(result.getHours()).toBe(12)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
    })

    it('debe manejar fechas de años bisiestos', () => {
      const result = parseDateString('2024-02-29')

      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(1) // Febrero
      expect(result.getDate()).toBe(29)
    })
  })

  describe('formatDateString', () => {
    it('debe formatear Date a string YYYY-MM-DD', () => {
      const date = new Date(2025, 9, 15, 12, 0, 0) // 15 Oct 2025
      const result = formatDateString(date)

      expect(result).toBe('2025-10-15')
    })

    it('debe agregar ceros a la izquierda para meses de un dígito', () => {
      const date = new Date(2025, 0, 5, 12, 0, 0) // 5 Enero 2025
      const result = formatDateString(date)

      expect(result).toBe('2025-01-05')
    })

    it('debe agregar ceros a la izquierda para días de un dígito', () => {
      const date = new Date(2025, 5, 1, 12, 0, 0) // 1 Junio 2025
      const result = formatDateString(date)

      expect(result).toBe('2025-06-01')
    })

    it('debe manejar diciembre correctamente (mes 12)', () => {
      const date = new Date(2025, 11, 25, 12, 0, 0) // 25 Dic 2025
      const result = formatDateString(date)

      expect(result).toBe('2025-12-25')
    })
  })

  describe('toDateString', () => {
    it('debe ser un alias de formatDateString', () => {
      const date = new Date(2025, 9, 15, 12, 0, 0)

      expect(toDateString(date)).toBe(formatDateString(date))
    })

    it('debe formatear correctamente', () => {
      const date = new Date(2025, 9, 15, 12, 0, 0)
      const result = toDateString(date)

      expect(result).toBe('2025-10-15')
    })
  })

  describe('formatSpanishDate', () => {
    it('debe formatear fecha en español con opciones por defecto', () => {
      const result = formatSpanishDate('2025-10-15')

      // Debe contener el día, mes y año en español
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2025/)
      // Debe contener "octubre" (puede variar según locale)
      expect(result.toLowerCase()).toMatch(/octubre/)
    })

    it('debe capitalizar la primera letra', () => {
      const result = formatSpanishDate('2025-10-15')

      // Primera letra debe ser mayúscula
      expect(result[0]).toBe(result[0].toUpperCase())
    })

    it('debe respetar opciones personalizadas', () => {
      const result = formatSpanishDate('2025-10-15', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })

      expect(result).toMatch(/15/)
      expect(result).toMatch(/2025/)
    })

    it('debe formatear correctamente diferentes fechas', () => {
      const result1 = formatSpanishDate('2025-01-01')
      const result2 = formatSpanishDate('2025-12-31')

      expect(result1.toLowerCase()).toMatch(/enero/)
      expect(result2.toLowerCase()).toMatch(/diciembre/)
    })
  })

  describe('Consistencia de conversiones', () => {
    it('parseDateString y formatDateString deben ser inversas', () => {
      const original = '2025-10-15'
      const parsed = parseDateString(original)
      const formatted = formatDateString(parsed)

      expect(formatted).toBe(original)
    })

    it('debe mantener la fecha correcta en múltiples conversiones', () => {
      const dates = [
        '2025-01-01',
        '2025-06-15',
        '2025-12-31',
        '2024-02-29', // Año bisiesto
      ]

      dates.forEach(dateStr => {
        const parsed = parseDateString(dateStr)
        const formatted = formatDateString(parsed)
        expect(formatted).toBe(dateStr)
      })
    })

    it('no debe tener problemas de off-by-one por zona horaria', () => {
      // Este es el bug que se corrigió
      const dateStr = '2025-10-11'
      const date = parseDateString(dateStr)
      const result = toDateString(date)

      expect(result).toBe(dateStr)
      expect(date.getDate()).toBe(11) // No debe ser 10 por zona horaria
    })
  })
})
