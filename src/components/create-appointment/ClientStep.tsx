import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { UserCheck, Building2, UserCircle, Search, Check, Info, User as UserIcon } from 'lucide-react'
import type { Client, BusinessClient, ClientType } from '@/hooks/useCreateAppointment'

interface ClientStepProps {
  clientType: ClientType
  setClientType: (type: ClientType) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedClientId: string
  setSelectedClientId: (id: string) => void
  selectedBusinessClientId: string
  setSelectedBusinessClientId: (id: string) => void
  walkInName: string
  setWalkInName: (name: string) => void
  walkInPhone: string
  setWalkInPhone: (phone: string) => void
  clients: Client[]
  businessClients: BusinessClient[]
  filteredClients: Client[]
  showRegisteredDropdown: boolean
  setShowRegisteredDropdown: (show: boolean) => void
  showBusinessClientDropdown: boolean
  setShowBusinessClientDropdown: (show: boolean) => void
  debouncedSearch: (val: string) => void
}

export function ClientStep({
  clientType, setClientType, searchTerm, setSearchTerm,
  selectedClientId, setSelectedClientId,
  selectedBusinessClientId, setSelectedBusinessClientId,
  walkInName, setWalkInName, walkInPhone, setWalkInPhone,
  clients, businessClients, filteredClients,
  showRegisteredDropdown, setShowRegisteredDropdown,
  showBusinessClientDropdown, setShowBusinessClientDropdown,
  debouncedSearch
}: ClientStepProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-500">
          <UserIcon className="w-4 h-4 text-primary" />
          Tipo de Cliente
        </Label>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'walk_in', label: 'Sin Registro', subLabel: 'Cita ocasional', icon: UserCircle, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
            { id: 'registered', label: 'Registrado', subLabel: 'Cuenta TuTurno', icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { id: 'business_client', label: 'Mis Clientes', subLabel: 'Base de datos', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' }
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setClientType(type.id as ClientType)}
              className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 group ${
                clientType === type.id 
                  ? `border-primary ${type.bg} shadow-lg scale-[1.02]` 
                  : 'border-gray-100 hover:border-gray-200 bg-white hover:scale-[1.01]'
              }`}
            >
              <div className={`p-2 rounded-xl mb-2 transition-colors ${clientType === type.id ? 'bg-white shadow-sm' : 'bg-gray-50 group-hover:bg-gray-100'}`}>
                <type.icon className={`w-6 h-6 ${type.color}`} />
              </div>
              <span className="font-bold text-gray-900 text-sm tracking-tight">{type.label}</span>
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter mt-1">{type.subLabel}</span>
              {clientType === type.id && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-4 border-white shadow-md">
                  <Check className="w-3 h-3 text-white stroke-[3px]" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {clientType === 'walk_in' && (
        <div className="space-y-3 bg-orange-50/50 border border-orange-100 rounded-2xl p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <UserCircle className="w-24 h-24 text-orange-600" />
          </div>
          <div className="space-y-3 relative z-10">
            <div className="space-y-1">
              <Label htmlFor="walk-in-name" className="text-xs font-bold text-gray-600 uppercase">Nombre Completo *</Label>
              <Input
                id="walk-in-name"
                placeholder="Juan Pérez"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="h-12 rounded-xl border-orange-100 bg-white focus-visible:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="walk-in-phone" className="text-xs font-bold text-gray-600 uppercase">Teléfono (WhatsApp)</Label>
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Para recordatorios</span>
              </div>
              <Input
                id="walk-in-phone"
                placeholder="0999123456"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                className="h-12 rounded-xl border-orange-100 bg-white focus-visible:ring-orange-500"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/50 rounded-lg text-[10px] text-orange-700 font-medium border border-orange-100/50">
              <Info className="w-3.5 h-3.5" />
              <span>Los datos se guardarán específicamente para esta reserva.</span>
            </div>
          </div>
        </div>
      )}

      {clientType === 'registered' && (
        <div className="space-y-3 relative">
          <Label className="text-xs font-bold text-gray-600 uppercase">Buscar Cliente en TuTurno *</Label>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Nombre, email o teléfono..."
              value={selectedClientId ? (() => {
                const c = clients.find(cl => cl.id === selectedClientId)
                return c ? `${c.first_name} ${c.last_name}` : searchTerm
              })() : searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setSelectedClientId('')
                setShowRegisteredDropdown(true)
              }}
              onFocus={() => setShowRegisteredDropdown(true)}
              onBlur={() => setTimeout(() => setShowRegisteredDropdown(false), 200)}
              className="h-12 pl-12 rounded-xl border-gray-100 focus-visible:ring-primary shadow-sm"
            />
            {showRegisteredDropdown && !selectedClientId && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 scrollbar-hide">
                {filteredClients.length > 0 ? (
                  filteredClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedClientId(c.id)
                        setSearchTerm('')
                      }}
                      className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between transition-colors border-b last:border-b-0 border-gray-50"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-gray-400 font-medium tracking-tight mt-0.5">{c.email}</p>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
                        <UserCheck className="w-4 h-4 text-orange-500" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm italic font-medium">No se encontraron resultados</div>
                )}
              </div>
            )}
            {selectedClientId && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in">
                <Check className="w-5 h-5 stroke-[3px]" />
              </div>
            )}
          </div>
        </div>
      )}

      {clientType === 'business_client' && (
        <div className="space-y-3 relative">
          <Label className="text-xs font-bold text-gray-600 uppercase tracking-widest">Buscar en Mis Clientes *</Label>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por nombre o celular..."
              value={selectedBusinessClientId ? (() => {
                const c = businessClients.find(cl => cl.id === selectedBusinessClientId)
                return c ? `${c.first_name} ${c.last_name || ''}` : searchTerm
              })() : searchTerm}
              onChange={(e) => {
                const val = e.target.value
                setSearchTerm(val)
                setSelectedBusinessClientId('')
                setShowBusinessClientDropdown(true)
                debouncedSearch(val)
              }}
              onFocus={() => setShowBusinessClientDropdown(true)}
              onBlur={() => setTimeout(() => setShowBusinessClientDropdown(false), 200)}
              className="h-12 pl-12 rounded-xl border-gray-100 focus-visible:ring-primary shadow-sm"
            />
            {showBusinessClientDropdown && !selectedBusinessClientId && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 scrollbar-hide">
                {businessClients.length > 0 ? (
                  businessClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedBusinessClientId(c.id)
                        setSearchTerm('')
                      }}
                      className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between transition-colors border-b last:border-b-0 border-gray-50"
                    >
                      <div>
                        <p className="font-bold text-gray-900">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-gray-400 font-medium tracking-tight mt-0.5">{c.phone}</p>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                        <Building2 className="w-4 h-4 text-blue-500" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm italic font-medium">Empieza a escribir para buscar...</div>
                )}
              </div>
            )}
            {selectedBusinessClientId && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in">
                <Check className="w-5 h-5 stroke-[3px]" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
