'use client'

import { useState, useEffect, Suspense } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import Logo from '@/components/logo'
import NavigationProgress from '@/components/NavigationProgress'
import '@/app/nprogress.css'
import {
  Home,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  PlusSquare,
  User, // Added icon
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Toaster } from '@/components/ui/toaster'


type NavItem = {
  name: string
  href: string
  icon: LucideIcon
}

// Client-specific navigation
const navigation: NavItem[] = [
  { name: 'Inicio', href: '/dashboard/client', icon: Home },
  { name: 'Mis Citas', href: '/dashboard/client/appointments', icon: BookOpen },
  { name: 'Mi Perfil', href: '/dashboard/client/profile', icon: User }, // Added link
  { name: 'Nueva Reserva', href: '/marketplace', icon: PlusSquare },
  { name: 'Ajustes', href: '/dashboard/client/ajustes', icon: Settings },
]

const ClientDashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const router = useRouter()
  const { authState, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

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

  const handleSignOut = async () => {
    await signOut()
    router.push('/') // Redirect to landing page after sign out
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
        className={`${collapsed ? 'lg:w-20' : 'lg:w-64'}
        fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-auto
        bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white
        transition-all duration-500 ease-in-out
        flex flex-col border-r border-gray-700 shadow-2xl
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        group`}>

        {/* Logo Section */}
        <div className="h-20 flex items-center justify-center px-4 border-b border-gray-700/50 relative">
          <Link href="/" className="flex items-center justify-center transition-all duration-500">
            {/* Mobile logo */}
            <Logo color="white" size="sm" className="lg:hidden" />
            {/* Desktop expanded logo */}
            <div className={`hidden lg:flex items-center justify-center transition-all duration-500 ${collapsed ? 'opacity-0 scale-75 w-0' : 'opacity-100 scale-100 w-auto'}`}>
                <Logo color="white" size="md" />
            </div>
            {/* Desktop collapsed logo */}
            <div className={`hidden lg:flex absolute transition-all duration-500 ${collapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-500 to-green-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/50 hover:scale-110 transition-transform duration-300">
                T
              </div>
            </div>
          </Link>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1.5 hover:bg-gray-700 rounded-lg transition-colors absolute right-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard/client' && pathname?.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link key={item.name} href={item.href} prefetch={true} onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-500 ease-in-out
                  ${isActive
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-green-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                    : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:shadow-md hover:scale-[1.02]'
                  }`}>
                <Icon className={`flex-shrink-0 w-5 h-5 transition-all duration-500 ease-in-out ${collapsed ? 'lg:mx-auto mr-3' : 'mr-3'} ${isActive ? 'text-white scale-110' : 'text-gray-400 group-hover:text-white group-hover:scale-110'}`} />
                <span className={`transition-all duration-500 ease-in-out whitespace-nowrap overflow-hidden ${collapsed ? 'lg:opacity-0 lg:w-0' : 'lg:opacity-100 lg:w-auto'} ${isActive ? 'font-semibold' : ''}`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-gray-700">
          <div className={`space-y-2 transition-all duration-500 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-gray-800/50 transition-all duration-300 cursor-pointer group">
              <Avatar className="w-9 h-9 border-2 border-emerald-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <AvatarImage src={authState.user?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-sm">
                  {authState.user ? getInitials(`${authState.user.first_name} ${authState.user.last_name}`) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">
                  {authState.user?.first_name} {authState.user?.last_name}
                </p>
                <p className="text-xs text-gray-400 truncate">Cliente</p>
              </div>
            </div>
            <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all duration-300 hover:shadow-md">
              <LogOut className="w-4 h-4 mr-3" />
              Cerrar sesión
            </Button>
          </div>

          <div className={`transition-all duration-500 ${collapsed ? 'lg:block' : 'lg:hidden'} hidden`}>
            <div className="flex flex-col items-center space-y-3">
               <Avatar className="w-10 h-10 border-2 border-emerald-500 shadow-lg hover:scale-110 transition-transform duration-300 cursor-pointer">
                <AvatarImage src={authState.user?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-xs">
                  {authState.user ? getInitials(`${authState.user.first_name} ${authState.user.last_name}`) : 'U'}
                </AvatarFallback>
              </Avatar>
              <button onClick={handleSignOut} className="w-10 h-10 flex items-center justify-center hover:bg-gray-800/50 rounded-xl transition-all duration-300 hover:shadow-md group" title="Cerrar sesión">
                <LogOut className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors duration-300" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={() => router.push('/marketplace')} className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md hover:shadow-lg">
              <PlusSquare className="w-4 h-4 mr-2" />
              Nueva Reserva
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}

export default ClientDashboardLayout
