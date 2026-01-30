'use client'

import SplashScreen from '@/components/SplashScreen'
import Header from '@/components/sections/Header'
import HeroSection from '@/components/sections/HeroSection'
import BusinessShowcase from '@/components/sections/BusinessShowcase'
import AboutSection from '@/components/sections/AboutSection'
import FeaturesSection from '@/components/sections/FeaturesSection'
import BusinessTypes from '@/components/sections/BusinessTypes'
import CTASection from '@/components/sections/CTASection'
import Footer from '@/components/sections/Footer'

export default function HomePage() {
  return (
    <>
      <SplashScreen />
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
    </>
  )
}