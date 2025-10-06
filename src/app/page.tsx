'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/sections/Header'
import HeroSection from '@/components/sections/HeroSection'
import BusinessShowcase from '@/components/sections/BusinessShowcase'
import TestimonialsSection from '@/components/sections/TestimonialsSection'
import FeaturesSection from '@/components/sections/FeaturesSection'
import BusinessTypes from '@/components/sections/BusinessTypes'
import CTASection from '@/components/sections/CTASection'
import Footer from '@/components/sections/Footer'

export default function HomePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <BusinessShowcase />
        <FeaturesSection />
        <TestimonialsSection />
        <BusinessTypes />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}