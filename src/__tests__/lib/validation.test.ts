/**
 * Pruebas unitarias para validaciones de lógica de negocio
 *
 * Verifica validaciones de citas, clientes, servicios, etc.
 */

import { z } from 'zod'

// Schemas de validación para el sistema TuTurno
const emailSchema = z.string().email('Email inválido')

const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{9,15}$/, 'Teléfono inválido')
  .optional()
  .or(z.literal(''))

const appointmentTimeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Hora inválida')

const appointmentDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')

const priceSchema = z
  .number()
  .min(0, 'El precio no puede ser negativo')
  .max(999999, 'Precio demasiado alto')

const durationSchema = z
  .number()
  .int('La duración debe ser un número entero')
  .min(5, 'Mínimo 5 minutos')
  .max(480, 'Máximo 8 horas')

const serviceSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100, 'Nombre muy largo'),
  description: z.string().max(500, 'Descripción muy larga').optional(),
  price: priceSchema,
  duration_minutes: durationSchema,
})

const walkInClientSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100, 'Nombre muy largo'),
  phone: phoneSchema,
})

const businessClientSchema = z.object({
  first_name: z.string().min(1, 'Nombre requerido').max(50, 'Nombre muy largo'),
  last_name: z.string().max(50, 'Apellido muy largo').optional(),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notas muy largas').optional(),
})

const appointmentSchema = z.object({
  business_id: z.string().uuid('ID de negocio inválido'),
  employee_id: z.string().uuid('ID de empleado inválido'),
  appointment_date: appointmentDateSchema,
  start_time: appointmentTimeSchema,
  end_time: appointmentTimeSchema,
  total_price: priceSchema,
  notes: z.string().max(500, 'Notas muy largas').optional(),
})

describe('Validaciones de TuTurno', () => {
  describe('Email Schema', () => {
    it('debe aceptar emails válidos', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.com',
        'user+tag@example.org',
        'test123@subdomain.domain.com',
      ]

      validEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).not.toThrow()
      })
    })

    it('debe rechazar emails inválidos', () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        '',
      ]

      invalidEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).toThrow()
      })
    })
  })

  describe('Phone Schema', () => {
    it('debe aceptar teléfonos válidos', () => {
      const validPhones = [
        '+593999123456',
        '0999123456',
        '+1234567890123',
        '999123456',
      ]

      validPhones.forEach(phone => {
        expect(() => phoneSchema.parse(phone)).not.toThrow()
      })
    })

    it('debe aceptar string vacío (opcional)', () => {
      expect(() => phoneSchema.parse('')).not.toThrow()
    })

    it('debe aceptar undefined (opcional)', () => {
      expect(() => phoneSchema.parse(undefined)).not.toThrow()
    })

    it('debe rechazar teléfonos inválidos', () => {
      const invalidPhones = [
        'abc123',
        '+1',
        '12345678901234567890', // muy largo
      ]

      invalidPhones.forEach(phone => {
        expect(() => phoneSchema.parse(phone)).toThrow()
      })
    })
  })

  describe('Appointment Time Schema', () => {
    it('debe aceptar horas válidas', () => {
      const validTimes = [
        '08:00',
        '8:00',
        '14:30',
        '23:59',
        '00:00',
        '08:00:00',
      ]

      validTimes.forEach(time => {
        expect(() => appointmentTimeSchema.parse(time)).not.toThrow()
      })
    })

    it('debe rechazar horas inválidas', () => {
      const invalidTimes = [
        '25:00',
        '8:60',
        'invalid',
        '8am',
        '',
      ]

      invalidTimes.forEach(time => {
        expect(() => appointmentTimeSchema.parse(time)).toThrow()
      })
    })
  })

  describe('Appointment Date Schema', () => {
    it('debe aceptar fechas en formato YYYY-MM-DD', () => {
      const validDates = [
        '2025-01-01',
        '2025-12-31',
        '2024-02-29', // año bisiesto
      ]

      validDates.forEach(date => {
        expect(() => appointmentDateSchema.parse(date)).not.toThrow()
      })
    })

    it('debe rechazar fechas en formato incorrecto', () => {
      const invalidDates = [
        '01-01-2025',
        '2025/01/01',
        '2025-1-1',
        'January 1, 2025',
        '',
      ]

      invalidDates.forEach(date => {
        expect(() => appointmentDateSchema.parse(date)).toThrow()
      })
    })
  })

  describe('Price Schema', () => {
    it('debe aceptar precios válidos', () => {
      const validPrices = [0, 0.01, 15, 25.50, 100, 999.99]

      validPrices.forEach(price => {
        expect(() => priceSchema.parse(price)).not.toThrow()
      })
    })

    it('debe rechazar precios negativos', () => {
      expect(() => priceSchema.parse(-1)).toThrow()
      expect(() => priceSchema.parse(-0.01)).toThrow()
    })

    it('debe rechazar precios muy altos', () => {
      expect(() => priceSchema.parse(1000000)).toThrow()
    })
  })

  describe('Duration Schema', () => {
    it('debe aceptar duraciones válidas', () => {
      const validDurations = [5, 15, 30, 60, 90, 120, 480]

      validDurations.forEach(duration => {
        expect(() => durationSchema.parse(duration)).not.toThrow()
      })
    })

    it('debe rechazar duraciones menores a 5 minutos', () => {
      expect(() => durationSchema.parse(0)).toThrow()
      expect(() => durationSchema.parse(4)).toThrow()
    })

    it('debe rechazar duraciones mayores a 8 horas', () => {
      expect(() => durationSchema.parse(481)).toThrow()
      expect(() => durationSchema.parse(600)).toThrow()
    })

    it('debe rechazar decimales', () => {
      expect(() => durationSchema.parse(30.5)).toThrow()
    })
  })

  describe('Service Schema', () => {
    it('debe aceptar servicios válidos', () => {
      const validService = {
        name: 'Corte de cabello',
        description: 'Corte clásico para hombre',
        price: 15,
        duration_minutes: 30,
      }

      expect(() => serviceSchema.parse(validService)).not.toThrow()
    })

    it('debe requerir nombre', () => {
      const invalidService = {
        name: '',
        price: 15,
        duration_minutes: 30,
      }

      expect(() => serviceSchema.parse(invalidService)).toThrow()
    })

    it('debe aceptar servicio sin descripción', () => {
      const serviceWithoutDesc = {
        name: 'Corte',
        price: 15,
        duration_minutes: 30,
      }

      expect(() => serviceSchema.parse(serviceWithoutDesc)).not.toThrow()
    })
  })

  describe('Walk-in Client Schema', () => {
    it('debe aceptar cliente walk-in válido', () => {
      const validClient = {
        name: 'Juan Pérez',
        phone: '+593999123456',
      }

      expect(() => walkInClientSchema.parse(validClient)).not.toThrow()
    })

    it('debe aceptar cliente sin teléfono', () => {
      const clientWithoutPhone = {
        name: 'Juan Pérez',
      }

      expect(() => walkInClientSchema.parse(clientWithoutPhone)).not.toThrow()
    })

    it('debe requerir nombre', () => {
      const clientWithoutName = {
        name: '',
        phone: '+593999123456',
      }

      expect(() => walkInClientSchema.parse(clientWithoutName)).toThrow()
    })
  })

  describe('Business Client Schema', () => {
    it('debe aceptar cliente de negocio válido', () => {
      const validClient = {
        first_name: 'María',
        last_name: 'García',
        phone: '+593999123456',
        email: 'maria@example.com',
        notes: 'Cliente frecuente',
      }

      expect(() => businessClientSchema.parse(validClient)).not.toThrow()
    })

    it('debe aceptar cliente con campos mínimos', () => {
      const minimalClient = {
        first_name: 'María',
      }

      expect(() => businessClientSchema.parse(minimalClient)).not.toThrow()
    })

    it('debe requerir first_name', () => {
      const clientWithoutFirstName = {
        first_name: '',
        last_name: 'García',
      }

      expect(() => businessClientSchema.parse(clientWithoutFirstName)).toThrow()
    })
  })

  describe('Appointment Schema', () => {
    it('debe aceptar cita válida', () => {
      const validAppointment = {
        business_id: '123e4567-e89b-12d3-a456-426614174000',
        employee_id: '123e4567-e89b-12d3-a456-426614174001',
        appointment_date: '2025-10-15',
        start_time: '14:00',
        end_time: '14:30',
        total_price: 25,
        notes: 'Cliente prefiere tijeras',
      }

      expect(() => appointmentSchema.parse(validAppointment)).not.toThrow()
    })

    it('debe rechazar UUIDs inválidos', () => {
      const invalidAppointment = {
        business_id: 'not-a-uuid',
        employee_id: '123e4567-e89b-12d3-a456-426614174001',
        appointment_date: '2025-10-15',
        start_time: '14:00',
        end_time: '14:30',
        total_price: 25,
      }

      expect(() => appointmentSchema.parse(invalidAppointment)).toThrow()
    })

    it('debe requerir campos obligatorios', () => {
      const incompleteAppointment = {
        business_id: '123e4567-e89b-12d3-a456-426614174000',
        // falta employee_id, appointment_date, etc.
      }

      expect(() => appointmentSchema.parse(incompleteAppointment)).toThrow()
    })
  })
})

describe('Validaciones de lógica de negocio', () => {
  describe('Validación de conflictos de horario', () => {
    const hasTimeConflict = (
      start1: string,
      end1: string,
      start2: string,
      end2: string
    ): boolean => {
      const toMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number)
        return hours * 60 + minutes
      }

      const s1 = toMinutes(start1)
      const e1 = toMinutes(end1)
      const s2 = toMinutes(start2)
      const e2 = toMinutes(end2)

      return s1 < e2 && s2 < e1
    }

    it('debe detectar conflicto cuando citas se solapan', () => {
      expect(hasTimeConflict('10:00', '11:00', '10:30', '11:30')).toBe(true)
    })

    it('debe detectar conflicto cuando una cita está dentro de otra', () => {
      expect(hasTimeConflict('10:00', '12:00', '10:30', '11:30')).toBe(true)
    })

    it('no debe detectar conflicto cuando citas son consecutivas', () => {
      expect(hasTimeConflict('10:00', '11:00', '11:00', '12:00')).toBe(false)
    })

    it('no debe detectar conflicto cuando citas no se solapan', () => {
      expect(hasTimeConflict('10:00', '11:00', '14:00', '15:00')).toBe(false)
    })
  })

  describe('Cálculo de hora de fin', () => {
    const calculateEndTime = (startTime: string, durationMinutes: number): string => {
      const [hours, minutes] = startTime.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + durationMinutes
      const endHours = Math.floor(totalMinutes / 60)
      const endMinutes = totalMinutes % 60
      return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
    }

    it('debe calcular hora de fin correctamente', () => {
      expect(calculateEndTime('10:00', 30)).toBe('10:30')
      expect(calculateEndTime('10:30', 60)).toBe('11:30')
      expect(calculateEndTime('14:45', 15)).toBe('15:00')
    })

    it('debe manejar cambio de hora', () => {
      expect(calculateEndTime('10:45', 30)).toBe('11:15')
    })

    it('debe manejar duraciones largas', () => {
      expect(calculateEndTime('10:00', 120)).toBe('12:00')
    })
  })

  describe('Cálculo de precio total', () => {
    const calculateTotalPrice = (services: { price: number }[]): number => {
      return services.reduce((total, service) => total + service.price, 0)
    }

    it('debe calcular precio total de múltiples servicios', () => {
      const services = [
        { price: 15 },
        { price: 10 },
        { price: 5 },
      ]

      expect(calculateTotalPrice(services)).toBe(30)
    })

    it('debe retornar 0 para array vacío', () => {
      expect(calculateTotalPrice([])).toBe(0)
    })

    it('debe manejar un solo servicio', () => {
      expect(calculateTotalPrice([{ price: 25 }])).toBe(25)
    })
  })
})
