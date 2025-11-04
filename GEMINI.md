# Project: TuTurno

## Project Overview

This is a Next.js 14 project using the App Router, TypeScript, and Tailwind CSS. It is a B2B SaaS platform for appointment management called "TuTurno". The backend is powered by Supabase, including database, authentication, realtime, and storage. The application is designed to be a complete solution for businesses to manage their appointments, clients, and services.

The project uses a variety of modern technologies, including:

-   **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, Radix UI
-   **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
-   **Forms:** React Hook Form + Zod
-   **Maps:** Mapbox GL JS
-   **Data Visualization:** Recharts, Tremor
-   **File Export:** ExcelJS, jsPDF

## Building and Running

### Prerequisites

-   Node.js v18+
-   npm v9+

### Installation

1.  Install dependencies:
    ```bash
    npm install
    ```

### Running the project

1.  Run the development server:
    ```bash
    npm run dev
    ```
2.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building the project

```bash
npm run build
```

### Starting the production server

```bash
npm run start
```

### Linting

```bash
npm run lint
```

## Development Conventions

-   **Framework:** Next.js App Router is used for routing and server-side rendering.
-   **Styling:** Tailwind CSS is used for styling, with shadcn/ui and Radix UI for UI components.
-   **State Management:** React Context API is used for global state management.
-   **Forms:** React Hook Form and Zod are used for form management and validation.
-   **Backend:** Supabase is used as the Backend-as-a-Service.
-   **Authentication:** Supabase Auth is used for authentication, with support for Google OAuth and email/password.
-   **Database:** Supabase's PostgreSQL database is used, with Row Level Security (RLS) enabled for all tables.
-   **Realtime:** Supabase Realtime is used for live updates in the calendar.
-   **Storage:** Supabase Storage is used for storing images.
-   **Email:** Resend is used for sending transactional emails.
-   **Maps:** Mapbox GL JS is used for interactive maps.
-   **Drag and Drop:** DND Kit is used for drag and drop functionality.
-   **Data Visualization:** Recharts and Tremor are used for charts and data visualization.
-   **File Export:** ExcelJS and jsPDF are used for exporting data to Excel and PDF formats.
-   **Code Style:** ESLint is used for linting, with a configuration for Next.js and TypeScript.
-   **Package Manager:** npm is used for package management.
