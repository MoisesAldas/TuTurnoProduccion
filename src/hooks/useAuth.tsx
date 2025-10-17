'use client'

import { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { AuthState, User, ProfileSetupData } from '@/types/auth'

interface AuthContextType {
  authState: AuthState
  signInWithGoogle: (userType: 'client' | 'business_owner') => Promise<void>
  signInWithEmail: (email: string, password: string, userType: 'client' | 'business_owner') => Promise<void>
  signUpWithEmail: (email: string, password: string, metadata: { first_name: string; last_name: string }, userType: 'client' | 'business_owner') => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: ProfileSetupData) => Promise<User>
  refreshUser: (force?: boolean) => Promise<void>
  handleProfileCompleted: () => Promise<void>
  forceRefreshUser: () => Promise<void>
  diagnoseAuthState: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })
  
  // Flag para evitar múltiples inicializaciones
  const [isInitialized, setIsInitialized] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Evitar múltiples inicializaciones
    if (isInitialized) {
      return
    }
    
    let isMounted = true // Flag para evitar actualizaciones en componentes desmontados
    
    // Obtener sesión inicial
    const initializeAuth = async () => {
      try {
        setIsInitialized(true)
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return // Evitar actualizaciones si el componente se desmontó
        
        if (error) {
          console.error('Error getting session:', error)
          setAuthState({ user: null, session: null, loading: false })
          return
        }
        setAuthState(prev => ({ ...prev, session }))
        
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setAuthState(prev => ({ ...prev, loading: false }))
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (isMounted) {
          setAuthState({ user: null, session: null, loading: false })
        }
      }
    }

    initializeAuth()

    // Timeout de seguridad para evitar loading infinito
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        setAuthState(prev => ({ ...prev, loading: false }))
      }
    }, 15000) // 15 segundos

    return () => {
      isMounted = false
      clearTimeout(loadingTimeout)
    }

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        if (!isMounted) return // Evitar actualizaciones si el componente se desmontó
        
        setAuthState(prev => ({ ...prev, session }))
        
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            session: null,
            loading: false,
          })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await fetchUserProfile(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Usuario no existe en la tabla users, necesita completar perfil
        setAuthState(prev => ({ ...prev, user: null, loading: false }))
        return
      }
      setAuthState(prev => ({ ...prev, user: data, loading: false }))
    } catch (error) {
      console.error('💥 Error fetching user profile:', error)
      setAuthState(prev => ({ ...prev, user: null, loading: false }))
    }
  }

  // Método para verificar y actualizar el estado después de completar perfil
  const checkAndUpdateUserState = async () => {
    try {
      
      // Obtener sesión actual
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        return false
      }
      
      // Verificar si el usuario existe en la base de datos
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) {
        return false
      }

      if (user) {
        setAuthState(prev => ({ ...prev, user, loading: false }))
        return true
      }

      return false
    } catch (error) {
      console.error('❌ Error checking user state:', error)
      return false
    }
  }

  const signInWithGoogle = async (userType: 'client' | 'business_owner') => {
    try {
      
      // Persist the intended user type in a short-lived cookie as a fallback
      // for cases where the provider/Supabase loses our "type" query param and returns to root.
      // 10 minutes should be enough to complete the flow.
      const maxAge = 60 * 10
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
      document.cookie = `auth_user_type=${userType}; Max-Age=${maxAge}; Path=/; SameSite=Lax${isHttps ? '; Secure' : ''}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?type=${userType}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error('Error signing in with Google:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in signInWithGoogle:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setAuthState({
        user: null,
        session: null,
        loading: false,
      })
      router.push('/')
    }
  }

  const updateProfile = async (data: ProfileSetupData): Promise<User> => {
    try {
      if (!authState.session?.user) {
        throw new Error('No authenticated user')
      }

      // Verificar que el email no esté siendo usado para otro tipo de usuario
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', authState.session.user.email)
        .single()

      if (existingUser && existingUser.id !== authState.session.user.id) {
        throw new Error('Este email ya está registrado. Usa un email diferente.')
      }

      const userData = {
        id: authState.session.user.id,
        email: authState.session.user.email!,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        avatar_url: authState.session.user.user_metadata.avatar_url,
        is_business_owner: data.user_type === 'business_owner',
        is_client: data.user_type === 'client',
      }

      const { data: user, error } = await supabase
        .from('users')
        .upsert(userData)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        throw error
      }
      setAuthState(prev => ({ ...prev, user }))
      return user
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  const refreshUser = async (force: boolean = false) => {
    if (authState.session?.user) {
      await fetchUserProfile(authState.session.user.id)
    }
  }

  // Método para forzar la actualización del estado después de completar perfil
  const forceRefreshUser = async (): Promise<void> => {
    try {
      
      // Usar el nuevo método que verifica y actualiza el estado
      const success = await checkAndUpdateUserState()
      
      if (success) {
      } else {
      }
      
      // No return value to match Promise<void>
    } catch (error) {
      console.error('❌ Error force refreshing user:', error)
      // No return value to match Promise<void>
    }
  }

  // Nuevo método para validar y redirigir después de completar perfil
  const handleProfileCompleted = async () => {
    try {
      
      // Forzar actualización del estado
      if (authState.session?.user) {
        await fetchUserProfile(authState.session.user.id)
      }

      // Pequeña pausa para permitir que se actualice el estado
      setTimeout(() => {
        if (authState.user) {
          const redirectPath = authState.user.is_business_owner
            ? '/dashboard/business'
            : '/dashboard/client'
          router.replace(redirectPath)
        }
      }, 100)
    } catch (error) {
      console.error('❌ Error handling profile completion:', error)
    }
  }

  // Método de diagnóstico para verificar el estado actual
  const diagnoseAuthState = async () => {
    console.log('Diagnosis not implemented')
  }

  const signInWithEmail = async (email: string, password: string, userType: 'client' | 'business_owner') => {
    try {

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Error signing in with email:', error)
        throw error
      }

      if (data.user) {
        // Verificar que el usuario sea del tipo correcto
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (userError) {
          // Usuario autenticado pero sin perfil, redirigir a setup
          router.push(`/auth/${userType}/setup`)
          return
        }

        // Verificar tipo de usuario
        const isCorrectType = userType === 'client' ? user.is_client : user.is_business_owner
        if (!isCorrectType) {
          await supabase.auth.signOut()
          throw new Error(`Esta cuenta no es de tipo ${userType === 'client' ? 'cliente' : 'negocio'}`)
        }

        // Verificar si hay un returnUrl guardado en localStorage
        const savedReturnUrl = localStorage.getItem('authReturnUrl')
        if (savedReturnUrl) {
          localStorage.removeItem('authReturnUrl')
          router.push(decodeURIComponent(savedReturnUrl))
        } else {
          // Redirigir al dashboard correspondiente
          const redirectPath = userType === 'client' ? '/dashboard/client' : '/dashboard/business'
          router.push(redirectPath)
        }
      }
    } catch (error) {
      console.error('Error in signInWithEmail:', error)
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string, metadata: { first_name: string; last_name: string }, userType: 'client' | 'business_owner') => {
    try {

      // Persist user type for email flows as well, so the callback can recover it
      const maxAge = 60 * 10
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
      document.cookie = `auth_user_type=${userType}; Max-Age=${maxAge}; Path=/; SameSite=Lax${isHttps ? '; Secure' : ''}`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=${userType}`,
          data: {
            first_name: metadata.first_name,
            last_name: metadata.last_name,
            user_type: userType,
          }
        }
      })

      if (error) {
        console.error('Error signing up with email:', error)
        throw error
      }

      if (data.user) {

        // Si el usuario necesita confirmar email, mostrar mensaje
        if (!data.session) {
          // Redirigir a página de confirmación de email
          const authPath = userType === 'business_owner' ? 'business' : 'client'
          router.push(`/auth/${authPath}/verify-email?email=${encodeURIComponent(email)}`)
          return
        }

        // Si la sesión existe inmediatamente, redirigir a setup de perfil
        const authPath = userType === 'business_owner' ? 'business' : 'client'
        router.push(`/auth/${authPath}/setup`)
      }
    } catch (error) {
      console.error('Error in signUpWithEmail:', error)
      throw error
    }
  }

  const contextValue: AuthContextType = {
    authState,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfile,
    refreshUser,
    handleProfileCompleted,
    forceRefreshUser,
    diagnoseAuthState,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}