'use client'

import { useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import Image from "next/image"

const testimonials = [
  {
    name: "Ana Lucía",
    role: "Dueña de The Beauty Room",
    avatar: "/hair-stylist-woman-professional-salon-environment-.jpg",
    rating: 5,
    quote: "Desde que uso TuTurno, mis citas 'no-show' han disminuido en un 90%. La gestión de mi salón nunca ha sido tan fácil y organizada.",
  },
  {
    name: "Dr. Javier Torres",
    role: "Odontólogo en Sonrisa Perfecta",
    avatar: "/professional-male-dentist-in-white-coat-smiling.jpg",
    rating: 5,
    quote: "La página de reservas online es increíble. Mis pacientes agendan a cualquier hora y mi calendario se llena solo. ¡Recomendadísimo!",
  },
  {
    name: "Roberto Silva",
    role: "Propietario de AutoExpert",
    avatar: "/mechanic-man-in-work-uniform-professional-smiling.jpg",
    rating: 5,
    quote: "Nunca pensé que un taller mecánico necesitara esto, pero TuTurno nos ayudó a organizar el trabajo y reducir la espera. Los clientes están más satisfechos.",
  },
]

export default function TestimonialsSection() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section id="testimonials" className="py-16 lg:py-24 bg-slate-50 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div
            className={`text-center mb-12 transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Badge variant="outline" className="mb-4 border-orange-300 text-orange-600">
              VOCES DE NUESTROS CLIENTES
            </Badge>

            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              No confíes en nuestra palabra. Confía en la de ellos.
            </h2>

            <p className="text-lg text-gray-600 text-balance max-w-3xl mx-auto leading-relaxed">
              Miles de negocios en Ecuador ya están creciendo y optimizando su día a día con TuTurno.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${100 * (index + 1)}ms` }}>
                <Card className="bg-white border-gray-200 shadow-sm flex flex-col h-full">
                  <CardContent className="p-6 flex flex-col flex-grow">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <blockquote className="text-gray-700 italic text-lg flex-grow">
                      <p>"{testimonial.quote}"</p>
                    </blockquote>
                    <div className="mt-6 pt-6 border-t border-gray-200 flex items-center">
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover mr-4" />
                      <div>
                        <p className="font-semibold text-gray-900">{testimonial.name}</p>
                        <p className="text-sm text-gray-500">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
