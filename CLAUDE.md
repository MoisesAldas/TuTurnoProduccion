# CLAUDE.md - TuTurno Project Guide

> **📚 Documentación Completa** en [`.claude/`](./.claude/)

---

## 🎯 Quick Start

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # Linting

# Add UI Components
npx shadcn@latest add [component]

# Deploy Supabase Functions
npx supabase functions deploy [function-name]
```

---

## 📂 Documentation Index

### Core Design & Architecture

| Document | Description | Status |
|----------|-------------|--------|
| [**Design System**](./.claude/design-system.md) | B2B SaaS colors, components, patterns, philosophy | ✅ Complete |
| [**B2B Calendar System**](./.claude/b2b-calendar-system.md) | Fresha-style appointment management (walk-ins, multi-step, edit) | ✅ Complete |

### Technical Implementation

| Feature | Location | Documentation |
|---------|----------|---------------|
| **Email System** | `supabase/functions/send-*` | See [Email Architecture](#-email-system-architecture) below |
| **Database Schema** | `supabase/migrations/` | See [Database Notes](#-database-schema-notes) below |
| **Authentication** | `src/hooks/useAuth.tsx` | Dual-flow (client/business) with Google OAuth + Email/Password |
| **File Structure** | See below | Next.js 14 App Router structure |

---

## 🎨 Design Philosophy: B2B SaaS

**Category:** B2B SaaS (Business-to-Business Software as a Service)

TuTurno es una **aplicación premium de Silicon Valley** inspirada en:

| Brand | What We Take |
|-------|--------------|
| **Apple** | Clean aesthetics, minimalism |
| **Linear** | Smooth gradients, polished UI |
| **Stripe** | Professional headers, business focus |
| **Fresha** | Multi-employee calendar, appointment management |
| **Calendly** | Time slot selection, booking flows |

**Core Principle:**
_"Professional, yet delightful. Serious, yet approachable. Modern, yet timeless."_

### Dual Theme System

#### 👤 CLIENT (Green)
- Primary: `#059669` (emerald-600)
- Gradient: `from-emerald-600 via-teal-600 to-cyan-600`
- Use: Client dashboard, booking flow, client emails

#### 🏢 BUSINESS (Orange)
- Primary: `#ea580c` (orange-600)
- Gradient: `from-orange-600 via-amber-600 to-yellow-600`
- Use: Business dashboard, appointment management, business emails

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14+ (App Router) |
| **UI** | shadcn/ui + Radix UI + Tailwind CSS |
| **Auth** | Supabase Auth (Google OAuth + Email/Password) |
| **Database** | Supabase PostgreSQL with RLS |
| **Forms** | React Hook Form + Zod validation |
| **Maps** | Mapbox (Ecuador-focused) |
| **Email** | Resend API (turnoapp.org) via Edge Functions |
| **Notifications** | shadcn/ui Toast (no more alert/confirm) |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── auth/                          # Login, setup, callback
│   │   ├── client/login/
│   │   └── business/login/
│   ├── dashboard/
│   │   ├── client/                    # Client dashboard (green theme)
│   │   └── business/                  # Business dashboard (orange theme)
│   │       └── appointments/          # B2B calendar system
│   ├── business/[id]/                 # Public business pages
│   │   ├── book/                      # Client booking flow
│   │   └── page.tsx                   # Business profile
│   └── marketplace/                   # Business discovery
├── components/
│   ├── ui/                            # shadcn/ui components
│   ├── CalendarView.tsx               # Multi-employee calendar grid + tooltips
│   ├── CreateAppointmentModal.tsx     # 4-step wizard (create/edit)
│   ├── AppointmentModal.tsx           # View/update, dropdown menu, checkout trigger
│   ├── CheckoutModal.tsx              # Payment method selection + processing
│   └── ...
├── hooks/
│   ├── useAuth.tsx                    # Dual-flow auth (client/business)
│   ├── use-toast.ts                   # Toast notifications
│   └── ...
├── lib/
│   ├── supabaseClient.ts              # Client-side Supabase
│   └── supabaseServer.ts              # Server-side Supabase
└── types/
    └── database.ts                    # TypeScript definitions

supabase/
├── functions/
│   ├── send-email/                    # Welcome emails (Google OAuth)
│   └── send-appointment-email/        # Appointment confirmations (dual emails)
└── migrations/
    ├── add_walk_in_clients.sql        # Walk-in client support
    ├── add_invoices_and_payments.sql  # Invoice & payment system
    ├── fix_rls_safe.sql               # Business owner RLS policies
    └── fix_notifications_trigger_walk_in.sql
```

---

## 📧 Email System Architecture

### Overview

**Architecture:** Resend API → Supabase Edge Functions → API Routes

**Key Files:**
- `supabase/functions/send-email/` - Welcome emails
- `supabase/functions/send-appointment-email/` - Appointment notifications
- `src/app/api/send-appointment-email/route.ts` - Fetches data, calls Edge Function

### Critical Learnings

**🚫 NEVER use database triggers for external HTTP calls**
- Triggers block transactions
- HTTP failures roll back user creation
- Use API routes AFTER successful operations instead

**✅ ALWAYS call emails from API routes**
- Non-blocking (email failure doesn't break user flow)
- Proper error handling
- Execute AFTER database commits

### Email Types

#### 1. Welcome Emails (send-email function)

**Trigger:** User completes profile after Google OAuth signup

**Flow:**
```
User signs up with Google
  ↓
Complete profile API route
  ↓
Create user in database ✅
  ↓
Call Edge Function (non-blocking)
  ↓
Resend API sends email
```

**Dynamic Theming:**
- Client: Green gradient (`#059669`)
- Business: Orange gradient (`#ea580c`)

#### 2. Appointment Confirmation Emails (send-appointment-email function)

**Trigger:** Client books appointment

**Flow:**
```
Client books appointment
  ↓
Create appointment in DB ✅
  ↓
Call API route with appointmentId
  ↓
API fetches all data (JOINs)
  ↓
Call Edge Function
  ↓
Sends TWO emails:
  1. Client confirmation (green theme)
  2. Business notification (orange theme)
```

**Key Features:**
- Uses **Service Role Client** to bypass RLS
- Fetches business owner separately from `users` table
- Spanish date formatting
- Dual-theme templates
- Non-blocking (appointment created even if email fails)

### Deployment

```bash
# Deploy Edge Functions
npx supabase functions deploy send-email
npx supabase functions deploy send-appointment-email

# Set secrets in Supabase Dashboard → Edge Functions → Secrets
# Required: RESEND_API_KEY, SITE_URL
```

---

## 🗄️ Database Schema Notes

### Key Tables

#### `appointments`
```sql
- id (uuid, PK)
- business_id (uuid, FK → businesses)
- client_id (uuid, FK → users) [NULLABLE]  ← Walk-in support
- employee_id (uuid, FK → employees)
- appointment_date (date)
- start_time (time)
- end_time (time)
- status (enum: pending, confirmed, in_progress, completed, cancelled, no_show)
- total_price (numeric)
- notes (text)
- client_notes (text)
- walk_in_client_name (text)  ← NEW
- walk_in_client_phone (text) ← NEW

CONSTRAINT: (client_id IS NOT NULL) OR (walk_in_client_name IS NOT NULL)
```

#### `appointment_services`
```sql
- appointment_id (uuid, FK → appointments)
- service_id (uuid, FK → services)
- price (numeric)
```

#### `invoices`
```sql
- id (uuid, PK)
- appointment_id (uuid, FK → appointments, UNIQUE)
- invoice_number (text, UNIQUE)  ← Format: INV-2025-0001
- subtotal (numeric)
- tax (numeric)
- discount (numeric)
- total (numeric)
- status (enum: paid, pending, cancelled)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)

Auto-generated on appointment completion via trigger
```

#### `payments`
```sql
- id (uuid, PK)
- invoice_id (uuid, FK → invoices)
- payment_method (enum: cash, transfer)
- amount (numeric, CHECK > 0)
- transfer_reference (text, UNIQUE when payment_method='transfer')
- payment_date (timestamp)
- notes (text)
- created_at (timestamp)

CONSTRAINT: transfer_reference required for 'transfer' method
```

#### `businesses`, `employees`, `services`, `users`, `notifications`
See full schema in Supabase Dashboard → Table Editor

### Time/Date Formats

```tsx
// Database Storage
appointment_date: 'YYYY-MM-DD'     // "2025-10-15"
start_time: 'HH:MM:SS'             // "14:30:00"
end_time: 'HH:MM:SS'               // "15:00:00"

// Display Formatting
new Date(date + 'T00:00:00').toLocaleDateString('es-ES')  // "15/10/2025"
time.substring(0, 5)                                      // "14:30"
```

### RLS Policies

**Business Owners can:**
- INSERT appointments (for walk-ins)
- SELECT appointments (their business only)
- UPDATE appointments (their business only)
- Manage `appointment_services` (via appointment ownership)

**Clients can:**
- INSERT appointments (their own)
- SELECT appointments (their own)
- UPDATE appointments (their own, not completed/cancelled)

### Triggers

**`create_appointment_notification`**
- Fires on appointment INSERT/UPDATE
- Creates notification ONLY if `client_id IS NOT NULL`
- Skips walk-ins (no account = no notification)

**`create_invoice_on_appointment_completion`**
- Fires when appointment.status → 'completed'
- Auto-generates invoice with unique number (INV-YYYY-####)
- Sets status to 'pending' until payment registered
- One invoice per appointment (idempotent)

**`update_invoice_status_on_payment_trigger`**
- Fires on payment INSERT
- Calculates total paid for invoice
- Updates invoice.status to 'paid' when fully paid
- Supports partial payments (stays 'pending' if insufficient)

---

## 🎯 Feature Completion Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Authentication** | 🟢 100% | Google OAuth + Email/Password, dual-flow |
| **Email System** | 🟢 100% | Welcome + Appointment confirmations (dual theme) |
| **Services Management** | 🟢 100% | CRUD, pricing, duration |
| **Employees Management** | 🟢 100% | Schedules, absences, metrics |
| **Client Marketplace** | 🟢 100% | Discovery, booking, profiles |
| **Booking System** | 🟢 100% | Real-time availability, conflict prevention |
| **B2B Calendar System** | 🟢 100% | Multi-employee, walk-ins, edit, drag & drop, tooltips |
| **Invoice & Payment System** | 🟢 100% | Auto invoices, checkout modal, cash/transfer, unique refs |
| **Business Dashboard** | 🟢 100% | Appointments, analytics, advanced settings |
| **Advanced Settings** | 🟢 100% | Phase 2 complete - policies, special hours, reminders |

---

## 🚀 Recent Milestones

### 2025-10-03: Phase 2 - Advanced Business Settings ✅

**Complete Business Configuration & Automation System**

- ✅ **Database Schema**
  - Extended `businesses` table with 13 new configuration fields
  - `business_special_hours` table for holidays/special dates
  - `appointment_reminders` table for scheduled notifications
  - Two new SQL functions: `is_business_open()`, `create_appointment_reminders()`
  - Automatic reminder creation via database trigger

- ✅ **Advanced Settings Interface** (`/dashboard/business/settings/advanced`)
  - Tabbed navigation (4 tabs: Policies, Restrictions, Special Hours, Reminders)
  - Orange gradient theme (business colors)
  - Responsive design with mobile optimization
  - Real-time validation with Zod schemas

- ✅ **Cancellation Policies**
  - Configure hours of anticipation (0-168 hours / 7 days)
  - Custom policy text (shown to clients)
  - Toggle client cancellation permission
  - Toggle client reschedule permission

- ✅ **Booking Restrictions**
  - Minimum booking hours (0-72 hours / 3 days)
  - Maximum booking days into future (1-365 days / 1 year)
  - Visual preview of current settings

- ✅ **Special Hours Management**
  - `SpecialHoursManager` reusable component
  - CRUD operations via dialog modal
  - Four reason types: Holiday, Special Event, Maintenance, Custom
  - Color-coded badges for visual categorization
  - Toggle between closed/special hours
  - Date picker with validation (future dates only)
  - Spanish date formatting with date-fns
  - Overrides regular business hours

- ✅ **Reminder System Configuration**
  - Enable/disable automatic reminders
  - Configure hours before appointment (1-168 hours)
  - Multi-channel support:
    - ✅ Email (active)
    - 🔜 SMS (coming soon)
    - 🔜 Push notifications (coming soon)
  - Automatic creation when appointment confirmed
  - Auto-cancellation when appointment cancelled

- ✅ **Additional Features**
  - Auto-confirm appointments (skip manual approval)
  - Require deposit with configurable percentage (0-100%)

**New Files:**
- `src/app/dashboard/business/settings/advanced/page.tsx`
- `src/components/SpecialHoursManager.tsx`
- `supabase/migrations/add_business_advanced_settings.sql`
- `supabase/migrations/README_PHASE2.md`

**Database Functions:**

```sql
-- Check if business is open at specific date/time
-- Considers special hours first, falls back to regular hours
is_business_open(business_id, check_date, check_time) RETURNS BOOLEAN

-- Trigger: automatically creates reminders when appointment confirmed
create_appointment_reminders() RETURNS TRIGGER
```

**Architecture Decisions:**
- Additive-only migration (no breaking changes to existing data)
- IF NOT EXISTS checks for safe re-runs
- Default values for all new fields
- RLS policies for security
- Modular component design for reusability

### 2025-10-02 (PM): Invoice & Payment System ✅

**Complete Checkout & Billing Implementation**

- ✅ Database Schema
  - `invoices` table with auto-generated numbers (INV-2025-0001)
  - `payments` table with payment methods enum
  - Unique constraint on transfer references
  - Automatic status updates via triggers

- ✅ CheckoutModal Component
  - Elegant payment method selector (Cash/Transfer)
  - Transfer reference validation (unique)
  - Smooth animations and transitions
  - Responsive design
  - Error handling for duplicate references

- ✅ Smart Invoice Generation
  - Auto-creates invoice on appointment completion
  - Manual creation if payment registered before completion
  - Flexible workflow: confirmed → finalize directly OR in_progress → finalize

- ✅ AppointmentModal Enhancements
  - Dropdown menu (⋮) for secondary actions
  - Primary action: "Finalizar y Cobrar" / "Registrar Pago"
  - Color balance: gray-900 primary button (not orange overload)
  - Responsive: stacked vertical on mobile, horizontal on desktop
  - Non-stacking modals (smooth transitions)

- ✅ Calendar Tooltips
  - Hover tooltips on appointment blocks
  - Compact info display (time, duration, client, service, price)
  - Smooth fade-in animations
  - Universal service icon (📋)

**New Files:**
- `src/components/CheckoutModal.tsx`
- `supabase/migrations/add_invoices_and_payments.sql`

**Payment Methods:**
- 💵 Cash (efectivo)
- 💳 Transfer (transferencia) - requires unique reference number

**Workflow:**
```
Appointment (confirmed/in_progress/completed)
  ↓ Click "Finalizar y Cobrar"
CheckoutModal
  ↓ Select payment method + details
Register Payment
  ↓ Trigger updates invoice status
Invoice marked as "paid" ✅
```

### 2025-10-02 (AM): B2B Calendar System ✅

**Fresha-Inspired Appointment Management**

- ✅ Professional SaaS Calendar
  - Multi-employee grid view (sticky headers)
  - Color-coded appointment blocks by status
  - Current time indicator
  - Click-to-create appointments

- ✅ Walk-in Clients System
  - Database: nullable `client_id`, walk-in fields
  - RLS: business owners can INSERT appointments
  - Trigger: skip notifications for walk-ins
  - Visual: 👤 indicator on calendar

- ✅ Multi-Step Appointment Modal (4 steps)
  - Step 1: Client (walk-in vs registered)
  - Step 2: Multi-service + Employee
  - Step 3: Date/Time (auto end time)
  - Step 4: Confirmation summary
  - Progress bar (orange gradient)
  - Per-step validation

- ✅ Edit Mode
  - Same modal, dual purpose
  - Auto-populates all fields
  - Updates atomically

- ✅ Toast Notifications
  - Replaced ALL alert/confirm
  - shadcn/ui Toast component
  - Success/error variants

**Files:** See [B2B Calendar System](./.claude/b2b-calendar-system.md)

### 2025-09-30: Complete Email System ✅

- ✅ Dual Edge Functions (send-email, send-appointment-email)
- ✅ Dynamic templates (client green, business orange)
- ✅ Non-blocking architecture
- ✅ Appointment emails: 2 emails per booking
- ✅ Service Role Client (bypasses RLS)
- ✅ Spanish date formatting

### 2025-09-29: Image Quality System ✅

- ✅ 500x500px logos @ 98% quality
- ✅ 2000x1000px covers @ 98% quality
- ✅ ImageCropper optimized

### 2025-09-22: Enhanced Authentication ✅

- ✅ Email/password authentication
- ✅ Password reset flows
- ✅ Email verification
- ✅ Multi-step business setup (Mapbox)

---

## 🔜 Next Steps

1. ~~Appointment confirmation emails~~ ✅
2. ~~Walk-in clients system~~ ✅
3. ~~Multi-step appointment modal~~ ✅
4. ~~Edit appointment functionality~~ ✅
5. ~~Toast notifications~~ ✅
6. ~~Week View~~ ✅
7. ~~Drag & Drop Reschedule~~ ✅
8. ~~Invoice & Payment System~~ ✅
9. **Business Intelligence & Analytics** 🎯
   - [ ] Sales dashboard with charts
   - [ ] Employee performance reports
   - [ ] Revenue by payment method
   - [ ] Top services analysis
   - [ ] SQL functions for insights:
     - `get_business_sales_report(business_id, start_date, end_date)`
     - `get_employee_performance(employee_id, month)`
     - `get_revenue_by_payment_method(business_id)`
     - `get_top_services(business_id, limit)`
10. Appointment cancellation emails
11. Reminder system (24h before)
12. Advanced business settings

---

## 🔐 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-side only!

# Resend (Email)
RESEND_API_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🔒 Security Notes

- ✅ RLS policies on ALL tables
- ✅ Service role key: server-side only
- ✅ Input validation: Zod schemas
- ✅ Protected routes: middleware
- ✅ CORS headers: edge functions
- ❌ NEVER expose service role key to client

---

## 📚 Full Documentation

| Document | Description |
|----------|-------------|
| [Design System](./.claude/design-system.md) | Complete design system: B2B SaaS philosophy, dual themes, components, patterns, accessibility |
| [B2B Calendar System](./.claude/b2b-calendar-system.md) | Full calendar implementation: architecture, walk-ins, modals, flows, best practices |

---

## 🆘 Need Help?

- **Design Questions:** See [Design System](./.claude/design-system.md)
- **Calendar/Appointments:** See [B2B Calendar System](./.claude/b2b-calendar-system.md)
- **Database Issues:** Check RLS policies, migrations in `supabase/migrations/`
- **Email Issues:** Verify Edge Functions deployed, secrets set in Supabase Dashboard

---

**Last Updated:** 2025-10-03 - Phase 2: Advanced Business Settings Complete
**Project:** TuTurno v3 - B2B Appointment Management SaaS
