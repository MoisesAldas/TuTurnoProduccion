'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'

import Header from '@/components/sections/Header'
import HeroSection from '@/components/sections/HeroSection'
import BusinessShowcase from '@/components/sections/BusinessShowcase'
import TechStackSection from '@/components/sections/TechStackSection'
import AboutSection from '@/components/sections/AboutSection'
import FeaturesSection from '@/components/sections/FeaturesSection'
import BusinessTypes from '@/components/sections/BusinessTypes'
import CTASection from '@/components/sections/CTASection'
import Footer from '@/components/sections/Footer'
import { useLandingScroll } from '@/hooks/useScrollReveal'
import StickyCTA from '@/components/StickyCTA'

export default function HomePage() {
  // Force the viewport to be the scroll container (overrides body overflow-y-auto from layout.tsx)
  useLandingScroll()

  return (
    <>
     
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ 
          duration: 0.5,
          ease: "easeOut"
        }}
        className="min-h-screen bg-white dark:bg-gray-950"
      >

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
      </motion.div>
      <StickyCTA />
    </>
  )
}