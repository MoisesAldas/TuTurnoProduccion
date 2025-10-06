/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones de rendimiento
  reactStrictMode: true,
  swcMinify: true,

  // Configuración de compilación
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // experimental.serverActions eliminado porque ya no es necesario en Next.js 14+
  transpilePackages: [
    '@radix-ui/react-popover',
    '@radix-ui/react-slot',
    '@radix-ui/react-select',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-dialog',
    '@radix-ui/react-tooltip',
    'react-day-picker'
  ],
  images: {
    domains: [
      'lh3.googleusercontent.com', // Para avatares de Google
      'supabase.com',
      'your-supabase-project.supabase.co',
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },
}

export default nextConfig