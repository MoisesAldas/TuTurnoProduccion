'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  Play,
  Star,
  CheckCircle,
  Calendar,
  Users,
  Clock,
  Shield
} from "lucide-react"
import { useRouter } from "next/navigation"

export default function HeroSection() {
  const router = useRouter()
  const [statsAnimated, setStatsAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStatsAnimated(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const AnimatedNumber = ({ value, suffix = "", delay = 0 }: { value: number; suffix?: string; delay?: number }) => {
    const [count, setCount] = useState(0)

    useEffect(() => {
      if (!statsAnimated) return

      const timer = setTimeout(() => {
        let start = 0
        const increment = value / 100
        const timer = setInterval(() => {
          start += increment
          if (start >= value) {
            setCount(value)
            clearInterval(timer)
          } else {
            setCount(Math.floor(start))
          }
        }, 20)
        return () => clearInterval(timer)
      }, delay)

      return () => clearTimeout(timer)
    }, [statsAnimated, value, delay])

    return <span>{count.toLocaleString()}{suffix}</span>
  }

  return (
    <section className="pt-24 pb-16 lg:pt-32 lg:pb-24 px-4 relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/30 to-white">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-40 -left-20 w-96 h-96 bg-emerald-400/10 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-teal-400/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-1/3 w-72 h-72 bg-cyan-400/10 rounded-full filter blur-3xl animate-pulse delay-500"></div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 left-10 animate-bounce delay-1000">
          <div className="w-4 h-4 bg-emerald-400 rounded-full opacity-60"></div>
        </div>
        <div className="absolute top-1/3 right-20 animate-bounce delay-1500">
          <div className="w-6 h-6 bg-teal-400 rounded-full opacity-40"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-bounce delay-2000">
          <div className="w-5 h-5 bg-cyan-400 rounded-full opacity-50"></div>
        </div>
      </div>

      <div className="container mx-auto text-center max-w-6xl relative z-10">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-3 mb-8 px-6 py-3 bg-white/90 backdrop-blur-md rounded-full border border-emerald-100 shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/15 transition-all duration-300 group">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <Sparkles className="w-5 h-5 text-emerald-600 group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-gray-700 font-semibold">Plataforma #1 en gestión de citas</span>
          <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 ml-2 animate-pulse">
            Nuevo
          </Badge>
        </div>

        {/* Main Headline */}
        <div className="mb-8 space-y-6">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-balance leading-tight">
            <span className="text-gray-900 block mb-4">
              Transforma tu negocio con
            </span>
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent block">
              citas inteligentes
            </span>
          </h1>
        </div>

        {/* Description */}
        <p className="text-xl md:text-2xl text-gray-600 text-balance mb-12 leading-relaxed max-w-4xl mx-auto">
          Automatiza reservas, elimina las ausencias y{' '}
          <span className="text-emerald-600 font-bold">aumenta tus ingresos hasta un 40%</span>{' '}
          con la plataforma más avanzada de gestión de citas.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button
            size="lg"
            onClick={() => router.push('/auth/client/login')}
            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white px-10 py-6 text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group"
          >
            <Sparkles className="mr-3 w-6 h-6 group-hover:rotate-12 transition-transform" />
            Comenzar Gratis Ahora
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-10 py-6 text-lg group hover:shadow-lg transition-all duration-300"
          >
            <Play className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
            Ver Demo Interactiva
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-16 opacity-70">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-gray-600 font-medium">Sin tarjeta de crédito</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-emerald-600" />
            <span className="text-gray-600 font-medium">Setup en 60 segundos</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="text-gray-600 font-medium">Soporte 24/7</span>
          </div>
        </div>

        {/* Interactive Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Users className="w-10 h-10 text-white" />,
              value: 15000,
              suffix: "+",
              label: "Negocios activos",
              gradient: "from-emerald-500 to-teal-500",
              delay: 0
            },
            {
              icon: <Star className="w-10 h-10 text-white" />,
              value: 4.9,
              suffix: "/5",
              label: "Satisfacción del cliente",
              gradient: "from-amber-500 to-orange-500",
              delay: 200
            },
            {
              icon: <Clock className="w-10 h-10 text-white" />,
              value: 60,
              suffix: "s",
              label: "Tiempo de configuración",
              gradient: "from-cyan-500 to-blue-500",
              delay: 400
            }
          ].map((stat, index) => (
            <div
              key={index}
              className="group bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-white/40 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 cursor-pointer"
              style={{ animationDelay: `${stat.delay}ms` }}
            >
              <div className={`w-20 h-20 bg-gradient-to-r ${stat.gradient} rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                {stat.icon}
              </div>
              <p className="text-4xl font-bold text-gray-900 mb-3">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} delay={stat.delay} />
              </p>
              <p className="text-gray-600 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-6">Confiado por miles de empresas en Latinoamérica</p>
          <div className="flex justify-center items-center gap-8 opacity-60">
            {['Salón Belleza Pro', 'MediCare Clínica', 'Estética Plus', 'Spa Wellness'].map((name, index) => (
              <div
                key={name}
                className="text-gray-400 font-semibold text-sm md:text-base hover:text-emerald-600 transition-colors cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}