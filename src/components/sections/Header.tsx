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
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')

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

  // Scroll detection for header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window. scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
          className="font-medium text-sm lg:text-base transition-all duration-200 py-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-500 relative group"
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
        className={`font-medium text-sm lg:text-base transition-all duration-200 py-2 relative group ${
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
    <header
      className={`fixed top-0 w-full z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm transition-all duration-300 ${
        isScrolled ? 'shadow-lg border-b border-gray-200 dark:border-gray-800' : 'border-b border-transparent'
      }`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <div className="flex items-center space-x-2 cursor-pointer transition-transform hover:scale-105 duration-200" onClick={() => router.push('/')}>
            <Logo color={theme === 'dark' ? 'white' : 'black'} size="lg" />
          </div>

          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} isExternal={item.isExternal} />
            ))}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            {authState.user ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={handleReserveClick} 
                  className="dark:text-gray-300 dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-500"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Marketplace
                </Button>
                {authState.user.is_business_owner && (
                  <Button 
                    onClick={() => router.push('/dashboard/business')}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Briefcase className="w-4 h-4 mr-2"/>
                    Mi Negocio
                  </Button>
                )}
                {authState.user.is_client && !authState.user.is_business_owner && (
                  <Button 
                    onClick={() => router.push('/dashboard/client')}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2"/>
                    Mi Dashboard
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  onClick={signOut} 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleReserveClick} 
                  className="border-2 border-slate-200 text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:border-slate-600 transition-all duration-200"
                >
                  Reservar Cita
                </Button>
                <Button
                  onClick={handleBusinessClick}
                  className="bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  Registra tu Negocio
                </Button>
                <Button
                  onClick={() => window.open('https://wa.me/593969380735', '_blank')}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contáctame
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

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-xl">
          <div className="container mx-auto px-4 sm:px-6 py-6">
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
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={handleReserveClick} 
                    className="w-full justify-start dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Ir al Marketplace
                  </Button>
                  {authState.user.is_business_owner && (
                    <Button 
                      size="lg" 
                      onClick={() => router.push('/dashboard/business')}
                      className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Briefcase className="w-5 h-5 mr-2"/>
                      Mi Negocio
                    </Button>
                  )}
                  {authState.user.is_client && !authState.user.is_business_owner && (
                    <Button 
                      size="lg" 
                      onClick={() => router.push('/dashboard/client')}
                      className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white"
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
                  <Button
                    size="lg"
                    onClick={() => window.open('https://wa.me/593969380735', '_blank')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Contáctame
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
