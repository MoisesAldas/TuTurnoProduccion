'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function StickyCTA() {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      // Show CTA when user has scrolled past the hero section (approx > 800px)
      if (window.scrollY > 800) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility, { passive: true })

    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transform transition-transform duration-500 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}>
      <div className="container mx-auto px-4 py-3">
        <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-2xl shadow-slate-400/20 border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-900">¿Listo para empezar?</h4>
            <p className="text-sm text-gray-600 hidden sm:block">Lleva tu negocio al siguiente nivel hoy mismo.</p>
          </div>
          <Button
            onClick={() => router.push('/auth/business/register')}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group whitespace-nowrap"
          >
            Empieza Gratis
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  )
}
