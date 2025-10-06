# 📅 B2B Appointment Management System (Fresha-Inspired)

## Overview

Complete B2B SaaS calendar system for business owners to manage appointments across multiple employees.

**Status:** ✅ 100% Complete (2025-10-02)

**Inspiration:** Fresha, Calendly, Cal.com
**Target Users:** Business owners, salon managers, clinic administrators
**Key Features:** Multi-employee view, walk-in clients, drag & drop (pending), real-time updates

---

## Architecture

### File Structure

```
src/
├── app/dashboard/business/appointments/
│   └── page.tsx                       # Main calendar page
├── components/
│   ├── CalendarView.tsx               # Calendar grid component
│   ├── CreateAppointmentModal.tsx     # 4-step wizard (create/edit)
│   └── AppointmentModal.tsx           # View/update appointment details
└── hooks/
    └── use-toast.ts                   # Toast notifications
```

### Database Tables

```
appointments
├── id (uuid, PK)
├── business_id (uuid, FK → businesses)
├── client_id (uuid, FK → users) [NULLABLE]
├── employee_id (uuid, FK → employees)
├── appointment_date (date)
├── start_time (time)
├── end_time (time)
├── status (enum)
├── total_price (numeric)
├── notes (text)
├── client_notes (text)
├── walk_in_client_name (text) [NEW]
└── walk_in_client_phone (text) [NEW]

appointment_services
├── appointment_id (uuid, FK → appointments)
├── service_id (uuid, FK → services)
└── price (numeric)
```

---

## Calendar Grid Component

### Configuration

```tsx
// CalendarView.tsx
const HOUR_HEIGHT = 60  // px per hour
const START_HOUR = 8    // 8:00 AM
const END_HOUR = 20     // 8:00 PM
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
```

**Design Decisions:**
- **60px per hour** = Optimal for 15/30min appointment visibility
- **8 AM - 8 PM** = Standard business hours (customizable per business)
- **Sticky columns** = Time column always visible during horizontal scroll
- **Sticky headers** = Employee names visible during vertical scroll

### Layout Structure

```tsx
<div className="flex h-full overflow-hidden">
  {/* TIME COLUMN (Sticky Left) */}
  <div className="w-20 flex-shrink-0 border-r bg-gray-50 sticky left-0 z-20">
    {HOURS.map(hour => (
      <div key={hour} className="h-[60px] border-b flex items-center justify-center">
        <span className="text-sm text-gray-600">{hour}:00</span>
      </div>
    ))}
  </div>

  {/* EMPLOYEE COLUMNS (Scrollable) */}
  <div className="flex-1 overflow-x-auto">
    <div className="flex min-w-min">
      {employees.map(employee => (
        <div key={employee.id} className="flex-1 min-w-[200px] border-r">
          {/* EMPLOYEE HEADER (Sticky Top) */}
          <div className="h-16 border-b sticky top-0 bg-white z-10 flex items-center gap-3 px-4">
            <Avatar>
              <AvatarImage src={employee.avatar_url} />
              <AvatarFallback>{employee.initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{employee.first_name} {employee.last_name}</p>
            </div>
          </div>

          {/* TIME GRID */}
          <div className="relative">
            {/* Grid Lines (Clickable) */}
            {HOURS.map(hour => (
              <div
                key={hour}
                className="h-[60px] border-b border-r border-gray-200 hover:bg-orange-50 cursor-pointer transition-colors"
                onClick={() => handleCreateAppointment(selectedDate, `${hour}:00`, employee.id)}
              />
            ))}

            {/* Appointments (Absolute Positioned) */}
            {getEmployeeAppointments(employee.id).map(appointment => (
              <AppointmentBlock
                key={appointment.id}
                appointment={appointment}
                onClick={() => handleAppointmentClick(appointment)}
              />
            ))}

            {/* Current Time Line */}
            <CurrentTimeLine />
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
```

---

## Appointment Block Component

### Position Calculation

```tsx
const AppointmentBlock = ({ appointment, onClick }) => {
  // Convert time to minutes since START_HOUR
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const startMinutes = timeToMinutes(appointment.start_time)
  const endMinutes = timeToMinutes(appointment.end_time)

  // Calculate position from top
  const top = ((startMinutes - (START_HOUR * 60)) / 60) * HOUR_HEIGHT

  // Calculate height
  const duration = endMinutes - startMinutes
  const height = (duration / 60) * HOUR_HEIGHT

  // Status-based styling
  const statusStyles = {
    pending: 'bg-gradient-to-br from-yellow-100 to-amber-100 border-yellow-300',
    confirmed: 'bg-gradient-to-br from-orange-100 to-amber-100 border-orange-300',
    in_progress: 'bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-300',
    completed: 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300',
    cancelled: 'bg-gradient-to-br from-red-100 to-rose-100 border-red-300',
    no_show: 'bg-gradient-to-br from-orange-200 to-amber-200 border-orange-400'
  }

  return (
    <div
      className={`
        absolute left-0 right-0 mx-1 rounded-lg border-2 p-2
        cursor-pointer hover:shadow-lg transition-all duration-200
        overflow-hidden
        ${statusStyles[appointment.status]}
      `}
      style={{ top: `${top}px`, height: `${height}px`, minHeight: '30px' }}
      onClick={onClick}
    >
      {/* Time */}
      <p className="text-xs font-semibold truncate text-gray-700">
        {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
      </p>

      {/* Client Name */}
      <p className="text-sm font-bold truncate text-gray-900">
        {getClientName(appointment)}
        {!appointment.client_id && (
          <span className="ml-1 text-xs font-normal text-orange-600">
            👤 Walk-in
          </span>
        )}
      </p>

      {/* Service */}
      <p className="text-xs text-gray-600 truncate">
        {appointment.appointment_services?.[0]?.services?.name}
      </p>
    </div>
  )
}

// Helper function
const getClientName = (appointment) => {
  if (appointment.users) {
    return `${appointment.users.first_name} ${appointment.users.last_name}`
  }
  return appointment.walk_in_client_name || 'Cliente'
}
```

### Current Time Indicator

```tsx
function CurrentTimeLine() {
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()

      if (hours >= START_HOUR && hours <= END_HOUR) {
        const totalMinutes = (hours - START_HOUR) * 60 + minutes
        const pos = (totalMinutes / 60) * HOUR_HEIGHT
        setPosition(pos)
      }
    }

    updatePosition()
    const interval = setInterval(updatePosition, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  if (position === 0) return null

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${position}px` }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
        <div className="flex-1 h-0.5 bg-red-500" />
      </div>
    </div>
  )
}
```

---

## Walk-in Clients System

### Problem

Businesses often serve walk-in clients who don't have accounts in the system. Requiring registration creates friction and reduces usability.

### Solution

Dual client system: **Registered clients** (with user accounts) + **Walk-in clients** (name + optional phone only).

### Database Migration

**File:** `/supabase/migrations/add_walk_in_clients.sql`

```sql
-- 1. Make client_id nullable
ALTER TABLE public.appointments
  ALTER COLUMN client_id DROP NOT NULL;

-- 2. Add walk-in fields
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS walk_in_client_name TEXT,
  ADD COLUMN IF NOT EXISTS walk_in_client_phone TEXT;

-- 3. Add constraint: EITHER client_id OR walk_in_client_name required
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_client_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_client_check
  CHECK (
    client_id IS NOT NULL
    OR
    walk_in_client_name IS NOT NULL
  );

-- 4. Index for searching walk-in clients
DROP INDEX IF EXISTS idx_appointments_walk_in_name;
CREATE INDEX idx_appointments_walk_in_name
  ON public.appointments(walk_in_client_name)
  WHERE walk_in_client_name IS NOT NULL;

-- 5. Comments
COMMENT ON COLUMN public.appointments.client_id IS 'ID del cliente registrado (opcional si es walk-in)';
COMMENT ON COLUMN public.appointments.walk_in_client_name IS 'Nombre del cliente walk-in sin cuenta';
COMMENT ON COLUMN public.appointments.walk_in_client_phone IS 'Teléfono del cliente walk-in (opcional)';
```

### RLS Policies

**File:** `/supabase/migrations/fix_rls_safe.sql`

```sql
-- Allow business owners to CREATE appointments
DROP POLICY IF EXISTS "Business owners can create appointments for their businesses"
  ON public.appointments;

CREATE POLICY "Business owners can create appointments for their businesses"
ON public.appointments
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.businesses
        WHERE businesses.id = appointments.business_id
        AND businesses.owner_id = auth.uid()
    )
);

-- Allow business owners to manage appointment services
DROP POLICY IF EXISTS "Users can manage appointment services for their appointments"
  ON public.appointment_services;

CREATE POLICY "Users can manage appointment services for their appointments"
ON public.appointment_services
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.appointments
        WHERE appointments.id = appointment_services.appointment_id
        AND (
            -- Client owns the appointment
            appointments.client_id = auth.uid()
            OR
            -- Business owner manages the business
            EXISTS (
                SELECT 1 FROM public.businesses
                WHERE businesses.id = appointments.business_id
                AND businesses.owner_id = auth.uid()
            )
        )
    )
);
```

### Notifications Trigger Fix

**File:** `/supabase/migrations/fix_notifications_trigger_walk_in.sql`

**Problem:** Trigger tried to create notifications for ALL appointments, but walk-ins have `client_id = NULL`, causing `NOT NULL` constraint errors.

**Solution:** Only create notifications for registered clients.

```sql
CREATE OR REPLACE FUNCTION create_appointment_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notifications for REGISTERED clients (not walk-ins)
    IF NEW.client_id IS NOT NULL THEN

        -- Appointment confirmed
        IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
            INSERT INTO public.notifications (user_id, appointment_id, type, title, message)
            VALUES (
                NEW.client_id,
                NEW.id,
                'appointment_confirmed',
                'Cita Confirmada',
                'Tu cita ha sido confirmada para el ' || TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY') || ' a las ' || TO_CHAR(NEW.start_time, 'HH24:MI')
            );
        END IF;

        -- Appointment cancelled
        IF NEW.status = 'cancelled' AND (OLD IS NULL OR OLD.status != 'cancelled') THEN
            INSERT INTO public.notifications (user_id, appointment_id, type, title, message)
            VALUES (
                NEW.client_id,
                NEW.id,
                'appointment_cancelled',
                'Cita Cancelada',
                'Tu cita del ' || TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY') || ' ha sido cancelada'
            );
        END IF;

    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION create_appointment_notification() IS
    'Crea notificaciones para citas solo si el cliente está registrado (client_id IS NOT NULL). Las citas walk-in no generan notificaciones.';
```

---

## Multi-Step Appointment Modal

**File:** `/src/components/CreateAppointmentModal.tsx`

### Features

- ✅ 4-step wizard with progress bar
- ✅ Per-step validation
- ✅ Walk-in vs Registered client selection
- ✅ Multi-service selection
- ✅ Auto-calculated end time
- ✅ Edit mode support (same component)
- ✅ Toast notifications
- ✅ Responsive design (mobile/desktop)

### Step Flow

```tsx
const steps = [
  { number: 1, title: 'Cliente', icon: User },
  { number: 2, title: 'Servicio y Empleado', icon: Briefcase },
  { number: 3, title: 'Fecha y Hora', icon: Calendar },
  { number: 4, title: 'Confirmación', icon: Check }
]
```

### Progress Bar

```tsx
<div className="flex gap-2 mb-6">
  {[1, 2, 3, 4].map((step) => (
    <div
      key={step}
      className={`flex-1 h-2 rounded-full transition-all ${
        step < currentStep
          ? 'bg-gradient-to-r from-orange-600 to-amber-600'  // Completed
          : step === currentStep
          ? 'bg-orange-400'                                   // Current
          : 'bg-gray-200'                                     // Upcoming
      }`}
    />
  ))}
</div>
```

### Step 1: Client Selection

```tsx
{/* Client Type Radio */}
<div className="grid grid-cols-2 gap-3">
  {/* Walk-in Option */}
  <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
    clientType === 'walk_in'
      ? 'border-orange-600 bg-orange-50'
      : 'border-gray-200 hover:border-gray-300'
  }`}>
    <input
      type="radio"
      name="clientType"
      value="walk_in"
      checked={clientType === 'walk_in'}
      onChange={(e) => setClientType('walk_in')}
      className="sr-only"
    />
    <div className="text-center">
      <div className="text-2xl mb-2">👤</div>
      <p className="font-medium text-gray-900">Walk-in</p>
      <p className="text-xs text-gray-500 mt-1">Sin cuenta</p>
    </div>
  </label>

  {/* Registered Option */}
  <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
    clientType === 'registered'
      ? 'border-orange-600 bg-orange-50'
      : 'border-gray-200 hover:border-gray-300'
  }`}>
    <input
      type="radio"
      name="clientType"
      value="registered"
      checked={clientType === 'registered'}
      onChange={(e) => setClientType('registered')}
      className="sr-only"
    />
    <div className="text-center">
      <div className="text-2xl mb-2">✓</div>
      <p className="font-medium text-gray-900">Registrado</p>
      <p className="text-xs text-gray-500 mt-1">Con cuenta</p>
    </div>
  </label>
</div>

{/* Walk-in Form */}
{clientType === 'walk_in' && (
  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
    <div className="space-y-2">
      <Label htmlFor="walk-in-name">Nombre del cliente *</Label>
      <Input
        id="walk-in-name"
        type="text"
        placeholder="Ej: Juan Pérez"
        value={walkInName}
        onChange={(e) => setWalkInName(e.target.value)}
        className="text-base"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="walk-in-phone">Teléfono (opcional)</Label>
      <Input
        id="walk-in-phone"
        type="tel"
        placeholder="Ej: 0991234567"
        value={walkInPhone}
        onChange={(e) => setWalkInPhone(e.target.value)}
        className="text-base"
      />
    </div>
    <p className="text-xs text-gray-600">
      💡 Este cliente no necesita una cuenta. Los datos se guardan solo para esta cita.
    </p>
  </div>
)}

{/* Registered Client Search */}
{clientType === 'registered' && (
  <div className="space-y-3">
    <Label htmlFor="client">Cliente registrado *</Label>
    <Input
      id="client-search"
      type="text"
      placeholder="Buscar cliente por nombre, teléfono o email..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="mb-2"
    />
    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
      <SelectTrigger>
        <SelectValue placeholder="Selecciona un cliente" />
      </SelectTrigger>
      <SelectContent>
        {filteredClients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.first_name} {client.last_name}
            {client.phone && ` - ${client.phone}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

### Step 2: Multi-Service Selection

```tsx
{/* Services */}
<div className="space-y-3">
  <Label className="flex items-center gap-2 text-base font-semibold">
    <Briefcase className="w-5 h-5 text-orange-600" />
    Servicios * (selecciona uno o más)
  </Label>
  <div className="border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
    {services.map((service) => (
      <label
        key={service.id}
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
          selectedServiceIds.includes(service.id)
            ? 'bg-orange-50 border-orange-300'
            : 'hover:bg-gray-50 border-transparent'
        }`}
      >
        <input
          type="checkbox"
          checked={selectedServiceIds.includes(service.id)}
          onChange={() => toggleService(service.id)}
          className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{service.name}</p>
          <p className="text-xs text-gray-500">{service.duration_minutes} min</p>
        </div>
        <span className="text-sm font-semibold text-gray-900">${service.price}</span>
      </label>
    ))}
  </div>
</div>

{/* Employee */}
<div className="space-y-3">
  <Label htmlFor="employee" className="flex items-center gap-2 text-base font-semibold">
    <User className="w-5 h-5 text-orange-600" />
    Empleado *
  </Label>
  <Select value={selectedEmployeeIdState} onValueChange={setSelectedEmployeeIdState}>
    <SelectTrigger>
      <SelectValue placeholder="Selecciona un empleado" />
    </SelectTrigger>
    <SelectContent>
      {employees.map((employee) => (
        <SelectItem key={employee.id} value={employee.id}>
          {employee.first_name} {employee.last_name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### Step 3: Date & Time with Auto-Calculation

```tsx
const calculateEndTime = () => {
  if (!startTime || selectedServiceIds.length === 0) return ''

  const totalDuration = selectedServiceIds.reduce((total, serviceId) => {
    const service = services.find(s => s.id === serviceId)
    return total + (service?.duration_minutes || 0)
  }, 0)

  const [hours, minutes] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0, 0)
  startDate.setMinutes(startDate.getMinutes() + totalDuration)

  return startDate.toTimeString().substring(0, 5)
}

// UI
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="date" className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-orange-600" />
      Fecha *
    </Label>
    <Input
      id="date"
      type="date"
      value={appointmentDate}
      onChange={(e) => setAppointmentDate(e.target.value)}
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="time" className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-orange-600" />
      Hora de inicio *
    </Label>
    <Input
      id="time"
      type="time"
      value={startTime}
      onChange={(e) => setStartTime(e.target.value)}
    />
  </div>
</div>

{/* Summary Card */}
{selectedServiceIds.length > 0 && (
  <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
    <h3 className="font-semibold text-gray-900 mb-3">Resumen de horario</h3>
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Duración total:</span>
        <span className="font-medium text-gray-900">
          {selectedServiceIds.reduce((total, id) => {
            const service = services.find(s => s.id === id)
            return total + (service?.duration_minutes || 0)
          }, 0)} minutos
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Hora de fin:</span>
        <span className="font-medium text-gray-900">{calculateEndTime()}</span>
      </div>
    </div>
  </div>
)}
```

### Step 4: Confirmation Summary

```tsx
<div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-6">
  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
    <Check className="w-5 h-5 text-orange-600" />
    Resumen de la cita
  </h3>

  <div className="space-y-3">
    {/* Client */}
    <div>
      <p className="text-xs text-gray-500 mb-1">Cliente</p>
      <p className="font-semibold text-gray-900">
        {clientType === 'walk_in'
          ? `${walkInName} ${walkInPhone ? `(${walkInPhone})` : ''}`
          : clients.find(c => c.id === selectedClientId)
            ? `${clients.find(c => c.id === selectedClientId)?.first_name} ${clients.find(c => c.id === selectedClientId)?.last_name}`
            : 'No seleccionado'}
        <span className="ml-2 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
          {clientType === 'walk_in' ? 'Walk-in' : 'Registrado'}
        </span>
      </p>
    </div>

    {/* Employee */}
    <div>
      <p className="text-xs text-gray-500 mb-1">Empleado</p>
      <p className="font-semibold text-gray-900">
        {employees.find(e => e.id === selectedEmployeeIdState)
          ? `${employees.find(e => e.id === selectedEmployeeIdState)?.first_name} ${employees.find(e => e.id === selectedEmployeeIdState)?.last_name}`
          : 'No seleccionado'}
      </p>
    </div>

    {/* Services */}
    <div>
      <p className="text-xs text-gray-500 mb-1">Servicios ({selectedServiceIds.length})</p>
      {selectedServiceIds.map(id => {
        const service = services.find(s => s.id === id)
        return service ? (
          <div key={id} className="flex justify-between items-center text-sm mb-1">
            <span className="text-gray-900">{service.name}</span>
            <span className="font-medium text-gray-900">${service.price}</span>
          </div>
        ) : null
      })}
    </div>

    {/* Date/Time */}
    <div className="pt-3 border-t border-orange-300">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-600">Fecha y hora:</span>
        <span className="font-medium text-gray-900">
          {new Date(appointmentDate).toLocaleDateString('es-ES')} • {startTime}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Duración:</span>
        <span className="font-medium text-gray-900">
          {selectedServiceIds.reduce((total, id) => {
            const service = services.find(s => s.id === id)
            return total + (service?.duration_minutes || 0)
          }, 0)} min
        </span>
      </div>
    </div>

    {/* Total */}
    <div className="pt-3 border-t-2 border-orange-300">
      <div className="flex justify-between items-center">
        <span className="text-lg font-bold text-gray-900">Total:</span>
        <span className="text-2xl font-bold text-orange-600">
          ${calculateTotalPrice().toFixed(2)}
        </span>
      </div>
    </div>
  </div>
</div>

{/* Notes (Optional) */}
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="client-notes">Notas del cliente (opcional)</Label>
    <Textarea
      id="client-notes"
      value={clientNotes}
      onChange={(e) => setClientNotes(e.target.value)}
      placeholder="Notas o solicitudes especiales del cliente..."
      rows={2}
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="notes">Notas internas (opcional)</Label>
    <Textarea
      id="notes"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Notas internas para el negocio..."
      rows={2}
    />
  </div>
</div>
```

### Validation Logic

```tsx
const validateStep = (step: number): boolean => {
  switch (step) {
    case 1: // Cliente
      return clientType === 'registered'
        ? !!selectedClientId
        : !!walkInName.trim()

    case 2: // Servicio y Empleado
      return selectedServiceIds.length > 0 && !!selectedEmployeeIdState

    case 3: // Fecha y Hora
      return !!appointmentDate && !!startTime

    case 4: // Confirmación
      return true

    default:
      return false
  }
}

const handleNext = () => {
  if (validateStep(currentStep)) {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps))
  } else {
    toast({
      variant: 'destructive',
      title: 'Campos incompletos',
      description: 'Por favor completa todos los campos obligatorios',
    })
  }
}
```

---

## Edit Mode Support

### Interface

```tsx
interface CreateAppointmentModalProps {
  businessId: string
  selectedDate: Date
  selectedTime?: string
  selectedEmployeeId?: string
  appointment?: Appointment  // ← If provided, modal is in EDIT mode
  onClose: () => void
  onSuccess: () => void
}
```

### Auto-populate Fields

```tsx
useEffect(() => {
  if (appointment) {
    // Set client type and info
    if (appointment.client_id) {
      setClientType('registered')
      setSelectedClientId(appointment.client_id)
    } else {
      setClientType('walk_in')
      setWalkInName(appointment.walk_in_client_name || '')
      setWalkInPhone(appointment.walk_in_client_phone || '')
    }

    // Set employee
    setSelectedEmployeeIdState(appointment.employee_id)

    // Set services
    if (appointment.appointment_services) {
      setSelectedServiceIds(appointment.appointment_services.map(s => s.service_id))
    }

    // Set date and time
    setAppointmentDate(appointment.appointment_date)
    setStartTime(appointment.start_time.substring(0, 5)) // Remove seconds

    // Set notes
    setNotes(appointment.notes || '')
    setClientNotes(appointment.client_notes || '')
  }
}, [appointment])
```

### Submit Logic (Create vs Update)

```tsx
const handleSubmit = async () => {
  try {
    setSubmitting(true)

    const endTime = calculateEndTime()
    const totalPrice = calculateTotalPrice()

    const appointmentData: any = {
      business_id: businessId,
      employee_id: selectedEmployeeIdState,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
      total_price: totalPrice,
      notes: notes || null,
      client_notes: clientNotes || null
    }

    // Only set status on CREATE
    if (!appointment) {
      appointmentData.status = 'confirmed'
    }

    // Client data
    if (clientType === 'registered') {
      appointmentData.client_id = selectedClientId
      appointmentData.walk_in_client_name = null
      appointmentData.walk_in_client_phone = null
    } else {
      appointmentData.client_id = null
      appointmentData.walk_in_client_name = walkInName.trim()
      appointmentData.walk_in_client_phone = walkInPhone.trim() || null
    }

    let appointmentId: string

    if (appointment) {
      // EDIT MODE
      const { error } = await supabase
        .from('appointments')
        .update(appointmentData)
        .eq('id', appointment.id)

      if (error) throw error
      appointmentId = appointment.id

      // Delete old services
      await supabase
        .from('appointment_services')
        .delete()
        .eq('appointment_id', appointment.id)

    } else {
      // CREATE MODE
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single()

      if (error) throw error
      appointmentId = data.id
    }

    // Insert services (both modes)
    const appointmentServices = selectedServiceIds.map(serviceId => {
      const service = services.find(s => s.id === serviceId)
      return {
        appointment_id: appointmentId,
        service_id: serviceId,
        price: service?.price || 0
      }
    })

    await supabase
      .from('appointment_services')
      .insert(appointmentServices)

    // Success notification
    toast({
      title: appointment ? '¡Cita actualizada exitosamente!' : '¡Cita creada exitosamente!',
      description: `Cita para ${clientType === 'walk_in' ? walkInName : 'el cliente'} ${appointment ? 'actualizada' : 'confirmada'}.`,
    })

    setTimeout(() => onSuccess(), 1000)

  } catch (error) {
    console.error('Error:', error)
    toast({
      variant: 'destructive',
      title: appointment ? 'Error al actualizar la cita' : 'Error al crear la cita',
      description: 'Por favor intenta de nuevo.',
    })
  } finally {
    setSubmitting(false)
  }
}
```

---

## Appointment Details Modal

**File:** `/src/components/AppointmentModal.tsx`

### Features

- View all appointment details
- **Edit button** (opens CreateAppointmentModal in edit mode)
- Change status: pending → confirmed → in_progress → completed
- Mark as no_show
- Cancel appointment
- Toast notifications for all actions

### Action Buttons

```tsx
<div className="flex gap-3">
  {/* Edit Button - Visible for all statuses except completed */}
  {onEdit && appointment.status !== 'completed' && (
    <Button
      onClick={onEdit}
      className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600
        hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white"
    >
      <Edit className="w-4 h-4 mr-2" />
      Editar
    </Button>
  )}

  {/* Status Change Buttons */}
  {appointment.status === 'pending' && (
    <Button
      onClick={() => handleUpdateStatus('confirmed')}
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      Confirmar
    </Button>
  )}

  {appointment.status === 'confirmed' && (
    <Button
      onClick={() => handleUpdateStatus('in_progress')}
      className="bg-blue-600 hover:bg-blue-700 text-white"
    >
      En Progreso
    </Button>
  )}

  {appointment.status === 'in_progress' && (
    <Button
      onClick={() => handleUpdateStatus('completed')}
      className="bg-gray-600 hover:bg-gray-700 text-white"
    >
      Completada
    </Button>
  )}

  {(appointment.status === 'confirmed' || appointment.status === 'pending') && (
    <Button
      onClick={() => handleUpdateStatus('no_show')}
      variant="outline"
    >
      No Asistió
    </Button>
  )}

  {/* Cancel Button */}
  <Button
    onClick={handleCancel}
    variant="outline"
    className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
  >
    Cancelar
  </Button>
</div>
```

### Toast Notifications

```tsx
const handleUpdateStatus = async (newStatus: string) => {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointment.id)

    if (error) throw error

    toast({
      title: 'Estado actualizado',
      description: 'El estado de la cita ha sido actualizado correctamente.',
    })
    onUpdate()
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Error al actualizar',
      description: 'No se pudo actualizar el estado de la cita.',
    })
  }
}

const handleCancel = async () => {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointment.id)

    if (error) throw error

    toast({
      title: 'Cita cancelada',
      description: 'La cita ha sido cancelada correctamente.',
    })
    onUpdate()
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Error al cancelar',
      description: 'No se pudo cancelar la cita.',
    })
  }
}
```

---

## Integration Flow

**File:** `/src/app/dashboard/business/appointments/page.tsx`

### State Management

```tsx
export default function AppointmentsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [createModalData, setCreateModalData] = useState<{
    date: Date
    time?: string
    employeeId?: string
  }>({ date: new Date() })

  // Create new appointment
  const handleCreateAppointment = (date?: Date, time?: string, employeeId?: string) => {
    setCreateModalData({
      date: date || selectedDate,
      time,
      employeeId
    })
    setShowCreateModal(true)
  }

  // Edit existing appointment
  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment)
  }

  // Success handler (both create & edit)
  const handleSuccess = () => {
    setShowCreateModal(false)
    setEditingAppointment(null)
    fetchAppointments()
  }

  return (
    <div>
      {/* Calendar Grid */}
      <CalendarView
        appointments={appointments}
        employees={employees}
        onCreateAppointment={handleCreateAppointment}
        onEditAppointment={handleEditAppointment}
      />

      {/* CREATE Modal */}
      {showCreateModal && business && (
        <CreateAppointmentModal
          businessId={business.id}
          selectedDate={createModalData.date}
          selectedTime={createModalData.time}
          selectedEmployeeId={createModalData.employeeId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* EDIT Modal (same component!) */}
      {editingAppointment && business && (
        <CreateAppointmentModal
          businessId={business.id}
          selectedDate={new Date(editingAppointment.appointment_date + 'T00:00:00')}
          appointment={editingAppointment}  {/* ← Triggers edit mode */}
          onClose={() => setEditingAppointment(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
```

### Query with service_id

```tsx
const { data, error } = await supabase
  .from('appointments')
  .select(`
    *,
    users(first_name, last_name, phone, avatar_url, email),
    employees(first_name, last_name),
    appointment_services(
      service_id,    ← REQUIRED for edit mode
      price,
      services(name, duration_minutes)
    )
  `)
  .eq('business_id', business.id)
  .eq('appointment_date', dateStr)
  .order('start_time')
```

---

## User Flows

### Flow 1: Create Walk-in Appointment

1. **Calendar:** Business owner clicks empty time slot at 10:00 AM for Employee "Ana"
2. **Modal opens:** CreateAppointmentModal (Step 1 - Cliente)
3. **Select:** "Walk-in" client type
4. **Enter:** Name: "Juan Pérez", Phone: "0991234567" (optional)
5. **Click:** "Siguiente" → Step 2
6. **Select:** Services: "Corte de Cabello" ($15, 30min) + "Barba" ($10, 15min)
7. **Select:** Employee: "Ana" (pre-filled from click)
8. **Click:** "Siguiente" → Step 3
9. **Verify:** Date: Today, Time: 10:00 (pre-filled)
10. **See:** Auto-calculated end time: 10:45 (45min total)
11. **Click:** "Siguiente" → Step 4
12. **Review:** Full summary shows:
    - Cliente: Juan Pérez (Walk-in)
    - Empleado: Ana García
    - Servicios: Corte + Barba = $25
    - Fecha/Hora: Hoy 10:00 - 10:45
13. **Click:** "Crear Cita"
14. **See:** Toast notification "¡Cita creada exitosamente!"
15. **Calendar updates:** Orange block appears at 10:00-10:45 with "Juan Pérez 👤"
16. **Database:** `appointments` record created with `client_id = NULL`, `walk_in_client_name = "Juan Pérez"`

### Flow 2: Edit Appointment

1. **Calendar:** Click existing appointment block
2. **AppointmentModal opens:** Shows all details
3. **Click:** Orange "Editar" button
4. **CreateAppointmentModal opens:** In edit mode, Step 1
5. **See:** All fields pre-filled (client type, name, services, employee, date, time, notes)
6. **Modify:** Change time from 10:00 to 11:00
7. **Navigate:** Steps 1-4 (validation still enforced)
8. **Step 4:** Review updated summary
9. **Click:** "Actualizar Cita"
10. **See:** Toast "¡Cita actualizada exitosamente!"
11. **Calendar updates:** Block moves to 11:00-11:45
12. **Database:** `appointments` record updated, old `appointment_services` deleted, new ones inserted

### Flow 3: Change Status

1. **Calendar:** Click appointment (status: pending)
2. **AppointmentModal opens:** Shows badge "Pendiente"
3. **Click:** Green "Confirmar" button
4. **See:** Toast "Estado actualizado"
5. **Modal updates:** Badge changes to "Confirmada", button changes to "En Progreso"
6. **Calendar:** Block color changes from yellow to orange
7. **Database:** `status = 'confirmed'`
8. **Trigger fires:** If registered client, creates notification

---

## Best Practices

### DO ✅

- Use walk-in for clients without accounts (no registration friction)
- Validate each step before allowing "Siguiente"
- Show real-time summary (duration, price, end time)
- Use toast notifications for ALL user feedback
- Pre-fill data when editing appointments
- Allow editing all appointments except completed
- Display walk-in indicator (👤 icon) clearly
- Auto-calculate end times based on service durations
- Use optimistic UI updates where possible

### DON'T ❌

- Don't force walk-in clients to register
- Don't send email/notifications to walk-in clients (no email)
- Don't use `alert()` or `confirm()` (use toast)
- Don't allow editing completed appointments
- Don't skip step validation
- Don't forget to update `appointment_services` when editing
- Don't allow overlapping appointments (implement conflict checking)
- Don't forget to check employee availability

---

## Performance Optimizations

### Memoization

```tsx
import { useMemo } from 'react'

// Expensive calculations
const employeeAppointments = useMemo(() => {
  return appointments.filter(apt => apt.employee_id === employee.id)
}, [appointments, employee.id])

const totalDuration = useMemo(() => {
  return selectedServiceIds.reduce((total, id) => {
    const service = services.find(s => s.id === id)
    return total + (service?.duration_minutes || 0)
  }, 0)
}, [selectedServiceIds, services])
```

### Debouncing Search

```tsx
import { useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const [searchTerm, setSearchTerm] = useState('')
const debouncedSearch = useDebouncedValue(searchTerm, 300)

const filteredClients = useMemo(() => {
  return clients.filter(client =>
    `${client.first_name} ${client.last_name} ${client.phone || ''}`
      .toLowerCase()
      .includes(debouncedSearch.toLowerCase())
  )
}, [clients, debouncedSearch])
```

### Optimistic UI Updates

```tsx
const handleUpdateStatus = async (newStatus: string) => {
  // 1. Update UI immediately
  const previousStatus = appointment.status
  setLocalAppointment(prev => ({ ...prev, status: newStatus }))

  try {
    // 2. Update database
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointment.id)

    if (error) throw error

    toast({ title: 'Estado actualizado' })
    onUpdate()

  } catch (error) {
    // 3. Revert on error
    setLocalAppointment(prev => ({ ...prev, status: previousStatus }))
    toast({ variant: 'destructive', title: 'Error al actualizar' })
  }
}
```

---

## Future Enhancements

### Week View (Pending)

- 7-day grid (Monday-Sunday)
- Same appointment blocks as Day view
- Week navigation controls
- Responsive collapsing on mobile

### Drag & Drop (Pending)

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'

// Draggable appointment block
const { attributes, listeners, setNodeRef } = useDraggable({
  id: appointment.id,
  data: appointment
})

// Droppable time slot
const { setNodeRef: setDropRef } = useDroppable({
  id: `${employee.id}-${hour}`,
  data: { employeeId: employee.id, time: `${hour}:00` }
})

const handleDragEnd = (event) => {
  const { active, over } = event
  // Update appointment with new time/employee
  // Show toast confirmation
  // Refresh calendar
}
```

### Recurring Appointments

- Daily/Weekly/Monthly patterns
- End date or occurrence count
- Skip specific dates
- Bulk update/cancel

### Conflict Detection

- Validate employee availability
- Check for overlapping appointments
- Warn on double-booking
- Suggest alternative times

---

**Related Documentation:**
- [Design System](./design-system.md) - Colors, components, patterns
- [Database Schema](./database.md) - Full schema reference
- [Email System](./email-system.md) - Appointment email notifications
