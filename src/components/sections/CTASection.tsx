'use client'

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useScrollReveal } from '@/hooks/useScrollReveal'

export default function CTASection() {
  const router = useRouter()
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 })

  return (
    <section className="relative bg-gray-900 dark:bg-gray-950 overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-orange-600/10 rounded-full blur-3xl pointer-events-none animate-gradient-shift" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/[0.07] rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 py-16 lg:py-24 relative z-10">
        <div
          ref={ref}
          className={`max-w-3xl mx-auto text-center scroll-reveal ${isVisible ? 'revealed' : ''}`}>
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
