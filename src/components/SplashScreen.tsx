'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from './logo'

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 3500)

    return () => clearTimeout(timer)
  }, [])

  // Track mouse position and create trail
  useEffect(() => {
    let particleId = 0
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
      
      // Create multiple particles for better trail effect
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const newParticle = {
            id: particleId++,
            x: e.clientX + (Math.random() - 0.5) * 10,
            y: e.clientY + (Math.random() - 0.5) * 10
          }
          
          setParticles(prev => [...prev.slice(-30), newParticle]) // Keep last 30 particles
          
          // Remove particle after animation
          setTimeout(() => {
            setParticles(prev => prev.filter(p => p.id !== newParticle.id))
          }, 800)
        }, i * 20)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden"
      >
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" 
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'grid-move 20s linear infinite'
            }}
          />
        </div>

        <style jsx>{`
          @keyframes grid-move {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
          }
        `}</style>

        {/* Mouse follower particles with trail */}
        {particles.map((particle, index) => {
          const size = 2 + Math.random() * 2 // Random size between 2-4px
          const delay = index * 0.01
          
          return (
            <motion.div
              key={particle.id}
              initial={{ opacity: 0.9, scale: 1 }}
              animate={{ 
                opacity: 0, 
                scale: 0,
                y: -20 // Slight upward drift
              }}
              transition={{ 
                duration: 0.8,
                delay: delay,
                ease: "easeOut" 
              }}
              className="absolute bg-black rounded-full pointer-events-none"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: particle.x,
                top: particle.y,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 8px rgba(0, 0, 0, 0.3)'
              }}
            />
          )
        })}

        {/* Floating geometric shapes */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`shape-${i}`}
            initial={{ 
              opacity: 0,
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              rotate: Math.random() * 360
            }}
            animate={{
              opacity: [0, 0.2, 0],
              y: [
                Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000) - 200
              ],
              rotate: [Math.random() * 360, Math.random() * 360 + 360],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute"
            style={{
              width: 20 + Math.random() * 40,
              height: 20 + Math.random() * 40,
              border: '2px solid rgba(0, 0, 0, 0.15)',
              borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '0%' : '10%',
            }}
          />
        ))}

        {/* Main Logo Container */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ 
            scale: [0, 1.2, 1],
            rotate: [-180, 10, 0]
          }}
          transition={{
            duration: 1.5,
            times: [0, 0.7, 1],
            ease: [0.34, 1.56, 0.64, 1]
          }}
          className="relative flex items-center justify-center z-10"
        >
          {/* Particle burst effect */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={`burst-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 0.6, 0],
                x: Math.cos((i * 30) * Math.PI / 180) * 150,
                y: Math.sin((i * 30) * Math.PI / 180) * 150,
              }}
              transition={{
                duration: 2,
                delay: 0.5 + (i * 0.05),
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="absolute w-2 h-2 bg-black rounded-full"
              style={{
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.4)'
              }}
            />
          ))}

          {/* Main Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 1,
              delay: 0.5,
              ease: "easeInOut"
            }}
            className="relative z-10"
          >
            <motion.div
              initial={{ rotateZ: 0 }}
              animate={{ rotateZ: 360 }}
              transition={{
                duration: 1.5,
                delay: 0.8,
                ease: "easeInOut"
              }}
            >
              <motion.div
                animate={{
                  textShadow: [
                    '0 0 20px rgba(0, 0, 0, 0.1)',
                    '0 0 40px rgba(0, 0, 0, 0.2)',
                    '0 0 20px rgba(0, 0, 0, 0.1)'
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Logo color="black" size="lg" className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black" />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Animated progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="absolute bottom-20 sm:bottom-28 md:bottom-32 w-48 sm:w-56 md:w-64"
        >
          <div className="h-1 bg-black/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 3, ease: "easeInOut" }}
              className="h-full bg-black rounded-full"
              style={{
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)'
              }}
            />
          </div>
        </motion.div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.5 }}
          className="absolute bottom-12 sm:bottom-16 md:bottom-20 text-black/90 text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] font-medium px-4 text-center"
        >
          <motion.span
            animate={{
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            CARGANDO EXPERIENCIA
          </motion.span>
        </motion.div>

        {/* Percentage counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          className="absolute bottom-24 sm:bottom-32 md:bottom-40 text-black/70 text-xs font-mono"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1] }}
            transition={{ duration: 3 }}
          >
            {Array.from({ length: 101 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: i === 100 ? 1 : 0 }}
                transition={{ delay: (i / 100) * 3, duration: 0.1 }}
              >
                {i === 100 && `${i}%`}
              </motion.span>
            ))}
          </motion.span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
