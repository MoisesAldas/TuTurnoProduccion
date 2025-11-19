'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect page: settings → ajustes
 *
 * Mantiene una única fuente de verdad para configuración.
 * La página principal está en /dashboard/client/ajustes
 */
export default function SettingsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/client/ajustes')
  }, [router])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  )
}
