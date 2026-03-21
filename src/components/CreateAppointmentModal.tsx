'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X,
  Plus
} from 'lucide-react'
import { useCreateAppointment } from '@/hooks/useCreateAppointment'
import { ClientStep } from './create-appointment/ClientStep'
import { ServiceStep } from './create-appointment/ServiceStep'
import { DateTimeStep } from './create-appointment/DateTimeStep'
import { ConfirmationStep } from './create-appointment/ConfirmationStep'
import type { Appointment } from '@/types/database'

interface CreateAppointmentModalProps {
  businessId: string
  selectedDate: Date
  selectedTime?: string
  selectedEmployeeId?: string
  appointment?: Appointment
  onClose: () => void
  onSuccess: () => void
}

export default function CreateAppointmentModal({
  businessId,
  selectedDate,
  selectedTime,
  selectedEmployeeId,
  appointment,
  onClose,
  onSuccess
}: CreateAppointmentModalProps) {
  const { state, actions } = useCreateAppointment({
    businessId,
    selectedDate,
    selectedTime,
    selectedEmployeeId,
    appointment,
    onClose,
    onSuccess
  })

  const {
    loading, submitting, currentStep, totalSteps,
    employees, services, clients, businessClients,
    clientType, selectedClientId, selectedBusinessClientId, walkInName, walkInPhone,
    appointmentDate, startTime, selectedServiceIds, notes, clientNotes,
    filteredClients, totalPrice, totalDuration, endTime,
    searchTerm, showRegisteredDropdown, showBusinessClientDropdown, serviceAssignments
  } = state

  const {
    setCurrentStep, setClientType, setSelectedClientId, setSelectedBusinessClientId,
    setWalkInName, setWalkInPhone, setAppointmentDate, setStartTime, setNotes, setClientNotes,
    setSearchTerm, setShowRegisteredDropdown, setShowBusinessClientDropdown,
    toggleService, assignEmployeeToService, handleSubmit, handleNext, handlePrevious,
    debouncedSearch
  } = actions

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Información del Cliente'
      case 2: return 'Servicios y Profesionales'
      case 3: return 'Fecha y Horario'
      case 4: return 'Confirmar Reserva'
      default: return 'Nueva Cita'
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className="w-[calc(100%-1rem)] sm:w-full max-w-[550px] p-0 overflow-hidden rounded-[24px] sm:rounded-[32px] border-none shadow-2xl bg-white dark:bg-gray-900 animate-in zoom-in-95 duration-300"
      >
        
        {/* Header Premium */}
        <DialogHeader className="p-4 sm:p-6 pb-0 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/30 rounded-full border border-orange-100 dark:border-orange-900/50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Paso {currentStep} de {totalSteps}</span>
                </div>
                {appointment && (
                  <div className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 rounded-full border border-blue-100 dark:border-blue-900/50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Editando Cita</span>
                  </div>
                )}
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none italic">
                {getStepTitle(currentStep)}
              </DialogTitle>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 sm:p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl sm:rounded-2xl transition-all duration-300 group shadow-sm active:scale-95"
            >
              <X className="w-4 h-4 sm:w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white group-hover:rotate-90 transition-all duration-500" />
            </button>
          </div>
          
          {/* Progress Bar Elegante */}
          <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden flex gap-1 p-0.5">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s}
                className={`flex-1 rounded-full transition-all duration-700 ${
                  currentStep >= s ? 'bg-primary' : 'bg-gray-200/50 dark:bg-gray-700/50'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="px-5 sm:px-8 py-0 max-h-[50vh] overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-100 dark:border-gray-800 border-t-primary rounded-full animate-spin shadow-sm" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                </div>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 animate-pulse">Cargando...</p>
            </div>
          ) : (
            <>
              {currentStep === 1 && (
                <ClientStep
                  clientType={clientType}
                  setClientType={setClientType}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  selectedClientId={selectedClientId}
                  setSelectedClientId={setSelectedClientId}
                  selectedBusinessClientId={selectedBusinessClientId}
                  setSelectedBusinessClientId={setSelectedBusinessClientId}
                  walkInName={walkInName}
                  setWalkInName={setWalkInName}
                  walkInPhone={walkInPhone}
                  setWalkInPhone={setWalkInPhone}
                  clients={clients}
                  businessClients={businessClients}
                  filteredClients={filteredClients}
                  showRegisteredDropdown={showRegisteredDropdown}
                  setShowRegisteredDropdown={setShowRegisteredDropdown}
                  showBusinessClientDropdown={showBusinessClientDropdown}
                  setShowBusinessClientDropdown={setShowBusinessClientDropdown}
                  debouncedSearch={debouncedSearch}
                />
              )}

              {currentStep === 2 && (
                <ServiceStep
                  services={services}
                  employees={employees}
                  selectedServiceIds={selectedServiceIds}
                  toggleService={toggleService}
                  serviceAssignments={serviceAssignments}
                  assignEmployeeToService={assignEmployeeToService}
                />
              )}

              {currentStep === 3 && (
                <DateTimeStep
                  appointmentDate={appointmentDate}
                  setAppointmentDate={setAppointmentDate}
                  startTime={startTime}
                  setStartTime={setStartTime}
                  endTime={endTime}
                  duration={totalDuration}
                />
              )}

              {currentStep === 4 && (
                <ConfirmationStep
                  clientType={clientType}
                  selectedClientId={selectedClientId}
                  selectedBusinessClientId={selectedBusinessClientId}
                  walkInName={walkInName}
                  walkInPhone={walkInPhone}
                  clients={clients}
                  businessClients={businessClients}
                  selectedServiceIds={selectedServiceIds}
                  services={services}
                  employees={employees}
                  serviceAssignments={serviceAssignments}
                  appointmentDate={appointmentDate}
                  startTime={startTime}
                  totalPrice={totalPrice}
                  totalDuration={totalDuration}
                  clientNotes={clientNotes}
                  setClientNotes={setClientNotes}
                  notes={notes}
                  setNotes={setNotes}
                  appointment={appointment}
                />
              )}
            </>
          )}
        </div>

        {/* Footer de Navegación Premium */}
        <div className="p-4 sm:p-6 pt-0 bg-white dark:bg-gray-900 flex items-center justify-between gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3px]" />
            Reserva Segura
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-1 sm:flex-none justify-end">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-center bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 active:scale-90 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}

            <div className="flex-1 sm:w-64">
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="w-full h-10 sm:h-12 rounded-2xl bg-gray-900 dark:bg-black hover:bg-black dark:hover:bg-gray-950 text-white font-black text-xs sm:text-sm uppercase tracking-widest shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group active:scale-95"
                >
                  {currentStep === 1 && "Ver Servicios"}
                  {currentStep === 2 && "Elegir Horario"}
                  {currentStep === 3 && "Revisar Cita"}
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full h-10 sm:h-12 rounded-2xl bg-primary hover:bg-orange-600 text-white font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_8px_30px_rgb(234,88,12,0.3)] transition-all duration-300 flex items-center justify-center gap-3 active:scale-95"
                >
                  {submitting ? (
                    <div className="w-4 h-4 sm:w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 sm:w-5 h-5 stroke-[4px]" />
                      Finalizar Reserva
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
