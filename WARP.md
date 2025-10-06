# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Development Commands
- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint with Next.js configuration

### Component Development
- `npx shadcn@latest add [component]` - Add new shadcn/ui components
- Use existing shadcn components from `src/components/ui/`

### Database Management
- Supabase CLI commands should be run from the `supabase/` directory
- `npx supabase functions deploy send-email` - Deploy email edge function
- Database migration files are located in `supabase/`

### Testing Single Features
- No specific test runner configured - tests should be added if needed
- Use browser dev tools and component inspection for UI testing
- Check real-time functionality with multiple browser tabs for appointment booking

## Tech Stack & Architecture

### Core Framework
- **Next.js 14+** with App Router architecture
- **TypeScript** for type safety
- **Tailwind CSS** + **shadcn/ui** + **Radix UI** for modern component system
- **Supabase** for backend (database + auth + edge functions + storage)

### Key Libraries
- **React Hook Form + Zod** for form validation
- **Mapbox GL JS** for Ecuador-focused location services  
- **Resend API** for transactional emails
- **date-fns** for date manipulation
- **Recharts** for analytics dashboards

## Application Architecture

### Authentication System
TuTurno implements a **dual-user authentication system**:

- **Client Flow**: Users who book appointments (`is_client: true`)
- **Business Owner Flow**: Users who manage businesses (`is_business_owner: true`)

**Key Components:**
- `src/hooks/useAuth.tsx` - Centralized auth context with Google OAuth + email/password
- `src/middleware.ts` - Protected route handling with smart redirects based on user type
- `src/app/auth/` - Authentication pages (login, setup, callback)

**Authentication Flow:**
1. User signs in via Google OAuth or email/password
2. User completes profile setup choosing `client` or `business_owner`
3. Middleware redirects to appropriate dashboard:
   - Clients → `/dashboard/client`
   - Business owners → `/dashboard/business` (or `/business/setup` if no business created)

### Database Schema Architecture

**Core Entities:**
- `users` - Dual-role users (clients AND business owners)
- `businesses` - Business profiles with Mapbox location integration
- `employees` - Staff members with schedules and absence tracking
- `services` - Service offerings with duration and pricing
- `appointments` - Booking system with real-time conflict prevention
- `business_categories` - Service type classifications

**Important Relationships:**
- Users can be both clients AND business owners (not mutually exclusive)
- Appointments link clients to businesses through employees and services
- Time handling: `appointment_date` (DATE) + `start_time`/`end_time` (TIME)
- All times stored in business timezone (`businesses.timezone`)

### Route Structure

```
src/app/
├── auth/
│   ├── login/          # Authentication landing
│   ├── setup/          # Profile completion
│   ├── client/         # Client-specific auth
│   ├── business/       # Business owner auth
│   └── callback/       # OAuth callback handler
├── dashboard/
│   ├── client/         # Client appointment management
│   └── business/       # Business administration panel
├── business/
│   ├── [id]/           # Public business profiles
│   └── setup/          # Multi-step business creation
├── marketplace/        # Public business discovery
└── api/
    ├── complete-profile/  # Profile setup endpoint
    └── create-user/       # User creation endpoint
```

### Component Architecture

**Design System:**
- Dual-theme system: **Client (Emerald/Teal)** vs **Business (Orange/Amber)**
- Components in `src/components/ui/` follow shadcn/ui patterns
- Common components in `src/components/common/`
- Section components in `src/components/sections/`

**Key Custom Components:**
- `ImageCropper.tsx` - High-quality image processing (500x500px logos, 2000x1000px covers)
- `EmployeeSchedule.tsx` - Staff availability management  
- `EmployeeAbsences.tsx` - Absence tracking system

### Data Management Patterns

**Custom Hooks:**
- `useAuth()` - Authentication state and user management
- `useBusiness()` - Business CRUD operations and categories
- `useServices()` - Service management for businesses

**Type Safety:**
- Comprehensive types in `src/types/database.ts`
- Separation between base types and Supabase response types
- Form validation schemas with Zod

### Email System Architecture

**Critical Implementation:**
- **Supabase Edge Functions** + **Resend API** for transactional emails
- **NEVER use database triggers** for external HTTP calls (blocks transactions)
- **ALWAYS call emails from API routes AFTER successful operations**

**Email Flow:**
1. User completes action (registration, appointment booking)
2. Database transaction commits successfully
3. API route calls Supabase Edge Function (`/functions/v1/send-email`)
4. Edge function sends email via Resend API
5. Email failures don't block core functionality

**Template System:**
- Dynamic colors based on user type (client green vs business orange)
- Templates stored in edge function with theme switching
- Email types: `welcome_google`, `appointment_confirmed`, `appointment_cancelled`

## Development Guidelines

### State Management
- Use React Context for global state (auth, theme)
- Local component state for UI interactions
- Custom hooks for data fetching and business logic
- No external state management library (Redux, Zustand) currently used

### Form Handling
- **React Hook Form + Zod** for all forms
- Multi-step forms use step completion tracking
- Form validation happens progressively (per-step for complex flows)
- Error handling with toast notifications via `sonner`

### Image Handling
- **Ultra-high quality images**: 98% JPEG quality
- Business logos: 500x500px optimized for crisp display
- Cover images: 2000x1000px for hero sections
- Client-side cropping with `ImageCropper` component before upload
- Storage: ~296MB for 20 businesses (efficient for 1GB Supabase limit)

### Styling Conventions
- **Tailwind-first approach** with CSS custom properties for theming
- Gradient patterns: `from-emerald-600 via-teal-600 to-cyan-600` (client)
- Gradient patterns: `from-orange-600 via-amber-600 to-yellow-600` (business)
- Interactive states: `hover:shadow-xl hover:scale-105 transition-all duration-300`
- Responsive: Mobile-first with `md:` and `lg:` breakpoints

### Time and Date Handling
- **Always use Ecuador timezone** for business operations
- Date format: `YYYY-MM-DD` for database storage
- Time format: `HH:MM:SS` for database storage  
- Use `date-fns` for client-side manipulation
- Appointment conflicts prevented through database constraints

### Security Considerations
- **Row Level Security (RLS)** enabled on all Supabase tables
- Service role key used ONLY for server-side operations
- Client-side operations use anon key with RLS policies
- Input validation with Zod schemas on both client and API routes
- CORS headers properly configured for Edge Functions

## Environment Setup

Required environment variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (Email)
RESEND_API_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Common Development Tasks

### Adding New Email Templates
1. Add email type to `EmailRequest` interface in edge function
2. Create template in `getEmailTemplate()` with dual-theme support
3. Call from API route AFTER successful database operation
4. Deploy edge function: `npx supabase functions deploy send-email`

### Creating New Protected Routes  
1. Add route patterns to `middleware.ts` config
2. Implement user type validation in middleware
3. Create appropriate dashboard components
4. Add navigation links with role-based visibility

### Extending Database Schema
1. Create migration in `supabase/` directory
2. Update TypeScript types in `src/types/database.ts`
3. Update RLS policies for new tables
4. Create corresponding custom hooks for data operations

### Adding Business Features
1. Extend `Business` interface in types
2. Update `useBusiness()` hook with new operations
3. Add UI components with appropriate theme colors
4. Test with both client and business user flows

## Project Status

**Completed Features:**
- ✅ Dual authentication system (Google OAuth + Email/Password)
- ✅ Business setup with Mapbox integration  
- ✅ Service and employee management
- ✅ Real-time appointment booking system
- ✅ Email notifications with dynamic themes
- ✅ Client marketplace for business discovery
- ✅ Business dashboard with analytics
- ✅ High-quality image management system

**Architecture Maturity:**
- Authentication: Production-ready
- Database design: Stable with RLS policies
- Email system: Production-ready with error handling
- UI components: Comprehensive shadcn/ui implementation
- State management: Context-based, suitable for current scale

This is a sophisticated Next.js application with production-ready authentication, real-time booking capabilities, and a dual-user system optimized for the Ecuador market.