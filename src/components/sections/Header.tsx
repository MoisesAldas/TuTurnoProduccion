'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { CalendarDays, LogOut, Menu, X, Zap, Users, Shield, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

export default function Header() {
  const router = useRouter()
  const { authState, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleReserveClick = () => {
    if (authState.user) {
      router.push('/marketplace')
    } else {
      router.push('/auth/client/login')
    }
  }

  const handleBusinessClick = () => {
    if (authState.user && authState.user.is_business_owner) {
      router.push('/dashboard/business')
    } else if (authState.user && authState.user.is_client) {
      router.push('/auth/business/setup')
    } else {
      router.push('/auth/business/login')
    }
  }

  const navItems = [
    { href: '#features', label: 'Características', icon: <Zap className="w-4 h-4" /> },
    { href: '#businesses', label: 'Negocios', icon: <Users className="w-4 h-4" /> },
    { href: '#testimonials', label: 'Testimonios', icon: <Star className="w-4 h-4" /> },
    { href: '#security', label: 'Seguridad', icon: <Shield className="w-4 h-4" /> }
  ]

  return (
    <>
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-lg border-b border-gray-200/50 shadow-lg'
          : 'bg-white/80 backdrop-blur-xl border-b border-white/20'
      }`}>
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => router.push('/')}
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <CalendarDays className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <span className="text-2xl lg:text-3xl font-bold text-black tracking-tight">
                TuTurno
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item, index) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200 font-medium group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="group-hover:scale-110 transition-transform duration-200">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-4">
              {authState.user ? (
                <>
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
                    onClick={handleReserveClick}
                  >
                    Marketplace
                  </Button>
                  {authState.user.is_business_owner && (
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard/business')}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      Mi Negocio
                    </Button>
                  )}
                  {authState.user.is_client && (
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard/client')}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      Mi Dashboard
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={signOut}
                    className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Salir
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
                    onClick={handleReserveClick}
                  >
                    Reservar Cita
                  </Button>
                  <Button
                    onClick={handleBusinessClick}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 px-6"
                  >
                    Registra tu negocio
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
        isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />

        <div className={`absolute top-0 right-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="p-6 pt-24">
            <nav className="space-y-2 mb-8">
              {navItems.map((item, index) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 p-4 rounded-xl text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="group-hover:scale-110 transition-transform duration-200">
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </a>
              ))}
            </nav>

            <div className="space-y-3">
              {authState.user ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={handleReserveClick}
                  >
                    Ir al Marketplace
                  </Button>
                  {authState.user.is_business_owner && (
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard/business')}
                      className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      Mi Negocio
                    </Button>
                  )}
                  {authState.user.is_client && (
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard/client')}
                      className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      Mi Dashboard
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={signOut}
                    className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={handleReserveClick}
                  >
                    Reservar Cita
                  </Button>
                  <Button
                    onClick={handleBusinessClick}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                  >
                    Registra tu negocio
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}