'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CTASection() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="bg-gray-900 dark:bg-gray-950 overflow-hidden">
      <div className="container mx-auto px-4 py-16 lg:py-24">
        <div
          className={`max-w-3xl mx-auto text-center transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            ¿Listo para llevar tu negocio al siguiente nivel?
          </h2>

          <p className="text-lg text-gray-300 dark:text-gray-400 mb-10 leading-relaxed">
            Únete a cientos de negocios que ya gestionan su día a día de forma más inteligente. La configuración toma solo 2 minutos.
          </p>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => router.push('/auth/business/register')}
              className=" bg-orange-600 hover:bg-orange-700 text-white px-10 py-7 text-lg font-semibold shadow-2xl shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-300 transform hover:scale-105 group"
            >
              Empieza Gratis Ahora
              <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <p className="mt-6 text-sm text-gray-500 dark:text-gray-600">
            No se requiere tarjeta de crédito.
          </p>
        </div>
      </div>
    </section>
  )
}
