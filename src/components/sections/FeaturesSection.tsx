'use client'

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CalendarCheck,
  Users,
  Bell,
  LineChart,
  Smartphone,
  Headphones,
  ChevronRight
} from "lucide-react"
import { useScrollReveal } from '@/hooks/useScrollReveal'

const features = [
  {
    icon: CalendarCheck,
    title: "Agendamiento 24/7",
    description: "Permite que tus clientes reserven en cualquier momento, desde cualquier dispositivo, sin llamadas interrumpidas.",
  },
  {
    icon: Bell,
    title: "Recordatorios Automáticos",
    description: "Envía notificaciones automáticas para reducir ausencias y mantener tu agenda siempre llena.",
  },
  {
    icon: Users,
    title: "Gestión de Clientes",
    description: "Mantén un registro detallado de tus clientes, sus preferencias y su historial de visitas en un solo lugar.",
  },
  {
    icon: LineChart,
    title: "Panel de Analytics",
    description: "Toma decisiones basadas en datos. Visualiza tus ingresos, servicios más populares y rendimiento del equipo.",
  },
  {
    icon: Smartphone,
    title: "Multi-plataforma",
    description: "Gestiona tu negocio desde tu celular, tablet o computadora con una experiencia fluida y sincronizada.",
  },
  {
    icon: Headphones,
    title: "Soporte Prioritario",
    description: "Contamos con un equipo dedicado para ayudarte a configurar y sacar el máximo provecho a la plataforma.",
  },
]

export default function FeaturesSection() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal()
  const { ref: gridRef, isVisible: gridVisible } = useScrollReveal({ threshold: 0.08 })

  return (
    <section id="features" className="py-20 lg:py-28 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div
            ref={titleRef}
            className={`text-center mb-16 scroll-reveal ${titleVisible ? 'revealed' : ''}`}>
            <Badge variant="outline" className="mb-4 border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-500 px-4 py-1 text-xs font-bold tracking-wider">
              LO QUE OFRECEMOS
            </Badge>

            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
              Todo lo que necesitas para <br className="hidden md:block" />
              hacer crecer tu negocio
            </h2>

            <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 text-balance max-w-3xl mx-auto leading-relaxed">
              Diseñamos herramientas potentes pero simples que eliminan el estrés operativo 
              y te permiten enfocarte en lo que mejor sabes hacer.
            </p>
          </div>

          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon

              return (
                <div
                  key={index}
                  className={`scroll-reveal-up ${gridVisible ? 'revealed' : ''}`}
                  style={{ transitionDelay: `${100 * (index + 1)}ms` }}
                >
                  <Card
                    className="group bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:border-orange-200 dark:hover:border-orange-900/50 transition-all duration-500 rounded-3xl h-full flex flex-col pt-4"
                  >
                    <CardHeader className="p-8 pb-4">
                      <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-600 transition-all duration-500">
                        <IconComponent className="w-7 h-7 text-orange-600 group-hover:text-white transition-colors duration-500" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex-grow">
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                        {feature.description}
                      </p>
                      
                      <div className="mt-auto">
                        <button className="flex items-center text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors group/btn">
                          Saber más
                          <ChevronRight className="ml-1 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
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
