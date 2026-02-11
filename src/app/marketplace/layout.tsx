import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Marketplace - Encuentra Negocios Locales | TuTurno',
  description: 'Descubre y agenda citas con los mejores negocios locales. Barbería, salón de belleza, spa, clínicas y más. Encuentra servicios cerca de ti con reseñas verificadas.',
  keywords: ['marketplace', 'negocios locales', 'reservas', 'citas', 'servicios', 'barbería', 'salón de belleza', 'spa'],
  openGraph: {
    title: 'Marketplace - Encuentra Negocios Locales | TuTurno',
    description: 'Descubre y agenda citas con los mejores negocios locales. Reseñas verificadas y reservas al instante.',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketplace - TuTurno',
    description: 'Encuentra y agenda con los mejores negocios locales',
  }
}

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
