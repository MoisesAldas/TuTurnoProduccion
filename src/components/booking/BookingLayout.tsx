'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/logo'
import { BlockedBookingMessage } from '@/components/BlockedBookingMessage'

interface BookingLayoutProps {
  businessId: string
  businessName?: string
  businessPhone?: string
  currentStep: string
  stepTitle: string
  stepTitleFontSize: string
  bookingStatus?: any
  user?: any
  children: React.ReactNode
}

const steps = ['service', 'employee', 'datetime', 'details', 'confirmation']

export function BookingLayout({
  businessId,
  businessName,
  businessPhone,
  currentStep,
  stepTitle,
  stepTitleFontSize,
  bookingStatus,
  user,
  children
}: BookingLayoutProps) {
  const currentStepNumber = steps.indexOf(currentStep) + 1

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Glassmorphism Premium */}
      <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 lg:py-2.5">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href={`/business/${businessId}`}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 -ml-2 h-9 sm:h-10 px-2 sm:px-3 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Perfil del negocio</span>
                </Button>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-slate-200/60"></div>
              <Logo color="slate" size="sm" className="sm:hidden" />
              <Logo color="slate" size="md" className="hidden sm:block" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Title and Progress */}
        <div className="mb-10 lg:mb-7">
          <div className="flex flex-col gap-1.5 lg:pl-6 relative">
            <div className="hidden lg:block absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-slate-800 to-slate-950 rounded-full shadow-[0_0_12px_rgba(2,6,23,0.12)]" />
            
            <span className="text-[10px] items-center uppercase tracking-[0.3em] font-black text-slate-400">
              Paso {currentStepNumber} de 4
            </span>
            <h4 className={`${stepTitleFontSize} font-black mt-2 tracking-tighter text-slate-950 leading-[1.1] py-1 break-words`}>
              {stepTitle}
            </h4>
            {currentStep !== 'service' && currentStep !== 'confirmation' && (
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">
                Puedes volver atrás para cambiar tu selección
              </p>
            )}
          </div>
        </div>

        {/* Blocked Booking Message */}
        {bookingStatus?.is_blocked && user && (
          <div className="mb-6">
            <BlockedBookingMessage
              businessName={businessName || 'este negocio'}
              businessPhone={businessPhone}
              cancellationsThisMonth={bookingStatus.cancellations_this_month}
              maxAllowed={bookingStatus.max_allowed}
            />
          </div>
        )}

        {children}
      </div>
    </div>
  )
}
