import React from 'react'
import { Label } from '@/components/ui/label'
import { Briefcase, User as UserIcon, Check, Clock, DollarSign } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Employee, Service } from '@/types/database'

interface ServiceStepProps {
  services: Service[]
  employees: Employee[]
  selectedServiceIds: string[]
  toggleService: (serviceId: string) => void
  serviceAssignments: Record<string, string>
  assignEmployeeToService: (serviceId: string, employeeId: string) => void
}

export function ServiceStep({
  services, employees, selectedServiceIds, toggleService,
  serviceAssignments, assignEmployeeToService
}: ServiceStepProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-500">
          <Briefcase className="w-4 h-4 text-primary" />
          Servicios Disponibles
        </Label>

        <div className="grid grid-cols-1 gap-3 max-h-[450px] overflow-y-auto pr-2 scrollbar-hide">
          {services.map((service) => {
            const isSelected = selectedServiceIds.includes(service.id)
            
            return (
              <div 
                key={service.id}
                className={`flex flex-col rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className="w-full text-left p-4 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                      {isSelected ? <Check className="w-5 h-5 stroke-[3px]" /> : <Briefcase className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 tracking-tight">{service.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          <Clock className="w-3 h-3" /> {service.duration_minutes}m
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary">
                          <DollarSign className="w-3 h-3" /> {service.price}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary rotate-0 scale-110' : 'border-gray-200 rotate-90 scale-100'}`}>
                    <Check className={`w-3.5 h-3.5 text-white transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </button>

                {isSelected && (
                  <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 duration-300">
                    <div className="h-px bg-primary/10 mb-2" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2 rounded-xl border border-primary/10 shadow-sm">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Profesional Asignado</span>
                      </div>
                      <Select 
                        value={serviceAssignments[service.id] || ''} 
                        onValueChange={(val) => assignEmployeeToService(service.id, val)}
                      >
                        <SelectTrigger className="h-8 w-full sm:w-48 text-xs font-bold border-none bg-gray-50 focus:ring-1 focus:ring-primary/20 rounded-lg">
                          <SelectValue placeholder="Elegir profesional" />
                        </SelectTrigger>
                        <SelectContent className="z-[300] rounded-xl border-gray-100 shadow-xl font-bold">
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id} className="text-xs hover:bg-primary/5 focus:bg-primary/5 rounded-lg cursor-pointer">
                              {emp.first_name} {emp.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
