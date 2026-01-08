'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/sections/Header'
import HeroSection from '@/components/sections/HeroSection'
import BusinessShowcase from '@/components/sections/BusinessShowcase'
import AboutSection from '@/components/sections/AboutSection'
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 dark:from-gray-900 dark:via-slate-900 dark:to-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-800 dark:border-t-indigo-400 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main>
        <HeroSection />
        <BusinessShowcase />
        <FeaturesSection />
        <AboutSection />
        <BusinessTypes />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}