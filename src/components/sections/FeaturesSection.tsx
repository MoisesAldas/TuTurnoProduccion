'use client'

import { useState, useRef, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Globe,
  Smartphone,
  Shield,
  BarChart3,
  Users,
  Bell,
  Zap,
  Brain,
  Sparkles
} from "lucide-react"

export default function FeaturesSection() {
  const [visibleFeatures, setVisibleFeatures] = useState<boolean[]>([])
  const sectionRef = useRef<HTMLDivElement>(null)

  const features = [
    {
      icon: Globe,
      title: "Reservas Online 24/7",
      description: "Plataforma inteligente que nunca duerme. Tus clientes reservan cuando quieren, desde cualquier dispositivo.",
      gradient: "from-emerald-500 to-teal-600",
      delay: 0
    },
    {
      icon: Brain,
      title: "IA Predictiva",
      description: "Algoritmos inteligentes que predicen la demanda y optimizan automáticamente tus horarios.",
      gradient: "from-teal-500 to-cyan-600",
      delay: 100
    },
    {
      icon: Smartphone,
      title: "App Móvil Premium",
      description: "Experiencia nativa en iOS y Android con sincronización en tiempo real y modo offline.",
      gradient: "from-cyan-500 to-emerald-600",
      delay: 200
    },
    {
      icon: Shield,
      title: "Seguridad Bancaria",
      description: "Cifrado de grado militar y cumplimiento PCI-DSS. Tus datos y pagos siempre protegidos.",
      gradient: "from-emerald-600 to-teal-700",
      delay: 300
    },
    {
      icon: BarChart3,
      title: "Analytics Avanzado",
      description: "Dashboard con métricas en vivo, reportes automáticos y insights accionables para crecer.",
      gradient: "from-amber-500 to-emerald-600",
      delay: 400
    },
    {
      icon: Users,
      title: "CRM Inteligente",
      description: "Perfiles completos de clientes con historial, preferencias y automatizaciones personalizadas.",
      gradient: "from-teal-600 to-cyan-700",
      delay: 500
    },
    {
      icon: Bell,
      title: "Recordatorios Smart",
      description: "WhatsApp, SMS y email automatizados con IA. Reduce ausencias hasta un 85%.",
      gradient: "from-emerald-500 to-cyan-500",
      delay: 600
    },
    {
      icon: Zap,
      title: "Automación Total",
      description: "Flujos de trabajo que se ejecutan solos: confirmaciones, reagendamientos y seguimientos.",
      gradient: "from-cyan-600 to-teal-600",
      delay: 700
    },
    {
      icon: Sparkles,
      title: "Experiencia Premium",
      description: "Interfaz galardonada con animaciones fluidas y microinteracciones que deleitan a tus clientes.",
      gradient: "from-teal-500 to-emerald-700",
      delay: 800
    }
  ]

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisibleFeatures(prev => {
                const newVisible = [...prev]
                features.forEach((_, index) => {
                  setTimeout(() => {
                    setVisibleFeatures(prevState => {
                      const updated = [...prevState]
                      updated[index] = true
                      return updated
                    })
                  }, features[index].delay)
                })
                return newVisible
              })
            }, 200)
          }
        })
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="features" className="py-24 px-4 bg-gradient-to-b from-white via-emerald-50/20 to-white relative overflow-hidden" ref={sectionRef}>
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-400/5 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-400/5 rounded-full filter blur-3xl"></div>
      </div>

      <div className="container mx-auto relative z-10">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Características Potentes
          </Badge>

          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Todo lo que necesitas para{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              dominar
            </span>{' '}
            tu industria
          </h2>

          <p className="text-xl text-gray-600 text-balance max-w-4xl mx-auto leading-relaxed">
            Herramientas diseñadas por expertos para maximizar tu eficiencia,
            automatizar procesos y crear experiencias excepcionales para tus clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => {
            const IconComponent = feature.icon
            const isVisible = visibleFeatures[index]

            return (
              <Card
                key={index}
                className={`group bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-2 cursor-pointer ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: isVisible ? '0ms' : `${feature.delay}ms`
                }}
              >
                <CardHeader className="p-8">
                  <div className={`w-18 h-18 bg-gradient-to-r ${feature.gradient} rounded-3xl flex items-center justify-center mb-6 text-white group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-xl`}>
                    <IconComponent className="w-9 h-9" />
                  </div>

                  <CardTitle className="text-xl font-bold text-gray-900 mb-4 group-hover:text-emerald-600 transition-colors">
                    {feature.title}
                  </CardTitle>

                  <CardDescription className="text-gray-600 leading-relaxed text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-50/0 to-emerald-50/0 group-hover:from-emerald-50/10 group-hover:to-emerald-50/5 rounded-lg transition-all duration-300 pointer-events-none"></div>
              </Card>
            )
          })}
        </div>

        {/* Bottom CTA section */}
        <div className="text-center mt-20">
          <p className="text-gray-500 mb-4">¿Necesitas una función específica?</p>
          <div className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer transition-colors group">
            <span>Contáctanos para una demo personalizada</span>
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </div>
        </div>
      </div>
    </section>
  )
}