'use client'

import { Button } from "@/components/ui/button"
import { ArrowRight, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { useScrollReveal } from '@/hooks/useScrollReveal'

export default function CTASection() {
  const router = useRouter()
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 })

  return (
    <section className="py-20 lg:py-32 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="container mx-auto px-4">
        <div
          ref={ref}
          className={`max-w-5xl mx-auto relative scroll-reveal-up ${isVisible ? 'revealed' : ''}`}>
          
          {/* Main Card with Gradient */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 rounded-[3rem] p-8 md:p-16 text-center text-white shadow-2xl shadow-orange-500/20">
            
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-black/10 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
            
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight tracking-tight">
                Digitaliza tu negocio hoy
              </h2>

              <p className="text-lg md:text-xl text-orange-50/90 mb-10 leading-relaxed font-medium">
                Únete a más de 10,000 negocios que ya gestionan su día a día de forma más inteligente y profesional.
              </p>

              {/* Button Group */}
              <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('/auth/business/login')}
                  className="border-2 border-white text-orange-600 hover:bg-white hover:text-orange-600 px-8 py-7 rounded-2xl text-lg font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Iniciar sesión
                </Button>
                <Button
                  size="lg"
                  onClick={() => router.push('/auth/business/register')}
                  className="bg-white hover:bg-orange-50 text-orange-600 px-8 py-7 rounded-2xl text-lg font-bold shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Registrarse
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>

              <p className="mt-6 text-sm text-orange-100/70 font-medium">
                Configuración en 2 minutos • Sin tarjeta de crédito
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
