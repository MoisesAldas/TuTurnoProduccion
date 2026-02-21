'use client'

import React, { useRef, useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import {
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
  Dumbbell,
  ClipboardList,
  LucideProps,
} from "lucide-react"
import { motion, useAnimationControls } from "framer-motion"
import { useScrollReveal } from '@/hooks/useScrollReveal'

type IconMap = {
  [key: string]: React.ComponentType<LucideProps>
}

const iconMap: IconMap = {
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
  Dumbbell,
  ClipboardList,
}

const businessTypes = [
  {
    name: "Barberías",
    description: "Gestión de barberos y turnos rápidos",
    image: "/elegant-hair-salon-interior-with-modern-styling-ch.jpg",
    icon: "Scissors",
  },
  {
    name: "Clínicas",
    description: "Historias clínicas y agendas médicas",
    image: "/professional-male-dentist-in-white-coat-smiling.jpg",
    icon: "ClipboardList",
  },
  {
    name: "Spas",
    description: "Reserva de cabinas y terapeutas",
    image: "/modern-spa-interior-with-relaxing-atmosphere.jpg",
    icon: "Sparkles",
  },
  {
    name: "Odontología",
    description: "Recordatorios de citas recurrentes",
    image: "/modern-dental-clinic-interior-clean-and-profession.jpg",
    icon: "Smile",
  },
  {
    name: "Gimnasios",
    description: "Control de membresías y clases grupales",
    image: "/modern-gym-interior-with-equipment-and-natural-lig.jpg",
    icon: "Dumbbell",
  },
  {
    name: "Veterinarias",
    description: "Historial de mascotas y vacunas",
    image: "/modern-veterinary-clinic-interior-with-examination.jpg",
    icon: "Stethoscope",
  },
]

// Duplicamos los elementos exactamente una vez para un bucle matemático perfecto
const repeatedBusinessTypes = [...businessTypes, ...businessTypes]

export default function BusinessTypes() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal()
  const controls = useAnimationControls()
  
  // Animación infinita ultra suave y lenta
  useEffect(() => {
    controls.start({
      x: [0, "-50%"], // Se mueve exactamente la mitad (una copia completa)
      transition: {
        duration: 80, // Muy lento para máxima elegancia
        ease: "linear",
        repeat: Infinity,
      },
    })
  }, [controls])

  return (
    <section id="business-types" className="py-20 lg:py-28 bg-white dark:bg-[#0d0d0f] overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header de la sección */}
          <div
            ref={titleRef}
            className={`text-center mb-16 scroll-reveal ${titleVisible ? 'revealed' : ''}`}>
            <Badge variant="outline" className="mb-4 border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-500 px-4 py-1 text-xs font-bold tracking-wider">
              PARA TODO TIPO DE NEGOCIO
            </Badge>

            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
              Diseñado para cualquier industria
            </h2>

            <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 text-balance max-w-3xl mx-auto leading-relaxed">
              TuTurno se adapta a los flujos únicos de tu profesión, permitiéndote 
              personalizar cada detalle de tu agenda.
            </p>
          </div>

          {/* Carrusel Contenido (limitado a max-w-6xl) */}
          <div className="relative w-full overflow-hidden rounded-[3rem]">
            <motion.div 
              className="flex gap-6 py-4"
              animate={controls}
              style={{ width: "fit-content" }}
            >
              {repeatedBusinessTypes.map((type, index) => {
                const Icon = iconMap[type.icon]
                if (!Icon) return null

                return (
                  <div
                    key={index}
                    className="relative w-[300px] md:w-[350px] h-[450px] rounded-[2.5rem] overflow-hidden group shadow-xl flex-shrink-0"
                  >
                    <Image
                      src={type.image}
                      alt={type.name}
                      fill
                      sizes="(max-width: 768px) 300px, 350px"
                      className="object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                    />
                    
                    {/* Overlay gradiente */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-all duration-500" />
                    
                    {/* Contenido inferior */}
                    <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20 group-hover:bg-orange-600 group-hover:border-orange-500 transition-all duration-500">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="text-2xl font-bold text-white tracking-tight mb-1">
                          {type.name}
                        </h3>
                        <p className="text-white/70 text-sm">
                          {type.description}
                        </p>
                      </div>

                      <div className="mt-6 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                         <span className="text-orange-400 font-medium flex items-center gap-2">
                           Ver configuración →
                         </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </motion.div>

            {/* Gradientes laterales internos para suavizar los bordes del contenedor max-w-6xl */}
            <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-white/5 dark:from-[#0d0d0f]/5 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-white/5 dark:from-[#0d0d0f]/5 to-transparent z-10 pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  )
}