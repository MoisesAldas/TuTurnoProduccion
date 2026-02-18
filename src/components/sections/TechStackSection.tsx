'use client'

import { useScrollReveal } from '@/hooks/useScrollReveal'

const technologies = [
  { name: 'Next.js', icon: '⚡', color: 'text-black dark:text-white' },
  { name: 'React', icon: '⚛️', color: 'text-blue-500' },
  { name: 'TypeScript', icon: 'TS', color: 'text-blue-600' },
  { name: 'Supabase', icon: '🗄️', color: 'text-green-500' },
  { name: 'Tailwind CSS', icon: '🎨', color: 'text-cyan-500' },
  { name: 'PostgreSQL', icon: '🐘', color: 'text-blue-700' },
  { name: 'Vercel', icon: '▲', color: 'text-black dark:text-white' },
  { name: 'Resend', icon: '✉️', color: 'text-purple-500' },
]

export default function TechStackSection() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 })

  return (
    <section ref={ref} className="py-12 lg:py-16 bg-slate-50 dark:bg-gray-900/50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className={`text-center mb-8 scroll-reveal ${isVisible ? 'revealed' : ''}`}>
          <p className="text-sm font-semibold text-orange-600 dark:text-orange-500 uppercase tracking-wider mb-2">
            Powered By
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Tecnologías Modernas
          </h2>
        </div>

        {/* Infinite Scrolling Tech Logos */}
        <div className="relative">
          {/* Gradient Overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 dark:from-gray-900/50 to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50 dark:from-gray-900/50 to-transparent z-10"></div>

          {/* Scrolling Container */}
          <div className="tech-scroll-container">
            <div className="tech-scroll-content">
              {/* First set */}
              {technologies.map((tech, idx) => (
                <div
                  key={`tech-1-${idx}`}
                  className="tech-card group"
                >
                  <span className={`text-3xl ${tech.color} transition-transform duration-300 group-hover:scale-110`}>
                    {tech.icon}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
                    {tech.name}
                  </span>
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {technologies.map((tech, idx) => (
                <div
                  key={`tech-2-${idx}`}
                  className="tech-card group"
                >
                  <span className={`text-3xl ${tech.color} transition-transform duration-300 group-hover:scale-110`}>
                    {tech.icon}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
                    {tech.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
