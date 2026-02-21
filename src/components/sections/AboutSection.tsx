'use client'

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Laptop, Clock, BarChart4 } from "lucide-react"
import { useScrollReveal } from '@/hooks/useScrollReveal'

const pillars = [
  {
    icon: Laptop,
    title: "Transformación Digital",
    description: "Lleva tu negocio al siguiente nivel con nuestras herramientas virtuales diseñadas para la era moderna.",
  },
  {
    icon: Clock,
    title: "Gestión Inteligente",
    description: "Optimiza tu tiempo y el de tus clientes con un sistema automatizado que trabaja por ti 24/7.",
  },
  {
    icon: BarChart4,
    title: "Control Total",
    description: "Accede a estadísticas en tiempo real y gestiona cada detalle de tu operación desde cualquier lugar.",
  },
]

export default function AboutSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal()
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section id="about" className="py-20 lg:py-28 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div
            ref={headerRef}
            className={`text-center mb-16 scroll-reveal ${headerVisible ? 'revealed' : ''}`}>
            <Badge variant="outline" className="mb-4 border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-500 px-4 py-1 text-xs font-bold tracking-wider">
              ¿QUÉ ES TUTURNO?
            </Badge>

            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
              Gestiona tu negocio de servicios de <br className="hidden md:block" />
              <span className="text-orange-600">forma inteligente</span>
            </h2>

            <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 text-balance max-w-3xl mx-auto leading-relaxed">
              Dile adiós a la gestión manual. TuTurno es la plataforma integral que profesionaliza 
              tu atención al cliente y optimiza tus ingresos automáticamente.
            </p>
          </div>

          {/* Pillars Grid */}
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon
              return (
                <div
                  key={index}
                  className={`scroll-reveal-up ${cardsVisible ? 'revealed' : ''}`}
                  style={{ transitionDelay: `${150 * (index + 1)}ms` }}>
                  <Card className="bg-slate-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm h-full hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group rounded-3xl overflow-hidden">
                    <CardContent className="p-8 flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:bg-orange-600 transition-all duration-500">
                        <Icon className="w-8 h-8 text-orange-600 group-hover:text-white transition-colors duration-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-orange-600 transition-colors">
                        {pillar.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-balance">
                        {pillar.description}
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
