'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowRight, PlayCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function HeroSection() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="relative mt-4 bg-white dark:bg-gray-950 pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Mobile Background Pattern */}
      <div className="absolute inset-0 lg:hidden bg-white dark:bg-gray-950 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[45%_55%] gap-12 items-center">
            {/* Left Column: Text Content */}
            <div className="text-center lg:text-left">
              <h1
                className={`text-4xl md:text-5xl lg:text-6xl font-bold text-balance leading-tight mb-6 text-gray-900 dark:text-gray-100 transition-all duration-700 ease-out delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                Más citas, menos caos. Tu negocio,{' '}
                <span className=" bg-orange-600 hover:bg-orange-700 bg-clip-text text-transparent">
                  simplificado.
                </span>
              </h1>

              <p
                className={`text-lg md:text-xl text-gray-600 dark:text-gray-400 text-balance mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 transition-all duration-700 ease-out delay-200 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                La plataforma todo-en-uno que automatiza tus citas, gestiona tus clientes y optimiza tus ingresos. Dedica más tiempo a lo que amas.
              </p>

              <div
                className={`flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10 transition-all duration-700 ease-out delay-300 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <Button
                  size="lg"
                  onClick={() => router.push('/auth/business/register')}
                  className=" bg-orange-600 hover:bg-orange-700 text-white px-8 py-7 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
                >
                  Empieza Gratis
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => { /* TODO: Add video modal */ }}
                  className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 px-8 py-7 text-base font-semibold group transition-all"
                >
                  <PlayCircle className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                  Ver Demo
                </Button>
              </div>

              <div
                className={`flex justify-center lg:justify-start items-center gap-4 text-sm text-gray-500 dark:text-gray-400 transition-all duration-700 ease-out delay-400 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="flex -space-x-2 overflow-hidden">
                  <Image className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800" src="/placeholder-user.jpg" alt="User 1" width={32} height={32} />
                  <Image className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800" src="/professional-woman-spa-owner-smiling.jpg" alt="User 2" width={32} height={32} />
                  <Image className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800" src="/mechanic-man-in-work-uniform-professional-smiling.jpg" alt="User 3" width={32} height={32} />
                </div>
                <p>+500 negocios ya confían en TuTurno.</p>
              </div>
            </div>

            {/* Right Column: Mockup */}
            <div className="hidden lg:block relative overflow-visible">
              <div
                className={`relative [perspective:2000px] transition-all duration-1000 ease-out delay-200 overflow-visible group ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                {/* Desktop Mockup */}
                <div
                  className={`relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 rounded-[1.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] border border-slate-200/60 dark:border-slate-700/60 transform transition-all duration-700 ease-out overflow-hidden ${isMounted ? '[transform:rotateY(-15deg)_rotateX(5deg)]' : '[transform:rotateY(-2deg)]'} group-hover:[transform:rotateY(0deg)_rotateX(0deg)_scale(1.02)]`}>

                  {/* Inner Glow Border */}
                  <div className="absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-white/20 dark:ring-white/10 pointer-events-none"></div>

                  {/* Browser Chrome - Premium Style */}
                  <div className="relative px-4 py-3 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3 bg-gradient-to-b from-white/80 to-slate-50/60 dark:from-slate-800/90 dark:to-slate-850/70 backdrop-blur-xl">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-md shadow-red-500/30 ring-1 ring-red-400/50"></div>
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-md shadow-yellow-500/30 ring-1 ring-yellow-400/50"></div>
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-md shadow-green-500/30 ring-1 ring-green-400/50"></div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="px-4 py-1.5 bg-white/70 dark:bg-slate-900/70 rounded-lg shadow-sm text-[11px] text-slate-600 dark:text-slate-400 font-medium max-w-[220px] truncate border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
                        <span className="text-emerald-600 dark:text-emerald-500 mr-1">🔒</span>
                        tuturno.app/dashboard
                      </div>
                    </div>
                  </div>

                  {/* Image Container with Subtle Shadow */}
                  <div className="relative bg-slate-50 dark:bg-slate-950 p-2 overflow-hidden">
                    {/* Subtle Vignette Effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/5 via-transparent to-transparent pointer-events-none"></div>

                    <div className="relative rounded-lg overflow-hidden shadow-inner ring-1 ring-slate-900/5 dark:ring-white/5">
                      <Image
                        src="/calendario.png"
                        alt="Dashboard de TuTurno - Gestión de Citas Profesional"
                        width={2000}
                        height={1250}
                        quality={100}
                        priority
                        className="w-full h-auto transform transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  </div>
                </div>

                {/* Mobile Mockup - Refined 3D iPhone Style */}
                <div
                  className={`absolute -right-6 top-4 w-[160px] transition-all duration-1000 ease-out delay-500 ${isMounted ? 'opacity-100 translate-x-0 translate-y-0 [transform:rotateY(-25deg)] animate-float' : 'opacity-0 translate-x-12 translate-y-6 rotate-6'} group-hover:[transform:rotateY(0deg)_translateY(-12px)_scale(1.08)] group-hover:pause`}>

                  {/* iPhone Frame with 3D Effect */}
                  <div className="relative [transform-style:preserve-3d]">
                    {/* Subtle Shadow */}
                    <div className="absolute inset-0 bg-slate-900/15 rounded-[2.5rem] blur-xl translate-y-3 translate-x-1"></div>

                    {/* Phone Body - Thin Border Style with Padding */}
                    <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 rounded-[2.5rem] shadow-[0_15px_35px_-10px_rgba(0,0,0,0.3)] border border-slate-200/60 dark:border-slate-700/60 p-2 overflow-hidden">
                      {/* Inner Glow Border */}
                      <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/20 dark:ring-white/10 pointer-events-none"></div>

                      {/* Notch - Smaller and More Refined */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[25%] h-[18px] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 rounded-b-[0.8rem] z-20 shadow-md"></div>

                      {/* Screen Content */}
                      <div className="relative rounded-[1.8rem] overflow-hidden bg-white shadow-inner ring-1 ring-slate-900/5">
                        <Image
                          src="/mobile4.png"
                          alt="TuTurno Mobile App"
                          width={360}
                          height={780}
                          quality={100}
                          priority
                          className="w-full h-auto"
                        />

                        {/* Screen Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-60 pointer-events-none"></div>
                      </div>

                      {/* Side Buttons - Thinner */}
                      <div className="absolute left-0 top-[75px] w-[1.5px] h-[28px] bg-slate-700/80 rounded-r-sm -translate-x-[1.5px]"></div>
                      <div className="absolute left-0 top-[115px] w-[1.5px] h-[45px] bg-slate-700/80 rounded-r-sm -translate-x-[1.5px]"></div>
                      <div className="absolute right-0 top-[95px] w-[1.5px] h-[60px] bg-slate-700/80 rounded-l-sm translate-x-[1.5px]"></div>
                    </div>

                    {/* Pulsing Glow - Constant Animation */}
                    <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-orange-500/20 via-orange-400/10 to-amber-500/20 blur-2xl animate-pulse-glow pointer-events-none"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}