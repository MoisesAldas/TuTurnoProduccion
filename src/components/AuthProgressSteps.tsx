'use client'

import { Check, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AuthProgressStepsProps {
  currentStep: 1 | 2 | 3
  userType: 'client' | 'business'
  variant?: 'login' | 'register'
}

export default function AuthProgressSteps({ currentStep, userType, variant = 'register' }: AuthProgressStepsProps) {
  const steps = [
    { number: 1, label: 'Tipo' },
    { number: 2, label: variant === 'login' ? 'Inicio' : 'Registro' },
    { number: 3, label: 'Perfil' }
  ]

  const getStepColor = (stepNumber: number) => {
    if (stepNumber < currentStep) {
      // Completed step - green for client, orange for business
      return userType === 'client'
        ? 'bg-emerald-600 text-white border-emerald-600'
        : 'bg-orange-600 text-white border-orange-600'
    } else if (stepNumber === currentStep) {
      // Current step - light green for client, light orange for business
      return userType === 'client'
        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 font-bold'
        : 'bg-orange-100 text-orange-700 border-orange-300 font-bold'
    } else {
      // Future step - gray
      return 'bg-gray-100 text-gray-500 border-gray-300'
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Badge
              variant="outline"
              className={`h-8 sm:h-9 px-2 sm:px-3 flex items-center gap-1.5 transition-all duration-300 ${getStepColor(step.number)}`}
            >
              {step.number < currentStep ? (
                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
              ) : (
                <span className="text-xs sm:text-sm font-semibold">{step.number}</span>
              )}
              <span className="text-xs sm:text-sm hidden xs:inline">{step.label}</span>
            </Badge>
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 mx-0.5 sm:mx-1" />
          )}
        </div>
      ))}
    </div>
  )
}
