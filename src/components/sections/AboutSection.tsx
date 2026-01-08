'use client'

import { useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Target, Eye, Heart, Users, Zap, Shield } from "lucide-react"

const values = [
  {
    icon: Zap,
    title: "Innovación",
    description: "Desarrollamos soluciones tecnológicas que simplifican la gestión de citas y optimizan el tiempo de nuestros clientes.",
  },
  {
    icon: Users,
    title: "Enfoque en el Cliente",
    description: "Diseñamos cada funcionalidad pensando en las necesidades reales de los negocios y sus clientes.",
  },
  {
    icon: Shield,
    title: "Confiabilidad",
    description: "Garantizamos un servicio estable, seguro y disponible para que tu negocio nunca se detenga.",
  },
  {
    icon: Heart,
    title: "Compromiso",
    description: "Nos dedicamos a ayudar a los negocios ecuatorianos a crecer y profesionalizarse.",
  },
]

export default function AboutSection() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section id="about" className="py-16 lg:py-24 bg-slate-50 dark:bg-gray-900 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div
            className={`text-center mb-16 transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Badge variant="outline" className="mb-4 border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-500">
              QUIÉNES SOMOS
            </Badge>

            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
              Transformando la gestión de citas en Ecuador
            </h2>

            <p className="text-lg text-gray-600 dark:text-gray-400 text-balance max-w-3xl mx-auto leading-relaxed">
              TuTurno nace de la necesidad de digitalizar y profesionalizar la gestión de citas en negocios ecuatorianos, 
              ofreciendo una plataforma completa, intuitiva y accesible para todos.
            </p>
          </div>

          {/* Mission & Vision */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <div
              className={`transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '100ms' }}>
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-4">
                      <Target className="w-8 h-8 text-orange-600 dark:text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nuestra Misión</h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Empoderar a los negocios ecuatorianos con herramientas tecnológicas que simplifiquen la gestión de citas, 
                    mejoren la experiencia del cliente y potencien el crecimiento empresarial a través de la digitalización.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div
              className={`transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '200ms' }}>
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-4">
                      <Eye className="w-8 h-8 text-orange-600 dark:text-orange-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nuestra Visión</h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Ser la plataforma líder de gestión de citas en Ecuador, reconocida por su innovación, confiabilidad y 
                    compromiso con el éxito de cada negocio que confía en nosotros.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Values */}
          <div
            className={`transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: '300ms' }}>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
              Nuestros Valores
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon
                return (
                  <div
                    key={index}
                    className={`transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ transitionDelay: `${400 + (100 * index)}ms` }}>
                    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                      <CardContent className="p-6 text-center">
                        <div className="inline-flex p-4 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-4">
                          <Icon className="w-8 h-8 text-orange-600 dark:text-orange-500" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                          {value.title}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {value.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
