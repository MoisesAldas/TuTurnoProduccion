'use client'

export const dynamic = 'force-dynamic'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect, Suspense } from 'react'
import NProgress from 'nprogress'
import NavigationProgress from '@/components/NavigationProgress'
import '@/app/nprogress.css'
import {
  Home,
  Calendar,
  Users,
  Briefcase,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Menu,
  X,
  Clock,
  Sliders,
  List
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Toaster } from '@/components/ui/toaster'
import { createClient } from '@/lib/supabaseClient'

const navigation: NavItem[] = [
  { name: 'Inicio', href: '/dashboard/business', icon: Home },
  { name: 'Citas', href: '/dashboard/business/appointments', icon: Calendar },
  { name: 'Servicios', href: '/dashboard/business/services', icon: Briefcase },
  { name: 'Empleados', href: '/dashboard/business/employees', icon: Users },
  { name: 'Horarios', href: '/dashboard/business/hours', icon: Clock },
  { name: 'Análisis', href: '/dashboard/business/analytics', icon: BarChart3 },
  { name: 'Listar', href: '/dashboard/business/listar', icon: List },
  { name: 'Ajustes Avanzados', href: '/dashboard/business/settings/advanced', icon: Sliders },
  { name: 'Configuración', href: '/dashboard/business/settings', icon: Settings },
]

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { authState, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [businessName, setBusinessName] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    if (authState.user) {
      fetchBusinessInfo()
    }
  }, [authState.user])

  // Cerrar menú móvil cuando cambia la ruta
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Prevenir scroll cuando el menú móvil está abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  const fetchBusinessInfo = async () => {
    if (!authState.user) return

    const { data, error } = await supabase
      .from('businesses')
      .select('name')
      .eq('owner_id', authState.user.id)
      .single()

    if (data) {
      setBusinessName(data.name)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/business/login')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Manejar inicio de navegación
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute('href')
    if (href && href !== pathname) {
      NProgress.start()
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'lg:w-16' : 'lg:w-64'
        }
        fixed lg:static inset-y-0 left-0 z-50
        w-64 lg:w-auto
        bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white
        transition-all duration-300 ease-in-out
        flex flex-col border-r border-gray-700 shadow-2xl
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-gray-700 relative">
          {/* Logo - Always show on mobile, hide when collapsed on desktop */}
          <Link
            href="/dashboard/business"
            className={`${collapsed ? 'lg:hidden' : ''}`}
          >
            <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              TuTurno
            </span>
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 hover:bg-gray-700 rounded-lg transition-colors absolute right-4"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-1.5 hover:bg-gray-700 rounded-lg transition-colors absolute right-4"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            // Lógica mejorada para determinar si está activo
            let isActive = false

            if (item.href === '/dashboard/business') {
              // Inicio: solo activo si es exactamente /dashboard/business
              isActive = pathname === '/dashboard/business'
            } else if (item.href === '/dashboard/business/settings') {
              // Configuración: solo activo si es exactamente /dashboard/business/settings
              isActive = pathname === '/dashboard/business/settings'
            } else if (item.href === '/dashboard/business/settings/advanced') {
              // Ajustes Avanzados: activo si está en esa ruta o subrutas
              isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            } else {
              // Para las demás rutas, usar lógica normal (exacta o subrutas)
              isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            }

            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  handleLinkClick(e)
                  setMobileMenuOpen(false)
                }}
                className={`
                  flex items-center px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-300 ease-in-out group
                  ${isActive
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/50 scale-105 translate-x-1'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white hover:translate-x-1 hover:scale-[1.02]'
                  }
                `}
              >
                <Icon
                  className={`
                    flex-shrink-0
                    ${collapsed ? 'lg:mx-auto mr-3' : 'mr-3'}
                    w-5 h-5
                    transition-all duration-300 ease-in-out
                    ${isActive
                      ? 'text-white rotate-0 scale-110'
                      : 'text-gray-400 group-hover:text-white group-hover:rotate-12 group-hover:scale-110'
                    }
                  `}
                />
                {/* Always show text on mobile, hide on desktop when collapsed */}
                <span
                  className={`
                    transition-all duration-300 ease-in-out
                    ${collapsed ? 'lg:hidden' : ''}
                    ${isActive ? 'font-semibold' : ''}
                  `}
                >
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-gray-700">
          {/* Expanded view - Show on mobile always, show on desktop when not collapsed */}
          <div className={`space-y-2 ${collapsed ? 'hidden lg:hidden' : 'block'}`}>
            <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
              <Avatar className="w-9 h-9 border-2 border-orange-500">
                <AvatarImage src={authState.user?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-orange-600 to-amber-600 text-white text-sm">
                  {authState.user ? getInitials(`${authState.user.first_name} ${authState.user.last_name}`) : 'UN'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {authState.user?.first_name} {authState.user?.last_name}
                </p>
                <p className="text-xs text-gray-400 truncate">{businessName || 'Mi Negocio'}</p>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Cerrar sesión
            </Button>
          </div>

          {/* Collapsed view - Only show on desktop when collapsed */}
          <button
            onClick={handleSignOut}
            className={`w-full p-2 hover:bg-gray-800 rounded-lg transition-colors ${collapsed ? 'hidden lg:block' : 'hidden'}`}
          >
            <LogOut className="w-5 h-5 mx-auto text-gray-400 hover:text-white" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>

            <h1 className="text-xl font-bold text-gray-900">
              {businessName || 'Mi Negocio'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Search className="w-5 h-5 text-gray-600" />
            </button>

            {/* Notifications */}
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
            </button>

            {/* User Avatar */}
            <Avatar className="w-9 h-9 border-2 border-orange-500 cursor-pointer">
              <AvatarImage src={authState.user?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-orange-600 to-amber-600 text-white text-sm">
                {authState.user ? getInitials(`${authState.user.first_name} ${authState.user.last_name}`) : 'UN'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}
