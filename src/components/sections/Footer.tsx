import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"

export default function Footer() {
  return (
    <footer className="py-16 px-4 bg-slate-900 text-white">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">TuTurno</span>
            </div>
            <p className="text-slate-300 mb-6 leading-relaxed">
              La plataforma más avanzada para gestionar citas y hacer crecer tu negocio.
            </p>
            <div className="flex space-x-4">
              <Badge className="bg-green-100 text-green-700">En línea</Badge>
              <Badge className="bg-emerald-100 text-emerald-700">Soporte 24/7</Badge>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-6 text-lg">Producto</h4>
            <ul className="space-y-3 text-slate-300">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Características
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Precios
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Integraciones
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  API
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-6 text-lg">Soporte</h4>
            <ul className="space-y-3 text-slate-300">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Centro de Ayuda
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contacto
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Estado del Sistema
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Comunidad
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-6 text-lg">Empresa</h4>
            <ul className="space-y-3 text-slate-300">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Acerca de
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Carreras
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Privacidad
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-700 mt-12 pt-8 text-center">
          <p className="text-slate-400">© 2024 TuTurno. Transformando negocios en todo el mundo.</p>
        </div>
      </div>
    </footer>
  )
}