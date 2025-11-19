'use client'

import Logo from "@/components/logo"
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"

export default function Footer() {
  const navLinks = [
    { href: '#features', label: 'Características' },
    { href: '#showcase', label: 'Producto' },
    { href: '#testimonials', label: 'Testimonios' },
    { href: '#business-types', label: 'Negocios' },
  ]

  const legalLinks = [
    { href: '#', label: 'Términos y Condiciones' },
    { href: '#', label: 'Política de Privacidad' },
  ]

  const socialLinks = [
    { href: '#', icon: Facebook, name: 'Facebook' },
    { href: '#', icon: Twitter, name: 'Twitter' },
    { href: '#', icon: Instagram, name: 'Instagram' },
    { href: '#', icon: Linkedin, name: 'LinkedIn' },
  ]

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-400 dark:text-gray-500">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-6 lg:col-span-5">
            <Logo color="white" size="md" className="mb-4" />
            <p className="max-w-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Transformando la gestión de negocios de servicios, una cita a la vez.
            </p>
          </div>

          {/* Spacer */}
          <div className="hidden lg:block lg:col-span-2"></div>

          {/* Navigation Column */}
          <div className="md:col-span-2 lg:col-span-2">
            <h4 className="font-semibold text-white mb-4">Navegación</h4>
            <ul className="space-y-3">
              {navLinks.map(link => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div className="md:col-span-2 lg:col-span-2">
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map(link => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-600 order-2 sm:order-1 mt-4 sm:mt-0">
            © {new Date().getFullYear()} TuTurno. Todos los derechos reservados.
          </p>
          <div className="flex space-x-4 order-1 sm:order-2">
            {socialLinks.map((link) => {
              const Icon = link.icon
              return (
                <a key={link.name} href={link.href} aria-label={link.name} className="text-gray-500 dark:text-gray-600 hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
