'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Menu, X, LogIn, LogOut, User, Briefcase, ShoppingCart, LayoutDashboard, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import Logo from '../logo'

import { useTheme } from 'next-themes'

export default function Header() {
  const router = useRouter()
  const { authState, signOut } = useAuth()
  const { theme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  // Determine user role and theme colors
  const isClient = authState.user?.is_client && !authState.user?.is_business_owner
  const isBusinessOwner = authState.user?.is_business_owner
  
  // Theme configuration based on user role
  const themeColors = {
    primary: isClient ? 'slate' : 'orange',
    buttonBg: isClient ? 'bg-slate-900' : 'bg-orange-600',
    buttonHover: isClient ? 'hover:bg-slate-800' : 'hover:bg-orange-700',
    textColor: isClient ? 'text-slate-900' : 'text-orange-600',
    hoverTextColor: isClient ? 'hover:text-slate-900' : 'hover:text-orange-600',
  }

  // Original logic from user
  const handleReserveClick = () => {
    setIsMenuOpen(false)
    if (authState.user) {
      router.push('/marketplace')
    } else {
      router.push('/auth/client') // Ir a página de selección (Login o Registro)
    }
  }

  const handleBusinessClick = () => {
    setIsMenuOpen(false)
    if (authState.user && authState.user.is_business_owner) {
      router.push('/dashboard/business')
    } else if (authState.user && authState.user.is_client) {
      router.push('/auth/business/setup')
    } else {
      router.push('/auth/business') // Ir a página de selección (Login o Registro)
    }
  }

  const navItems: Array<{ href: string; label: string; isExternal?: boolean }> = [
    { href: '#features', label: 'Características' },
    { href: '#showcase', label: 'Producto' },
    { href: '#about', label: 'Quiénes Somos' },
    { href: '#business-types', label: 'Negocios' },
    { href: '/marketplace', label: 'Marketplace', isExternal: true },
  ]

  // Intersection observer for active section highlighting
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-50% 0px -50% 0px' }
    )

    // Only observe internal section links (not external links like /marketplace)
    const elements = navItems
      .filter(item => !item.isExternal)
      .map(item => document.querySelector(item.href))
      .filter(Boolean);

    elements.forEach(element => {
        if(element) observer.observe(element)
    });

    return () => {
        elements.forEach(element => {
            if(element) observer.unobserve(element)
        });
    }
  }, [navItems])

  const NavLink = ({ href, label, isExternal }: { href: string; label: string; isExternal?: boolean }) => {
    const isActive = !isExternal && activeSection === href.substring(1)

    if (isExternal) {
      return (
        <a
          href={href}
          onClick={() => setIsMenuOpen(false)}
          className="font-medium transition-all duration-200 py-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-500 relative group text-xs lg:text-sm"
        >
          {label}
          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-600 dark:bg-orange-500 transition-all duration-200 group-hover:w-full"></span>
        </a>
      )
    }

    return (
      <a
        href={href}
        onClick={() => setIsMenuOpen(false)}
        className={`font-medium transition-all duration-200 py-2 relative group text-xs lg:text-sm ${
          isActive
            ? 'text-orange-600 dark:text-orange-500'
            : 'text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-500'
        }`}>
        {label}
        <span className={`absolute bottom-0 left-0 h-0.5 bg-orange-600 dark:bg-orange-500 transition-all duration-200 ${
          isActive ? 'w-full' : 'w-0 group-hover:w-full'
        }`}></span>
      </a>
    )
  }

  return (
    <header className="fixed top-3 left-3 right-3 sm:left-4 sm:right-4 md:left-6 md:right-6 z-50">
      <div className="max-w-6xl mx-auto rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg shadow-black/[0.08] dark:shadow-black/[0.3] border border-gray-200/60 dark:border-gray-700/40 ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
        <div className="px-3 sm:px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-2 cursor-pointer transition-transform hover:scale-105 duration-200" onClick={() => router.push('/')}>
              <Logo color={theme === 'dark' ? 'white' : 'black'} size='md' />
            </div>

            <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
              {navItems.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} isExternal={item.isExternal} />
              ))}
            </nav>

            {/* Desktop Action Buttons */}
            <div className="hidden lg:flex items-center gap-1.5 xl:gap-3">
              {authState.user ? (
                <>
                  {/* Show Marketplace only for clients */}
                  {isClient && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleReserveClick} 
                      className="dark:text-gray-300 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-slate-500 text-xs xl:text-sm px-2 xl:px-4"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 xl:w-4 xl:h-4 mr-1.5 xl:mr-2" />
                      <span className="hidden xl:inline">Marketplace</span>
                      <span className="xl:hidden">Market</span>
                    </Button>
                  )}
                  {/* Dashboard button for business owners */}
                  {isBusinessOwner && (
                    <Button 
                      size="sm"
                      onClick={() => router.push('/dashboard/business')}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs xl:text-sm px-2 xl:px-4"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 xl:w-4 xl:h-4 mr-1.5 xl:mr-2"/>
                      Dashboard
                    </Button>
                  )}
                  {/* Dashboard button for clients */}
                  {isClient && (
                    <Button 
                      size="sm"
                      onClick={() => router.push('/dashboard/client')}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs xl:text-sm px-2 xl:px-4"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 xl:w-4 xl:h-4 mr-1.5 xl:mr-2"/>
                      Dashboard
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={signOut} 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs xl:text-sm px-2 xl:px-4"
                  >
                    <LogOut className="w-3.5 h-3.5 xl:w-4 xl:h-4 mr-1.5 xl:mr-2" />
                    Salir
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={handleReserveClick} 
                    className="border-2 border-slate-200 text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:border-slate-600 transition-all duration-200 text-xs xl:text-sm px-2 xl:px-4"
                  >
                    Reservar Cita
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBusinessClick}
                    className="bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all duration-300 text-xs xl:text-sm px-2 xl:px-4 whitespace-nowrap"
                  >
                    <span className="hidden xl:inline">Registra tu Negocio</span>
                    <span className="xl:hidden">Registrar</span>
                  </Button>
               
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
          isMenuOpen ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
        }`}>
        <div className="max-w-5xl mx-auto rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
          <div className="px-4 sm:px-6 py-6">
            {/* Navigation Links */}
            <nav className="flex flex-col space-y-3 mb-6">
              {navItems.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} isExternal={item.isExternal} />
              ))}
            </nav>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3 pt-6 border-t border-gray-200 dark:border-gray-800">
              {authState.user ? (
                 <>
                  {/* Show Marketplace only for clients */}
                  {isClient && (
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={handleReserveClick} 
                      className="w-full justify-start dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Ir al Marketplace
                    </Button>
                  )}
                  {/* Dashboard button for business owners */}
                  {isBusinessOwner && (
                    <Button 
                      size="lg" 
                      onClick={() => router.push('/dashboard/business')}
                      className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <LayoutDashboard className="w-5 h-5 mr-2"/>
                      Mi Dashboard
                    </Button>
                  )}
                  {/* Dashboard button for clients */}
                  {isClient && (
                    <Button 
                      size="lg" 
                      onClick={() => router.push('/dashboard/client')}
                      className="w-full justify-start bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      <LayoutDashboard className="w-5 h-5 mr-2"/>
                      Mi Dashboard
                    </Button>
                  )}
                  <Button 
                    size="lg" 
                    variant="ghost" 
                    onClick={signOut} 
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    Cerrar Sesión
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={handleBusinessClick}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-md"
                  >
                    Registra tu Negocio
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    onClick={handleReserveClick}
                  >
                    Reservar Cita
                  </Button>
             
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
