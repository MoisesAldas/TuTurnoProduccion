'use client'

import React from 'react'
import { User, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Employee {
  id: string
  first_name: string
  last_name: string
  position?: string
  avatar_url?: string
}

interface Service {
  id: string
  name: string
}

interface EmployeeStepProps {
  selectedServices: Service[]
  allEmployees: Employee[]
  allEmployeeServices: any[]
  serviceEmployeeAssignments: Record<string, Employee | null>
  handleEmployeeSelectForService: (serviceId: string, employee: Employee) => void
  handleEmployeeSelectionDone: () => void
  goBackToService: () => void
  loadingEmployees?: boolean
}

export function EmployeeStep({
  selectedServices,
  allEmployees,
  allEmployeeServices,
  serviceEmployeeAssignments,
  handleEmployeeSelectForService,
  handleEmployeeSelectionDone,
  goBackToService,
  loadingEmployees
}: EmployeeStepProps) {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Back Button */}
      <div className="flex justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBackToService}
          className="gap-2 h-10 px-4 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Volver a Servicios</span>
        </Button>
      </div>

      {/* Per-Service Professional Selection */}
      {!loadingEmployees && selectedServices.length > 0 && (
        <div className="space-y-12">
          {selectedServices.map((service, index) => {
            const assignedEmployee = serviceEmployeeAssignments[service.id]
            // Filter employees who can do this specific service
            const capableEmployees = allEmployees.filter(emp => 
              allEmployeeServices.some(skill => skill.employee_id === emp.id && skill.service_id === service.id)
            )

            return (
              <div key={service.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-950 text-white rounded-full flex items-center justify-center font-black text-sm">
                    {index + 1}
                  </div>
                  <h3 className="font-black text-lg text-slate-950 tracking-tight">
                    ¿Quién realizará <span className="text-slate-400">{service.name}</span>?
                  </h3>
                </div>

                {capableEmployees.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                    <p className="text-sm font-bold text-amber-700">No hay profesionales disponibles para este servicio específicamente.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {capableEmployees.map((employee) => {
                      const isSelected = assignedEmployee?.id === employee.id
                      return (
                        <Card
                          key={`${service.id}-${employee.id}`}
                          className={`group cursor-pointer border-none transition-all duration-300 ${
                            isSelected 
                              ? 'ring-2 ring-slate-950 bg-white shadow-xl scale-[1.02]' 
                              : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg'
                          }`}
                          onClick={() => handleEmployeeSelectForService(service.id, employee)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="relative w-12 h-12 flex-shrink-0">
                                <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                  {employee.avatar_url ? (
                                    <img src={employee.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-6 h-6 text-slate-400" />
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="absolute -right-1 -bottom-1 w-5 h-5 bg-slate-950 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-sm text-slate-950 truncate leading-tight">
                                  {employee.first_name} {employee.last_name}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                                  {employee.position || 'Profesional'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Continue Button */}
          <div className="pt-8 flex justify-center">
            {/* Mobile Floating Button */}
            <div className="lg:hidden fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-10 pointer-events-none">
              <Button
                onClick={handleEmployeeSelectionDone}
                className="pointer-events-auto bg-slate-950 hover:bg-slate-900 text-white shadow-[0_15px_30px_rgba(2,6,23,0.35)] h-14 px-8 rounded-full font-black text-sm transition-all duration-300 active:scale-95 flex items-center gap-2"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={handleEmployeeSelectionDone}
              size="lg"
              className="w-full max-w-md h-16 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-black text-base shadow-xl transition-all active:scale-95 group hidden lg:inline-flex"
            >
              Continuar a Fecha y Hora
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
