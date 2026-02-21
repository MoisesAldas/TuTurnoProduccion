'use client'

import Logo from "@/components/logo"
import { Facebook, Twitter, Instagram, Linkedin, ArrowUpRight } from "lucide-react"
import { useScrollReveal } from '@/hooks/useScrollReveal'

export default function Footer() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  const productLinks = [
    { href: '#features', label: 'Características' },
    { href: '#about', label: 'Metodología' },
    { href: '#showcase', label: 'Vista previa' },
    { href: '#pricing', label: 'Precios' },
  ]

  const companyLinks = [
    { href: '#', label: 'Sobre nosotros' },
    { href: '#', label: 'Blog' },
    { href: '#', label: 'Carreras' },
    { href: '#', label: 'Contacto' },
  ]

  const legalLinks = [
    { href: '#', label: 'Términos de servicio' },
    { href: '#', label: 'Privacidad' },
    { href: '#', label: 'Cookies' },
  ]

  const socialLinks = [
    { href: '#', icon: Facebook, name: 'Facebook' },
    { href: '#', icon: Twitter, name: 'Twitter' },
    { href: '#', icon: Instagram, name: 'Instagram' },
    { href: '#', icon: Linkedin, name: 'LinkedIn' },
  ]

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 pt-20 pb-10">
      <div
        ref={ref}
        className={`container mx-auto px-4 scroll-reveal-fade ${isVisible ? 'revealed' : ''}`}>
        
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">
            {/* Brand Column */}
            <div className="lg:col-span-4">
              <Logo color="black" size="md" className="mb-6" />
              <p className="max-w-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                La plataforma líder en gestión de citas que ayuda a negocios de servicios a escalar su operación con tecnología inteligente.
              </p>
              <div className="flex space-x-4">
                {socialLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <a 
                      key={link.name} 
                      href={link.href} 
                      aria-label={link.name} 
                      className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-300"
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-2 lg:col-start-7">
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider text-xs">Producto</h4>
              <ul className="space-y-4">
                {productLinks.map(link => (
                  <li key={link.label}>
                    <a href={link.href} className="text-gray-500 dark:text-gray-400 hover:text-orange-600 transition-colors flex items-center group">
                      {link.label}
                      <ArrowUpRight className="ml-1 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2 lg:col-start-9">
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider text-xs">Compañía</h4>
              <ul className="space-y-4">
                {companyLinks.map(link => (
                  <li key={link.label}>
                    <a href={link.href} className="text-gray-500 dark:text-gray-400 hover:text-orange-600 transition-colors flex items-center group">
                      {link.label}
                      <ArrowUpRight className="ml-1 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2 lg:col-start-11">
              <h4 className="font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider text-xs">Legal</h4>
              <ul className="space-y-4">
                {legalLinks.map(link => (
                  <li key={link.label}>
                    <a href={link.href} className="text-gray-500 dark:text-gray-400 hover:text-orange-600 transition-colors flex items-center group">
                      {link.label}
                      <ArrowUpRight className="ml-1 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-100 dark:border-gray-900 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400 dark:text-gray-600">
            <p className="mb-4 md:mb-0">
              © {new Date().getFullYear()} TuTurno. Todos los derechos reservados.
            </p>
            <div className="flex items-center space-x-6">
              <p className="flex items-center">
                Hecho con <span className="text-orange-500 mx-1">♥</span> en Ecuador
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
