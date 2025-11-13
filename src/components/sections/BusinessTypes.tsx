'use client'

import { useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import {
  Scissors,
  Smile,
  Dumbbell,
  Sparkles,
  Wrench,
  Briefcase,
  LucideProps,
} from "lucide-react"

// Definimos un tipo para el mapa de iconos para mayor seguridad con TypeScript
type IconMap = {
  [key: string]: React.ComponentType<LucideProps>
}

// Creamos un mapa para asociar el string del icono con su componente importado
const iconMap: IconMap = {
  Scissors,
  Smile,
  Dumbbell,
  Sparkles,
  Wrench,
  Briefcase,
}

const businessTypes = [
  {
    name: "Salones de Belleza",
    image: "/elegant-hair-salon-interior-with-modern-styling-ch.jpg",
    icon: "Scissors",
  },
  {
    name: "Clínicas Dentales",
    image: "/modern-dental-clinic-interior-clean-and-profession.jpg",
    icon: "Smile",
  },
  {
    name: "Gimnasios",
    image: "/modern-gym-interior-with-equipment-and-natural-lig.jpg",
    icon: "Dumbbell",
  },
  {
    name: "Spas y Bienestar",
    image: "/modern-spa-interior-with-relaxing-atmosphere.jpg",
    icon: "Sparkles",
  },
  {
    name: "Talleres Mecánicos",
    image: "/professional-auto-repair-shop-interior-clean-and-o.jpg",
    icon: "Wrench",
  },
  {
    name: "Servicios Profesionales",
    image: "/professional-woman-spa-owner-smiling.jpg", // Corrected, less confusing image
    icon: "Briefcase",
  },
]

export default function BusinessTypes() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section id="business-types" className="py-16 lg:py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div
            className={`text-center mb-12 transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Badge variant="outline" className="mb-4 border-orange-300 text-orange-600">
              PARA TODO TIPO DE NEGOCIO
            </Badge>

            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Adaptable a tu industria
            </h2>

            <p className="text-lg text-gray-600 text-balance max-w-3xl mx-auto leading-relaxed">
              Si tu negocio depende de la gestión de citas, TuTurno es para ti. Simplificamos la operación de cientos de industrias.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {businessTypes.map((type, index) => {
              const Icon = iconMap[type.icon]
              if (!Icon) return null

              return (
                <div
                  key={index}
                  className={`relative h-64 rounded-lg overflow-hidden group cursor-pointer shadow-sm transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${100 * (index + 1)}ms` }}
                >
                  <Image
                    src={type.image}
                    alt={type.name}
                    layout="fill"
                    objectFit="cover"
                    className="group-hover:scale-110 transition-transform duration-500 ease-in-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-6 flex items-center gap-3">
                    <Icon className="w-8 h-8 text-white opacity-90" />
                    <h3 className="text-xl font-bold text-white shadow-sm">
                      {type.name}
                    </h3>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
