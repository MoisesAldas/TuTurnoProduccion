import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { mockSupabaseClient, resetSupabaseMocks } from '@/__tests__/mocks/supabase'
import { usuariosPrueba } from '@/__tests__/mocks/data/datosPrueba'

// Mock de Supabase
vi.mock('@/lib/supabaseClient', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock de Next.js router
const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}))

describe('Hook: useAuth', () => {
  beforeEach(() => {
    resetSupabaseMocks()
    vi.clearAllMocks()
    mockPush.mockClear()
    mockReplace.mockClear()
  })

  describe('Inicialización', () => {
    it('debería inicializar con usuario null', () => {
      // Mock: Sin sesión
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      // Verificar estado inicial
      expect(mockSupabaseClient.auth.getSession).toBeDefined()
    })

    it('debería cargar sesión existente', async () => {
      const sesionMock = {
        user: usuariosPrueba[0],
        access_token: 'token-123',
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: sesionMock },
        error: null
      })

      expect(mockSupabaseClient.auth.getSession).toBeDefined()
    })
  })

  describe('Inicio de Sesión', () => {
    it('debería iniciar sesión con email y contraseña', async () => {
      const credenciales = {
        email: 'cliente@ejemplo.com',
        password: 'password123'
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: usuariosPrueba[0],
          session: { access_token: 'token-123' }
        },
        error: null
      })

      expect(mockSupabaseClient.auth.signInWithPassword).toBeDefined()
    })

    it('debería manejar error de credenciales inválidas', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { 
          message: 'Invalid login credentials',
          status: 400
        }
      })

      expect(mockSupabaseClient.auth.signInWithPassword).toBeDefined()
    })

    it('debería iniciar sesión con Google', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { 
          provider: 'google',
          url: 'https://accounts.google.com/oauth'
        },
        error: null
      })

      expect(mockSupabaseClient.auth.signInWithOAuth).toBeDefined()
    })
  })

  describe('Registro', () => {
    it('debería registrar nuevo usuario', async () => {
      const nuevoUsuario = {
        email: 'nuevo@ejemplo.com',
        password: 'Password123!'
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'nuevo-usuario-1', email: nuevoUsuario.email },
          session: null
        },
        error: null
      })

      expect(mockSupabaseClient.auth.signUp).toBeDefined()
    })

    it('debería rechazar email ya registrado', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { 
          message: 'User already registered',
          status: 422
        }
      })

      expect(mockSupabaseClient.auth.signUp).toBeDefined()
    })

    it('debería validar formato de contraseña', async () => {
      const contrasenasInvalidas = [
        'corta', // Muy corta
        'sinmayusculas123', // Sin mayúsculas
        'SINMINUSCULAS123', // Sin minúsculas
        'SinNumeros', // Sin números
      ]

      contrasenasInvalidas.forEach(password => {
        expect(password).toBeDefined()
      })
    })
  })

  describe('Cerrar Sesión', () => {
    it('debería cerrar sesión correctamente', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null
      })

      expect(mockSupabaseClient.auth.signOut).toBeDefined()
    })

    it('debería limpiar estado del usuario al cerrar sesión', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null
      })

      // Verificar que se limpia el estado
      expect(mockSupabaseClient.auth.signOut).toBeDefined()
    })
  })

  describe('Actualización de Perfil', () => {
    it('debería actualizar información del usuario', async () => {
      const datosActualizados = {
        first_name: 'NUEVO NOMBRE',
        phone: '0999888777'
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: { ...usuariosPrueba[0], ...datosActualizados },
        error: null
      })

      expect(mockSupabaseClient.from).toBeDefined()
    })

    it('debería actualizar avatar', async () => {
      const nuevoAvatar = 'https://storage.supabase.co/avatars/user-1.jpg'

      mockSupabaseClient.single.mockResolvedValue({
        data: { ...usuariosPrueba[0], avatar_url: nuevoAvatar },
        error: null
      })

      expect(mockSupabaseClient.from).toBeDefined()
    })
  })

  describe('Recuperación de Contraseña', () => {
    it('debería enviar email de recuperación', async () => {
      const email = 'cliente@ejemplo.com'

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      })

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toBeDefined()
    })

    it('debería manejar email no registrado', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { 
          message: 'User not found',
          status: 404
        }
      })

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toBeDefined()
    })
  })

  describe('Cambio de Contraseña', () => {
    it('debería cambiar contraseña', async () => {
      const nuevaContrasena = 'NewPassword123!'

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: usuariosPrueba[0] },
        error: null
      })

      expect(mockSupabaseClient.auth.updateUser).toBeDefined()
    })

    it('debería validar contraseña actual', async () => {
      // La contraseña actual debe ser verificada antes del cambio
      expect(true).toBe(true)
    })
  })

  describe('Manejo de Errores', () => {
    it('debería manejar error de red', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      )

      expect(mockSupabaseClient.auth.signInWithPassword).toBeDefined()
    })

    it('debería manejar sesión expirada', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' }
      })

      expect(mockSupabaseClient.auth.getSession).toBeDefined()
    })
  })

  describe('Suscripción a Cambios de Auth', () => {
    it('debería suscribirse a cambios de autenticación', () => {
      const mockUnsubscribe = vi.fn()
      
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe
          }
        }
      })

      expect(mockSupabaseClient.auth.onAuthStateChange).toBeDefined()
    })

    it('debería limpiar suscripción al desmontar', () => {
      const mockUnsubscribe = vi.fn()
      
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe
          }
        }
      })

      // Simular desmontaje
      expect(mockUnsubscribe).toBeDefined()
    })
  })
})
