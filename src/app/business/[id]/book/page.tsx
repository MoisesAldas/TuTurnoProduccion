'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

// New abstractions
import { useBookingFlow } from '@/hooks/useBookingFlow'
import { getAdaptiveFontSize } from '@/lib/booking/bookingUtils'

// Modular Components
import { BookingLayout } from '@/components/booking/BookingLayout'
import { ServiceStep } from '@/components/booking/steps/ServiceStep'
import { EmployeeStep } from '@/components/booking/steps/EmployeeStep'
import { DateTimeStep } from '@/components/booking/steps/DateTimeStep'
import { DetailsStep } from '@/components/booking/steps/DetailsStep'
import { SuccessStep } from '@/components/booking/steps/SuccessStep'
import { BookingSummary } from '@/components/booking/BookingSummary'

const stepTitles = {
  service: 'Selecciona un servicio',
  employee: 'Elige tu profesional',
  datetime: 'Fecha y hora',
  details: 'Detalles de la cita',
  confirmation: '¡Reserva confirmada!'
}

export default function BookingPage() {
  const {
    business, services, allEmployees, allEmployeeServices, loading, submitting, currentStep,
    selectedServices, serviceEmployeeAssignments, selectedDate, selectedTime,
    availableSlots, clientNotes, minDate, maxDate, specialHourForDate,
    bookingStatus, loadingEmployees,
    leadEmployee, totalDuration, totalPrice,
    setSelectedDate, setSelectedTime, setClientNotes,
    handleServiceSelect, handleContinueToEmployee, handleEmployeeSelectForService,
    handleEmployeeSelectionDone, handleDateTimeConfirm, handleBookingSubmit,
    goBackToService, goBackToEmployee, goBackToDateTime,
    businessId
  } = useBookingFlow()

  const stepTitleFontSize = getAdaptiveFontSize(stepTitles[currentStep] || '', 'title')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Cargando opciones de reserva</h3>
          <p className="text-sm text-slate-500">Preparando servicios y horarios...</p>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-950 mb-2 tracking-tight">Negocio no encontrado</h1>
          <p className="text-slate-500 mb-6">No se pudo cargar la información del negocio.</p>
          <Link href="/marketplace">
            <Button className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl px-8 h-12 font-bold transition-all">
              Volver al Marketplace
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const isConfirmation = currentStep === 'confirmation'

  return (
    <BookingLayout
      businessId={businessId}
      businessName={business?.name}
      businessPhone={business?.phone}
      currentStep={currentStep}
      stepTitle={stepTitles[currentStep]}
      stepTitleFontSize={stepTitleFontSize}
      bookingStatus={bookingStatus}
      user={useAuth().authState.user}
    >
        <div className={isConfirmation ? "w-full" : "grid grid-cols-1 lg:grid-cols-12 gap-8"}>
          <div className={isConfirmation ? "w-full" : "lg:col-span-8"}>
            {currentStep === 'service' && (
            <ServiceStep
              services={services}
              selectedServices={selectedServices}
              handleServiceSelect={handleServiceSelect}
              handleContinueToEmployee={handleContinueToEmployee}
              isBlocked={bookingStatus?.is_blocked}
            />
          )}

          {currentStep === 'employee' && (
            <EmployeeStep
              selectedServices={selectedServices}
              allEmployees={allEmployees}
              allEmployeeServices={allEmployeeServices}
              serviceEmployeeAssignments={serviceEmployeeAssignments}
              handleEmployeeSelectForService={handleEmployeeSelectForService}
              handleEmployeeSelectionDone={handleEmployeeSelectionDone}
              goBackToService={goBackToService}
              loadingEmployees={loadingEmployees}
            />
          )}

          {currentStep === 'datetime' && (
            <DateTimeStep
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              availableSlots={availableSlots}
              minDate={minDate}
              maxDate={maxDate}
              specialHourForDate={specialHourForDate}
              handleDateTimeConfirm={handleDateTimeConfirm}
              goBackToEmployee={goBackToEmployee}
            />
          )}

          {currentStep === 'details' && (
            <DetailsStep
              business={business}
              selectedServices={selectedServices}
              serviceEmployeeAssignments={serviceEmployeeAssignments}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              totalDuration={totalDuration}
              totalPrice={totalPrice}
              clientNotes={clientNotes}
              setClientNotes={setClientNotes}
              handleBookingSubmit={handleBookingSubmit}
              goBackToDateTime={goBackToDateTime}
              submitting={submitting}
              isBlocked={bookingStatus?.is_blocked}
            />
          )}

          {isConfirmation && (
            <SuccessStep
              selectedServices={selectedServices}
              leadEmployee={leadEmployee}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              totalPrice={totalPrice}
            />
          )}
        </div>

        {/* Desktop Sidebar Summary */}
        {!isConfirmation && (
          <div className="lg:col-span-4">
            <BookingSummary
              selectedServices={selectedServices}
              serviceEmployeeAssignments={serviceEmployeeAssignments}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              totalDuration={totalDuration}
              totalPrice={totalPrice}
              currentStep={currentStep}
              handleContinueToEmployee={handleContinueToEmployee}
              handleDateTimeConfirm={handleDateTimeConfirm}
              business={business}
            />
          </div>
        )}
      </div>
    </BookingLayout>
  )
}
