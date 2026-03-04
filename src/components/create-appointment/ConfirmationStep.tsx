import React from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Check, User as UserIcon, Briefcase, Calendar, Clock, DollarSign, FileText, Smartphone } from 'lucide-react'
import type { Employee, Service, Appointment } from '@/types/database'
import type { Client, BusinessClient, ClientType } from '@/hooks/useCreateAppointment'

interface ConfirmationStepProps {
  clientType: ClientType
  selectedClientId: string
  selectedBusinessClientId: string
  walkInName: string
  walkInPhone: string
  clients: Client[]
  businessClients: BusinessClient[]
  selectedServiceIds: string[]
  services: Service[]
  employees: Employee[]
  serviceAssignments: Record<string, string>
  appointmentDate: string
  startTime: string
  totalPrice: number
  totalDuration: number
  clientNotes: string
  setClientNotes: (notes: string) => void
  notes: string
  setNotes: (notes: string) => void
  appointment?: Appointment
}

export function ConfirmationStep({
  clientType, selectedClientId, selectedBusinessClientId, walkInName, walkInPhone,
  clients, businessClients, selectedServiceIds, services, employees,
  serviceAssignments, appointmentDate, startTime, totalPrice, totalDuration,
  clientNotes, setClientNotes, notes, setNotes, appointment
}: ConfirmationStepProps) {
  
  const selectedClient = clientType === 'registered' 
    ? clients.find(c => c.id === selectedClientId)
    : clientType === 'business_client'
    ? businessClients.find(c => c.id === selectedBusinessClientId)
    : null

  const clientDisplayName = clientType === 'walk_in' 
    ? walkInName 
    : selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name || ''}` : 'No seleccionado'

  const clientPhone = clientType === 'walk_in' ? walkInPhone : selectedClient?.phone

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Resumen Card */}
      <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform group-hover:rotate-0 duration-700">
          <Check className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 block mb-0.5">Reserva para</span>
                <h3 className="text-xl font-black text-white tracking-tight leading-none">{clientDisplayName}</h3>
                {clientPhone && (
                  <div className="flex items-center gap-1.5 mt-1 text-white/60 font-bold text-[10px] uppercase tracking-wider">
                    <Smartphone className="w-3 h-3" /> {clientPhone}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block mb-0.5">Estado Inicial</span>
              <span className="text-xs font-black text-primary uppercase tracking-wider">Confirmada</span>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          {/* Granular Services */}
          <div className="space-y-4">
             <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 block">Plan de Servicios</span>
             <div className="grid grid-cols-1 gap-3">
               {selectedServiceIds.map((sid) => {
                 const srv = services.find(s => s.id === sid)
                 const empId = serviceAssignments[sid]
                 const emp = employees.find(e => e.id === empId)
                 
                 return srv ? (
                   <div key={sid} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-white/5 hover:bg-white/10 transition-colors group/item">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover/item:scale-110 transition-transform">
                         <Briefcase className="w-5 h-5" />
                       </div>
                       <div>
                         <p className="font-bold text-white text-sm">{srv.name}</p>
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-0.5">
                           Con {emp ? `${emp.first_name} ${emp.last_name}` : 'No asignado'}
                         </p>
                       </div>
                     </div>
                     <p className="font-black text-white decoration-primary/50 underline underline-offset-4">${srv.price}</p>
                   </div>
                 ) : null
               })}
             </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Fecha</span>
              <div className="flex items-center gap-1.5 text-white">
                <Calendar className="w-3 h-3 text-primary" />
                <span className="text-xs font-black">{new Date(appointmentDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Hora</span>
              <div className="flex items-center gap-1.5 text-white">
                <Clock className="w-3 h-3 text-primary" />
                <span className="text-xs font-black">{startTime}</span>
              </div>
            </div>
            <div className="space-y-0.5 text-right relative">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/60 block">Inversión</span>
              <div className="flex items-center justify-end gap-1 text-white">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-2xl font-black text-emerald-400 tracking-tighter">{totalPrice.toFixed(2)}</span>
              </div>
              <div className="absolute -bottom-4 right-0 flex items-center gap-1 opacity-50">
                <Check className="w-2.5 h-2.5 text-emerald-500" />
                <span className="text-[8px] font-black uppercase text-white/40 tracking-tighter">Iva Incluido</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="client-notes" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            <FileText className="w-4 h-4 text-primary" />
            Notas del Cliente
          </Label>
          <Textarea
            id="client-notes"
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            placeholder="Requerimientos especiales..."
            className="rounded-2xl border-gray-100 bg-white min-h-[80px] text-xs font-bold focus-visible:ring-primary shadow-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            <FileText className="w-4 h-4 text-blue-500" />
            Notas Internas
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Visibles solo para el negocio..."
            className="rounded-2xl border-gray-100 bg-white min-h-[80px] text-xs font-bold focus-visible:ring-blue-500 shadow-sm"
          />
        </div>
      </div>
    </div>
  )
}
