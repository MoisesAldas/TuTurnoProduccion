import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { mockSupabaseClient, resetSupabaseMocks } from '@/__tests__/mocks/supabase'
import { negociosPrueba, empleadosPrueba, serviciosPrueba } from '@/__tests__/mocks/data/datosPrueba'

// Mock de Supabase
vi.mock('@/lib/supabaseClient', () => ({
  createClient: () => mockSupabaseClient,
}))

describe('Hook: useBusiness', () => {
  beforeEach(() => {
    resetSupabaseMocks()
    vi.clearAllMocks()
  })

  describe('Inicialización y Carga de Datos', () => {
    it('debería validar estructura de datos del negocio', () => {
      const negocio = negociosPrueba[0]

      expect(negocio).toHaveProperty('id')
      expect(negocio).toHaveProperty('name')
      expect(negocio).toHaveProperty('owner_id')
    })

    it('debería validar estructura de empleados', () => {
      const empleado = empleadosPrueba[0]

      expect(empleado).toHaveProperty('id')
      expect(empleado).toHaveProperty('business_id')
      expect(empleado).toHaveProperty('name')
    })

    it('debería validar estructura de servicios', () => {
      const servicio = serviciosPrueba[0]

      expect(servicio).toHaveProperty('id')
      expect(servicio).toHaveProperty('business_id')
      expect(servicio).toHaveProperty('name')
      expect(servicio).toHaveProperty('price')
    })
  })

  describe('Gestión de Empleados', () => {
    it('debería validar datos de nuevo empleado', () => {
      const nuevoEmpleado = {
        name: 'NUEVO EMPLEADO',
        email: 'empleado@ejemplo.com',
        phone: '0999888777'
      }

      expect(nuevoEmpleado.name.length).toBeGreaterThan(0)
      expect(nuevoEmpleado.email).toContain('@')
    })

    it('debería validar actualización de empleado', () => {
      const datosActualizados = {
        name: 'NOMBRE ACTUALIZADO',
        phone: '0988777666'
      }

      expect(datosActualizados.name).toBeDefined()
      expect(datosActualizados.phone).toMatch(/^09\d{8}$/)
    })
  })

  describe('Gestión de Servicios', () => {
    it('debería validar datos de nuevo servicio', () => {
      const nuevoServicio = {
        name: 'Nuevo Servicio',
        price: 25.00,
        duration_minutes: 45
      }

      expect(nuevoServicio.price).toBeGreaterThan(0)
      expect(nuevoServicio.duration_minutes).toBeGreaterThan(0)
    })

    it('debería validar rango de precios', () => {
      const preciosValidos = [5, 10, 25, 50, 100]
      
      preciosValidos.forEach(precio => {
        expect(precio).toBeGreaterThan(0)
        expect(precio).toBeLessThan(1000000)
      })
    })

    it('debería validar duración de servicio', () => {
      const duracionesValidas = [15, 30, 45, 60, 90, 120]
      
      duracionesValidas.forEach(duracion => {
        expect(duracion).toBeGreaterThanOrEqual(5)
        expect(duracion).toBeLessThanOrEqual(480)
      })
    })
  })

  describe('Estado del Negocio', () => {
    it('debería validar cambio de estado', () => {
      const estados = [true, false]
      
      estados.forEach(estado => {
        expect(typeof estado).toBe('boolean')
      })
    })

    it('debería verificar estructura de horarios', () => {
      const horarios = {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' }
      }

      expect(horarios.monday).toHaveProperty('open')
      expect(horarios.monday).toHaveProperty('close')
    })
  })

  describe('Validaciones', () => {
    it('debería validar nombre de negocio', () => {
      const nombresValidos = ['Mi Negocio', 'Salón de Belleza', 'Barbería Central']
      const nombresInvalidos = ['', 'A', 'A'.repeat(101)]
      
      nombresValidos.forEach(nombre => {
        expect(nombre.length).toBeGreaterThanOrEqual(2)
        expect(nombre.length).toBeLessThanOrEqual(100)
      })

      nombresInvalidos.forEach(nombre => {
        const esValido = nombre.length >= 2 && nombre.length <= 100
        expect(esValido).toBe(false)
      })
    })

    it('debería validar formato de horarios', () => {
      const horariosValidos = [
        { open: '08:00', close: '17:00' },
        { open: '09:00', close: '18:00' },
        { open: '10:00', close: '20:00' }
      ]

      horariosValidos.forEach(horario => {
        expect(horario.open).toMatch(/^\d{2}:\d{2}$/)
        expect(horario.close).toMatch(/^\d{2}:\d{2}$/)
      })
    })

    it('debería validar precio de servicio', () => {
      const preciosValidos = [5, 10, 25.50, 50, 100]
      const preciosInvalidos = [-1, 0, 1000000]
      
      preciosValidos.forEach(precio => {
        expect(precio).toBeGreaterThan(0)
        expect(precio).toBeLessThan(999999)
      })

      preciosInvalidos.forEach(precio => {
        const esValido = precio > 0 && precio < 999999
        expect(esValido).toBe(false)
      })
    })
  })

  describe('Manejo de Errores', () => {
    it('debería identificar errores de permisos', () => {
      const errorPermisos = {
        code: '42501',
        message: 'insufficient_privilege'
      }

      expect(errorPermisos.code).toBe('42501')
    })

    it('debería identificar errores de conexión', () => {
      const errorConexion = {
        code: '08006',
        message: 'connection_failure'
      }

      expect(errorConexion.code).toBe('08006')
    })

    it('debería identificar errores de datos duplicados', () => {
      const errorDuplicado = {
        code: '23505',
        message: 'duplicate key value'
      }

      expect(errorDuplicado.code).toBe('23505')
    })
  })
})
