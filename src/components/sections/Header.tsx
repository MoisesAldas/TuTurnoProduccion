'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Menu, X, LogIn, LogOut, User, Briefcase, ShoppingCart, LayoutDashboard } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import Logo from '../logo'
import { ThemeToggle } from '@/components/ThemeToggle'
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

  const navItems = [
    { href: '#features', label: 'Características' },
    { href: '#showcase', label: 'Producto' },
    { href: '#testimonials', label: 'Testimonios' },
    { href: '#business-types', label: 'Negocios' },
  ]

  // Scroll detection for header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
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

    const elements = navItems.map(item => document.querySelector(item.href)).filter(Boolean);
    elements.forEach(element => {
        if(element) observer.observe(element)
    });

    return () => {
        elements.forEach(element => {
            if(element) observer.unobserve(element)
        });
    }
  }, [navItems])

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const isActive = activeSection === href.substring(1)
    return (
      <a
        href={href}
        onClick={() => setIsMenuOpen(false)}
        className={`font-semibold transition-colors py-2 ${
          isActive
            ? 'text-orange-600 dark:text-orange-500'
            : 'text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-500'
        }`}>
        {label}
      </a>
    )
  }

  return (
    <header
      className={`fixed top-0 w-full z-50 bg-white dark:bg-gray-900 transition-all duration-300 ${
        isScrolled ? 'shadow-md border-b border-gray-200 dark:border-gray-800' : ''
      }`}>
      <div className="container mx-auto px-4 ">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-3 cursor-pointer ml-4" onClick={() => router.push('/')}>
            <Logo color={theme === 'dark' ? 'white' : 'black'} size="lg" />
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>

          {/* === USER'S ORIGINAL LOGIC + NEW STYLES + THEME TOGGLE === */}
          <div className="hidden md:flex items-center space-x-2">
            {authState.user ? (
              <>
                <Button variant="ghost" onClick={handleReserveClick} className="dark:text-gray-300 dark:hover:bg-gray-800">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Marketplace
                </Button>
                {authState.user.is_business_owner && (
                  <Button onClick={() => router.push('/dashboard/business')}>
                    <Briefcase className="w-4 h-4 mr-2"/>
                    Mi Negocio
                  </Button>
                )}
                {authState.user.is_client && !authState.user.is_business_owner && (
                  <Button onClick={() => router.push('/dashboard/client')}>
                    <LayoutDashboard className="w-4 h-4 mr-2"/>
                    Mi Dashboard
                  </Button>
                )}
                <Button variant="ghost" onClick={signOut} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <LogOut className="w-4 h-4 mr-2" />
                  Salir
                </Button>
                <ThemeToggle />
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={handleReserveClick} className=" border-2 border-slate-200
    text-slate-800
    hover:bg-slate-900
    hover:text-white
    hover:border-slate-900
    transition-colors
    duration-200">
                  Reservar Cita
                </Button>
                <Button
                  onClick={handleBusinessClick}
                  className=" bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  Registra tu Negocio
                </Button>
                <ThemeToggle />
              </>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="container mx-auto px-4 py-6">
            <nav className="flex flex-col space-y-4 mb-6">
              {navItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
            <div className="flex flex-col space-y-3 pt-6 border-t border-gray-200 dark:border-gray-800">
              {authState.user ? (
                 <>
                  <Button size="lg" variant="outline" onClick={handleReserveClick} className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Ir al Marketplace
                  </Button>
                  {authState.user.is_business_owner && (
                    <Button size="lg" onClick={() => router.push('/dashboard/business')}>
                      <Briefcase className="w-5 h-5 mr-2"/>
                      Mi Negocio
                    </Button>
                  )}
                  {authState.user.is_client && !authState.user.is_business_owner && (
                    <Button size="lg" onClick={() => router.push('/dashboard/client')}>
                      <LayoutDashboard className="w-5 h-5 mr-2"/>
                      Mi Dashboard
                    </Button>
                  )}
                  <Button size="lg" variant="ghost" onClick={signOut} className="text-red-600 hover:text-red-700 justify-start dark:hover:bg-red-900/20">
                    <LogOut className="w-5 h-5 mr-2" />
                    Cerrar Sesión
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={handleBusinessClick}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white"
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
      )}
    </header>
  )
}
