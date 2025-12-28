'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Shield, Eye, EyeOff, Loader2, Lock, Check, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabaseClient'

interface ChangePasswordCardProps {
  userEmail: string
  userProvider?: string
  inline?: boolean // If true, renders without Card wrapper
  asButton?: boolean // If true, renders as a button that opens a dialog
}

export default function ChangePasswordCard({ userEmail, userProvider, inline = false, asButton = false }: ChangePasswordCardProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  // Solo mostrar si el usuario tiene contraseña (no OAuth)
  const canChangePassword = userProvider === 'email'

  // Validaciones de fortaleza de contraseña
  const passwordChecks = {
    minLength: newPassword.length >= 8,
    hasUpperCase: /[A-Z]/.test(newPassword),
    hasLowerCase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
  }

  const isStrongPassword = Object.values(passwordChecks).every(Boolean)

  const handleChangePassword = async () => {
    setChangingPassword(true)

    try {
      // 1. Validaciones básicas
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('Todos los campos son requeridos')
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Las contraseñas nuevas no coinciden')
      }

      if (!isStrongPassword) {
        throw new Error('La contraseña no cumple con los requisitos de seguridad')
      }

      if (currentPassword === newPassword) {
        throw new Error('La nueva contraseña debe ser diferente a la actual')
      }

      // 2. Verificar contraseña actual (re-autenticación)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      })

      if (signInError) {
        throw new Error('Contraseña actual incorrecta')
      }

      // 3. Actualizar a nueva contraseña
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      // 4. Limpiar campos
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      toast({
        title: 'Contraseña actualizada',
        description: 'Tu contraseña ha sido cambiada exitosamente.',
      })
      
      // Close dialog if in button mode
      if (asButton) {
        setDialogOpen(false)
      }
    } catch (error) {
      console.error('Error changing password:', error)
      toast({
        variant: 'destructive',
        title: 'Error al cambiar contraseña',
        description: error instanceof Error ? error.message : 'Por favor intenta nuevamente.',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  if (!canChangePassword) {
    if (asButton) {
      return (
        <Button
          disabled
          variant="outline"
          className="w-full border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300"
        >
          <Lock className="w-4 h-4 mr-2" />
          Autenticado con Google
        </Button>
      )
    }
    if (inline) {
      return (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Iniciaste sesión con Google. No es necesario cambiar contraseña.
        </div>
      )
    }
    return (
      <Card className="overflow-hidden border-t-4 border-t-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold">
            <Shield className="w-5 h-5 mr-3 text-purple-500" />
            Seguridad
          </CardTitle>
          <CardDescription>
            Iniciaste sesión con Google. No es necesario cambiar contraseña.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const content = (
        <div className="space-y-6">
          {/* Contraseña Actual */}
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Introduce la contraseña actual
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Contraseña actual"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Introduce la nueva contraseña
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Indicadores de fortaleza */}
            {newPassword && (
              <div className="mt-3 space-y-2 text-sm">
                <PasswordRequirement met={passwordChecks.minLength}>
                  Al menos 8 caracteres
                </PasswordRequirement>
                <PasswordRequirement met={passwordChecks.hasUpperCase}>
                  Una letra mayúscula
                </PasswordRequirement>
                <PasswordRequirement met={passwordChecks.hasLowerCase}>
                  Una letra minúscula
                </PasswordRequirement>
                <PasswordRequirement met={passwordChecks.hasNumber}>
                  Un número
                </PasswordRequirement>
              </div>
            )}
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Confirmar nueva contraseña
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nueva contraseña"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <X className="w-3 h-3" />
                Las contraseñas no coinciden
              </p>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Las contraseñas coinciden
              </p>
            )}
          </div>

          {/* Botón Actualizar */}
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword || !isStrongPassword || newPassword !== confirmPassword}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-6 text-base"
          >
            {changingPassword ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Actualizando...
              </>
            ) : (
              'Actualizar Contraseña'
            )}
          </Button>

          {/* Link de recuperación */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            ¿Olvidaste tu contraseña?{' '}
            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
                  redirectTo: `${window.location.origin}/auth/reset-password`,
                })

                if (error) {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'No pudimos enviar el email de recuperación.',
                  })
                } else {
                  toast({
                    title: 'Email enviado',
                    description: 'Revisa tu correo para restablecer tu contraseña.',
                  })
                }
              }}
              className="text-purple-600 hover:underline font-medium dark:text-purple-400"
            >
              Recuperar contraseña
            </button>
          </p>
        </div>
  )

  // Button mode - render as a button that opens a dialog
  if (asButton) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11">
            <Lock className="w-4 h-4 mr-2" />
            Actualizar Contraseña
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-purple-600" />
              Cambiar Contraseña
            </DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  if (inline) {
    return content
  }

  return (
    <Card className="overflow-hidden border-t-4 border-t-purple-600">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold">
          <Shield className="w-5 h-5 mr-3 text-purple-600" />
          Cambiar Contraseña
        </CardTitle>
        <CardDescription>
          Actualiza tu contraseña para {userEmail}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {content}
      </CardContent>
    </Card>
  )
}

// Componente helper para requisitos de contraseña
function PasswordRequirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 ${met ? 'text-green-600' : 'text-gray-500'}`}>
      {met ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      <span className="text-xs">{children}</span>
    </div>
  )
}
