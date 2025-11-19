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
    <section className="relative bg-white dark:bg-gray-950 pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Mobile Background Pattern */}
      <div className="absolute inset-0 lg:hidden bg-white dark:bg-gray-950 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Text Content */}
            <div className="text-center lg:text-left">
              <h1
                className={`text-4xl md:text-5xl lg:text-6xl font-bold text-balance leading-tight mb-6 text-gray-900 dark:text-gray-100 transition-all duration-700 ease-out delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                Más citas, menos caos. Tu negocio,{' '}
                <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
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
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-7 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
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
            <div className="hidden lg:block">
              <div
                className={`relative [perspective:800px] transition-all duration-1000 ease-out delay-200 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div
                  className={`bg-white dark:bg-gray-900 rounded-xl shadow-2xl shadow-slate-300/60 dark:shadow-slate-900/60 border border-slate-200 dark:border-slate-800 transform transition-transform duration-1000 ease-out ${isMounted ? '[transform:rotateY(-15deg)]' : '[transform:rotateY(-5deg)]'} hover:[transform:rotateY(0deg)]`}>
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                    </div>
                  </div>
                  <div className="p-1 bg-slate-100 dark:bg-slate-900">
                    <Image
                      src="/heroimagen.png"
                      alt="Dashboard de TuTurno"
                      width={1200}
                      height={800}
                      quality={100}
                      unoptimized={true}
                      className="rounded-b-lg object-cover"
                    />
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