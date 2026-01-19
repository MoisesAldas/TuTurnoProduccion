'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldX, ArrowLeft, Store } from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/logo'

export default function BusinessSuspendedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Logo color="slate" size="md" />
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-orange-200 shadow-lg">
          <CardContent className="pt-8 pb-6 px-6">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-60"></div>
                <div className="relative w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border-2 border-orange-200">
                  <ShieldX className="w-10 h-10 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
              Negocio No Disponible
            </h1>

            {/* Description */}
            <p className="text-gray-600 text-center mb-6 leading-relaxed">
              Este negocio no está disponible actualmente. Por favor, explora otros negocios en nuestro marketplace.
            </p>

            {/* Actions */}
            <div className="space-y-3">
              <Link href="/marketplace" className="block">
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                  <Store className="w-4 h-4 mr-2" />
                  Explorar Marketplace
                </Button>
              </Link>
              <Link href="/" className="block">
                <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                  Ir al Inicio
                </Button>
              </Link>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 text-center mt-6">
              ¿Tienes dudas? <Link href="/contact" className="text-orange-600 hover:text-orange-700 underline">Contáctanos</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
