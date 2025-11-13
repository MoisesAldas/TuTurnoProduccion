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

## Principios de Diseño (Landing Page)

Esta sección resume el manual de estilo y los principios de diseño establecidos durante el rediseño de la página principal, inspirados en sitios como Stripe.

### 1. Layout y Espaciado
- **Ancho Contenido:** Todas las secciones de contenido deben estar dentro de un contenedor centrado con un ancho máximo de `max-w-6xl` (1152px). Esto crea una columna de contenido enfocada y profesional con "aire" en los márgenes.
- **Layout Asimétrico para el Hero:** La `HeroSection` utiliza un layout de dos columnas en escritorio (texto a la izquierda, visual a la derecha) para un mayor dinamismo.
- **Espaciado Vertical:** Las secciones deben tener un `padding` vertical generoso y consistente (ej: `py-16 lg:py-24`) para crear un ritmo de scroll agradable y una clara separación entre temas.

### 2. Estilo Visual y Componentes
- **Paleta de Colores:** Se prioriza el **Tema Naranja (Negocio)** para las llamadas a la acción principales (CTAs). Los fondos de sección son limpios (`bg-white` o `bg-slate-50`), con secciones de alto contraste (`bg-gray-900`) para elementos clave como el Footer o el CTA final.
- **Tarjetas (Cards):** Los componentes de `Card` deben ser limpios, con bordes sutiles (`border-gray-200`), una sombra de caja ligera (`shadow-sm`) y efectos de `hover` que eleven la tarjeta (`hover:shadow-xl`, `hover:-translate-y-2`).
- **Iconografía:** Se utiliza `lucide-react` para iconos minimalistas y consistentes. A menudo se usan como un acento visual con el color de la marca (naranja).
- **Mockups de Producto:** Para mostrar la aplicación, se utiliza un mockup estilizado dentro de un marco de "navegador" para dar una sensación tangible y profesional del producto.

### 3. Animación e Interactividad
- **Animaciones de Entrada:** Los elementos de cada sección deben aparecer con una animación suave de fundido y deslizamiento (`fade-in` y `slide-up`) al hacer scroll para guiar la atención del usuario. Se pueden usar delays para crear un efecto escalonado.
- **Header Inteligente:** El `Header` es fijo (`sticky`) y utiliza "scroll-spying" para resaltar el enlace de la sección que se está viendo actualmente.
- **CTA Pegajoso (Sticky CTA):** Un banner de llamada a la acción aparece en la parte inferior después de que el usuario ha pasado la `HeroSection`, manteniendo la conversión siempre accesible.