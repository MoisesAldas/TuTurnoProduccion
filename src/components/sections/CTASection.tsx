import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Sparkles,
  ArrowRight,
  MessageSquare,
  CheckCircle
} from "lucide-react"

export default function CTASection() {
  return (
    <section className="py-24 px-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-white/10 rounded-full filter blur-3xl"></div>
      </div>
      
      <div className="container mx-auto text-center relative">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-8 bg-white/20 text-white hover:bg-white/30 border-white/30">
            <Clock className="w-4 h-4 mr-2" />
            Oferta por tiempo limitado
          </Badge>
          
          <h2 className="text-4xl md:text-6xl font-bold mb-8 text-balance leading-tight">
            ¿Listo para <span className="text-amber-300">10X</span> tu negocio?
          </h2>
          
          <p className="text-xl md:text-2xl mb-12 text-white/90 text-pretty max-w-3xl mx-auto leading-relaxed">
            Únete a miles de empresarios que ya transformaron sus negocios. 
            <span className="text-amber-300 font-semibold"> Primeros 30 días gratis</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Button
              size="lg"
              className="bg-white text-emerald-700 hover:bg-gray-100 px-12 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >
              <Sparkles className="mr-2 w-5 h-5" />
              Comenzar Ahora - GRATIS
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white/40 text-white hover:bg-white/10 px-12 py-4 text-lg backdrop-blur-sm"
            >
              <MessageSquare className="mr-2 w-5 h-5" />
              Hablar con Ventas
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span>Sin tarjeta de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span>Configuración gratuita</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span>Soporte 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}