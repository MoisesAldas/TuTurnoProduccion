'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowRight, PlayCircle, Sparkles, Shield, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { BadgeDollarSign } from "lucide-react"

export default function HeroSection() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="relative bg-[#f2f2f5] dark:bg-[#0d0d0f] pt-28 pb-20 md:pt-24 md:pb-28 overflow-hidden">

      {/* ─── Background Texture ─── */}
    

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[48%_52%] gap-16 items-center">

            {/* ─────────────────────────────────────────
                LEFT COLUMN — Copy & CTAs
            ───────────────────────────────────────── */}
            <div className="text-center lg:text-left">

              {/* Badge pill */}
           

              {/* Headline */}
              <h1 className={`text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold leading-[1.08] tracking-tight text-gray-900 dark:text-white mb-6 text-balance transition-all duration-700 ease-out delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                Más citas,{' '}
                <br className="hidden sm:block" />
                menos caos.{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-orange-600">Tu negocio</span>
                  {/* Underline accent */}
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 10" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 8 Q50 2 100 6 Q150 10 200 4" stroke="#f97316" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </span>
                {' '}
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  simplificado.
                </span>
              </h1>

              {/* Subheadline */}
              <p className={`text-lg md:text-xl text-gray-500 dark:text-gray-400 text-balance mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0 transition-all duration-700 ease-out delay-200 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                Automatiza tus citas, gestiona clientes y optimiza ingresos — todo desde un solo lugar. Sin comisiones. Sin complicaciones.
              </p>

              {/* CTAs */}
              <div className={`flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-12 transition-all duration-700 ease-out delay-300 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <Button
                  size="lg"
                  onClick={() => router.push('/auth/business/register')}
                  className="group relative bg-orange-600 hover:bg-orange-700 text-white px-8 py-7 text-base font-bold rounded-2xl shadow-[0_8px_30px_rgba(234,88,12,0.4)] hover:shadow-[0_12px_40px_rgba(234,88,12,0.5)] transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
                >
                  {/* Shine sweep */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                  <span className="relative flex items-center">
                    Empieza Gratis
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {}}
                  className="group border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 px-8 py-7 text-base font-semibold rounded-2xl transition-all duration-300"
                >
                  <PlayCircle className="mr-2 w-5 h-5 group-hover:scale-110 group-hover:text-orange-500 transition-all" />
                  Ver Demo
                </Button>
              </div>

              {/* Social proof */}
              <div className={`flex flex-col sm:flex-row items-center lg:items-start gap-5 transition-all duration-700 ease-out delay-400 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {/* Avatars */}
                <div className="flex -space-x-2.5">
                  {[
                    '/placeholder-user.jpg',
                    '/professional-woman-spa-owner-smiling.jpg',
                    '/mechanic-man-in-work-uniform-professional-smiling.jpg',
                  ].map((src, i) => (
                    <div key={i} className="w-10 h-10 rounded-full ring-2 ring-[#f8f7f4] dark:ring-gray-900 overflow-hidden shadow-sm">
                      <Image src={src} alt={`User ${i + 1}`} width={40} height={40} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {/* +N bubble */}
                  <div className="w-10 h-10 rounded-full ring-2 ring-[#f8f7f4] dark:ring-gray-900 bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">+99</span>
                  </div>
                </div>

                <div className="text-center lg:text-left">
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 justify-center lg:justify-start mb-0.5">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-amber-400 text-base">★</span>
                    ))}
                    <span className="ml-1.5 text-sm font-bold text-gray-800 dark:text-gray-200">5.0</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    +100 negocios confían en TuTurno
                  </p>
                </div>
              </div>

              {/* Trust chips */}
              <div className={`hidden lg:flex items-center gap-3 mt-8 transition-all duration-700 ease-out delay-500 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {[
                  { icon: <Shield className="w-3.5 h-3.5" />, label: 'Datos seguros' },
                  { icon: <Zap className="w-3.5 h-3.5" />, label: 'Configuración en 5 min' },
                  { icon: <BadgeDollarSign className="w-3.5 h-3.5" />, label: 'Sin comisiones' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
                    <span className="text-orange-500">{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* ─────────────────────────────────────────
                RIGHT COLUMN — Mockup Stack
            ───────────────────────────────────────── */}
            <div className="hidden lg:block relative" style={{ perspective: '1800px' }}>

              {/* ── Ambient glow behind everything ── */}
              <div className="absolute inset-0 -z-10">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-gradient-to-tr from-orange-500/25 via-amber-400/15 to-indigo-500/20 blur-[80px] transition-opacity duration-1000 ${isMounted ? 'opacity-100' : 'opacity-0'}`} />
              </div>

              {/* ── DESKTOP MOCKUP ── */}
              <div className={`relative transition-all duration-1000 ease-out delay-200 group ${isMounted ? 'opacity-100' : 'opacity-0'}`}
                style={{ transform: isMounted ? 'rotateY(-8deg) rotateX(4deg) rotateZ(-1.5deg)' : 'rotateY(-3deg)', transition: 'transform 1s ease-out, opacity 0.8s ease-out' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'rotateY(0deg) rotateX(0deg) rotateZ(0deg) scale(1.02)'; (e.currentTarget as HTMLDivElement).style.transition = 'transform 0.5s ease-out' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'rotateY(-8deg) rotateX(4deg) rotateZ(-1.5deg)'; (e.currentTarget as HTMLDivElement).style.transition = 'transform 0.7s ease-out' }}
              >
                {/* Card shadow */}
                <div className="absolute -bottom-6 left-4 right-4 h-20 bg-black/20 dark:bg-black/40 blur-2xl rounded-full -z-10" />

                {/* Browser window */}
                <div className="rounded-[24px] overflow-hidden bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-slate-700/60 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_32px_80px_-12px_rgba(0,0,0,0.6)]">
                  
                  {/* Chrome bar */}
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-[#1e1e22] dark:to-[#1a1a1e] border-b border-slate-200/70 dark:border-slate-700/50">
                    {/* Traffic lights */}
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.5)]" />
                      <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.5)]" />
                      <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.5)]" />
                    </div>

                    {/* URL bar */}
                    <div className="flex-1 flex justify-center">
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-[#0d0d0f] rounded-lg border border-slate-200/60 dark:border-slate-700/40 max-w-[240px] w-full shadow-inner">
                        <span className="text-emerald-500 text-[11px]">🔒</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">tuturno.app/dashboard</span>
                      </div>
                    </div>

                    {/* Tab-bar dots */}
                    <div className="flex gap-1.5">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      ))}
                    </div>
                  </div>

                  {/* Screenshot */}
                  <div className="relative bg-slate-50 dark:bg-slate-950">
                    <Image
                      src="/calendario.png"
                      alt="Dashboard de TuTurno"
                      width={2000}
                      height={1250}
                      quality={100}
                      priority
                      className="w-full h-auto block"
                    />
                    {/* Bottom fade */}
                    <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white/40 dark:from-black/30 to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* ── MOBILE MOCKUP ── */}
              <div
                className={`absolute -right-4 top-8 w-[145px] transition-all duration-1000 ease-out delay-600 ${isMounted ? 'opacity-100' : 'opacity-0 translate-x-8 translate-y-6'}`}
                style={{ transform: isMounted ? 'rotateY(-18deg) rotateZ(3deg) translateY(0px)' : undefined, animation: isMounted ? 'floatPhone 4s ease-in-out infinite' : undefined }}
              >
                {/* Drop shadow */}
                <div className="absolute -bottom-4 left-3 right-3 h-12 bg-black/30 blur-xl rounded-full -z-10" />

                {/* Outer glow ring */}
                <div className="absolute -inset-2 rounded-[36px] bg-gradient-to-br from-orange-400/30 to-indigo-500/20 blur-xl -z-10 animate-pulse" />

                {/* Phone frame */}
                <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-b from-[#1c1c1e] to-[#131315] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)]">
                  {/* Dynamic island */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[40%] h-[14px] bg-black rounded-full z-20 shadow-lg" />

                  {/* Padding frame */}
                  <div className="p-1.5 pt-1.5">
                    {/* Screen */}
                    <div className="rounded-[24px] overflow-hidden bg-white shadow-inner">
                      <Image
                        src="/mobile4.png"
                        alt="TuTurno Mobile App"
                        width={360}
                        height={780}
                        quality={100}
                        priority
                        className="w-full h-auto block"
                      />
                      {/* Screen shine */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none rounded-[24px]" />
                    </div>
                  </div>

                  {/* Side buttons */}
                  <div className="absolute left-[-2px] top-[60px] w-[3px] h-[24px] bg-[#2c2c2e] rounded-l-sm" />
                  <div className="absolute left-[-2px] top-[94px] w-[3px] h-[40px] bg-[#2c2c2e] rounded-l-sm" />
                  <div className="absolute right-[-2px] top-[76px] w-[3px] h-[52px] bg-[#2c2c2e] rounded-r-sm" />
                </div>
              </div>

              {/* ── FLOATING CARDS ── */}

              {/* Card: En Línea */}
              <div className={`absolute -top-5 -left-10 z-20 transition-all duration-1000 delay-500 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ animation: isMounted ? 'float 3.5s ease-in-out infinite' : undefined }}>
                <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-slate-700/60 rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-75" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">En Línea Ahora</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">+Negocios activos</p>
                  </div>
                </div>
              </div>

              {/* Card: Sin Comisiones */}
              <div className={`absolute -top-3 right-2 z-20 transition-all duration-1000 delay-700 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ animation: isMounted ? 'float 4.2s ease-in-out 0.5s infinite' : undefined }}>
                <div className="flex items-center gap-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-3 rounded-2xl shadow-[0_8px_24px_rgba(16,185,129,0.35)]">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <BadgeDollarSign className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-100">Política de precios</p>
                    <p className="text-sm font-bold text-white">Sin Comisiones</p>
                  </div>
                </div>
              </div>

              {/* Card: Soporte 24/7 */}
              <div className={`absolute bottom-14 -left-8 z-20 transition-all duration-1000 delay-900 ${isMounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
                style={{ animation: isMounted ? 'float 3.8s ease-in-out 1s infinite' : undefined }}>
                <div className="flex items-center gap-3 bg-slate-900 dark:bg-white rounded-2xl px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <span className="text-white text-[10px] font-black tracking-wide">24/7</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Soporte</p>
                    <p className="text-sm font-bold text-white dark:text-slate-900">Siempre disponible</p>
                  </div>
                </div>
              </div>

              {/* Card: Rating */}
              <div className={`absolute bottom-6 right-1 z-20 transition-all duration-1000 delay-1000 ${isMounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`}
                style={{ animation: isMounted ? 'float 4.5s ease-in-out 1.5s infinite' : undefined }}>
                <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-slate-700/60 rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                  <div className="flex items-center gap-1.5 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-amber-400 text-base">★</span>
                    ))}
                    <span className="ml-1 text-sm font-extrabold text-slate-900 dark:text-white">5.0</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Basado en 100+ reseñas</p>
                </div>
              </div>

              {/* Card: Notificación nueva cita */}
              <div className={`absolute top-[38%] -right-12 z-20 transition-all duration-1000 delay-[1100ms] ${isMounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`}
                style={{ animation: isMounted ? 'float 3.6s ease-in-out 0.8s infinite' : undefined }}>
                <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-slate-700/60 rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] max-w-[200px]">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📅</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium">Nueva cita confirmada</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">María · Hoy 3:00 PM</p>
                  </div>
                </div>
              </div>

            </div>
            {/* END RIGHT COLUMN */}

          </div>
        </div>
      </div>

      {/* ─── Keyframe styles injected as style tag ─── */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatPhone {
          0%, 100% { transform: rotateY(-18deg) rotateZ(3deg) translateY(0px); }
          50%       { transform: rotateY(-18deg) rotateZ(3deg) translateY(-10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>
    </section>
  )
}