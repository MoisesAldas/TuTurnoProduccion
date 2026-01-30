'use client'

import { motion } from 'framer-motion'
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ 
          duration: 1.2,
          delay: 3.5,
          ease: "easeIn"
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
    </>
  )
}