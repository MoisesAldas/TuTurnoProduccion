'use client'

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CalendarCheck,
  Users,
  Mail,
  FileText,
  Globe,
  BarChart3,
} from "lucide-react"
import { useScrollReveal } from '@/hooks/useScrollReveal'

const features = [
  {
    icon: CalendarCheck,
    title: "Agenda Inteligente",
    description: "Organiza tu calendario, gestiona múltiples empleados y evita conflictos de horarios con un solo clic.",
  },
  {
    icon: Users,
    title: "Base de Datos de Clientes",
    description: "Conoce a tus clientes. Guarda su historial, preferencias y datos de contacto en un solo lugar seguro.",
  },
  {
    icon: Mail,
    title: "Recordatorios Automáticos",
    description: "Reduce las ausencias. El sistema puede enviar recordatorios por email para que tus clientes nunca olviden una cita.",
  },
  {
    icon: FileText,
    title: "Facturación Simplificada",
    description: "Genera facturas automáticamente después de cada cita y lleva un control claro y profesional de tus ingresos.",
  },
  {
    icon: Globe,
    title: "Página de Reservas Online",
    description: "Ofrece a tus clientes la comodidad de reservar online 24/7 a través de tu propia página personalizable.",
  },
  {
    icon: BarChart3,
    title: "Reportes y Analíticas",
    description: "Toma decisiones informadas. Visualiza tus ingresos, servicios más populares y el rendimiento de tus empleados.",
  },
]

export default function FeaturesSection() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal()
  const { ref: gridRef, isVisible: gridVisible } = useScrollReveal({ threshold: 0.08 })

  return (
    <section id="features" className="py-16 lg:py-24 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div
            ref={titleRef}
            className={`text-center mb-12 scroll-reveal ${titleVisible ? 'revealed' : ''}`}>
            <Badge variant="outline" className="mb-4 border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-500">
              CARACTERÍSTICAS
            </Badge>

            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
              Todo lo que necesitas, en un solo lugar.
            </h2>

            <p className="text-lg text-gray-600 dark:text-gray-400 text-balance max-w-3xl mx-auto leading-relaxed">
              Desde la gestión de citas hasta el análisis de tus ingresos, TuTurno te proporciona las herramientas para llevar tu negocio al siguiente nivel.
            </p>
          </div>

          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon

              return (
                <div
                  key={index}
                  className={`scroll-reveal ${gridVisible ? 'revealed' : ''}`}
                  style={{ transitionDelay: `${100 * (index + 1)}ms` }}
                >
                  <Card
                    className="group bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-orange-400 dark:hover:border-orange-600 transition-all duration-300 transform hover:-translate-y-2 h-full"
                  >
                    <CardHeader className="p-6">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-600 dark:group-hover:bg-orange-700 transition-colors duration-300">
                        <IconComponent className="w-6 h-6 text-orange-600 dark:text-orange-500 group-hover:text-white transition-colors duration-300" />
                      </div>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
