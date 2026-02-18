'use client'

import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useScrollReveal } from '@/hooks/useScrollReveal'

export default function BusinessShowcase() {
  const { ref: titleRef, isVisible: titleVisible } = useScrollReveal()
  const { ref: mockupRef, isVisible: mockupVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section id="showcase" className="py-16 lg:py-24 bg-slate-50 dark:bg-gray-900 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div
            ref={titleRef}
            className={`scroll-reveal ${titleVisible ? 'revealed' : ''}`}>
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-500">
                TU CENTRO DE MANDO
              </Badge>

              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
                Control Total, Desde un Solo Lugar.
              </h2>

              <p className="text-lg text-gray-600 dark:text-gray-400 text-balance max-w-3xl mx-auto leading-relaxed">
                Nuestra plataforma te da una vista de 360° de tu negocio. Citas, empleados, clientes y facturación, todo organizado y al alcance de tu mano.
              </p>
            </div>
          </div>

          <div
            ref={mockupRef}
            className={`scroll-reveal-scale ${mockupVisible ? 'revealed' : ''}`}
            style={{ transitionDelay: '200ms' }}>
            {/* Browser Frame */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl shadow-slate-300/60 dark:shadow-slate-900/60 border border-slate-200 dark:border-slate-700">
              {/* Browser Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-grow text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">app.tuturno.com</p>
                </div>
              </div>

              {/* Application Screenshot */}
              <div className="p-2 bg-slate-100 dark:bg-slate-900">
                              <Image
                                src="/newdashboard.png"
                                alt="Dashboard de TuTurno"
                                width={1200}
                                height={800}
                                quality={100}
                                unoptimized={true}
                                className="rounded-md shadow-inner"
                              />              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
