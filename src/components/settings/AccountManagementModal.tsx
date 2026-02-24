'use client'

/**
 * AccountManagementModal
 *
 * Modal auto-contenido para gestión de cuenta del propietario del negocio.
 *
 * Tabs:
 *   1. Contraseña  — supabase.auth.updateUser({ password }) — solo cuentas email
 *   2. Correo      — supabase.auth.updateUser({ email })    — solo cuentas email
 *   3. Eliminar    — llama a la Edge Function delete-user-account
 *
 * El proveedor se detecta automáticamente al abrir el modal.
 * Los usuarios de Google ven un mensaje informativo en lugar de los formularios.
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import {
  Lock,
  Mail,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  Chrome,
  KeyRound,
  Info,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = 'password' | 'email' | 'delete'

interface AccountManagementModalProps {
  open: boolean
  onClose: () => void
  businessName: string
  variant?: 'business' | 'client'
}

// ─── Theme helper ───────────────────────────────────────────────────────────

interface ModalTheme {
  activeBg: string        // active tab bg
  activeText: string      // active tab text
  btnBg: string           // submit button bg
  btnHover: string        // submit button hover
  ring: string            // input focus ring
  spinnerBorder: string   // loading spinner track
  spinnerTop: string      // loading spinner head
  iconBg: string          // header icon bg
  iconText: string        // header icon color
  infoBg: string          // info alert bg
  infoBorder: string      // info alert border
  infoIcon: string        // info alert icon
  infoText: string        // info alert text
}

function buildTheme(variant: 'business' | 'client'): ModalTheme {
  if (variant === 'client') return {
    activeBg: 'bg-slate-950',
    activeText: 'text-white',
    btnBg: 'bg-slate-950',
    btnHover: 'hover:bg-slate-800',
    ring: 'focus-visible:ring-slate-950',
    spinnerBorder: 'border-slate-200',
    spinnerTop: 'border-t-slate-950',
    iconBg: 'bg-slate-100',
    iconText: 'text-slate-950',
    infoBg: 'bg-slate-50',
    infoBorder: 'border-slate-200',
    infoIcon: 'text-slate-500',
    infoText: 'text-slate-700',
  }
  return {
    activeBg: 'bg-orange-600',
    activeText: 'text-white',
    btnBg: 'bg-orange-600',
    btnHover: 'hover:bg-orange-700',
    ring: 'focus-visible:ring-orange-500',
    spinnerBorder: 'border-orange-200',
    spinnerTop: 'border-t-orange-600',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
    infoBg: 'bg-orange-50',
    infoBorder: 'border-orange-200',
    infoIcon: 'text-orange-500',
    infoText: 'text-orange-700',
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const TabButton = ({
  id,
  active,
  icon: Icon,
  label,
  danger,
  onClick,
  theme,
}: {
  id: Tab
  active: boolean
  icon: React.ElementType
  label: string
  danger?: boolean
  onClick: () => void
  theme: ModalTheme
}) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight
      transition-all duration-200 whitespace-nowrap
      ${active
        ? danger
          ? 'bg-red-600 text-white shadow-md'
          : `${theme.activeBg} ${theme.activeText} shadow-md`
        : danger
          ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }
    `}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
)

// ─── Google Provider Notice ─────────────────────────────────────────────────

const GoogleProviderNotice = () => (
  <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-4">
    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
      <Chrome className="w-7 h-7 text-blue-500" />
    </div>
    <div>
      <p className="font-black text-gray-900 tracking-tight">Cuenta de Google</p>
      <p className="text-sm text-gray-500 mt-1 max-w-xs">
        Tu cuenta está vinculada a Google. Para cambiar tu contraseña o correo,
        ve a la configuración de tu cuenta de Google.
      </p>
    </div>
    <a
      href="https://myaccount.google.com/security"
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-bold text-blue-600 underline hover:no-underline"
    >
      Gestionar cuenta de Google →
    </a>
  </div>
)

// ─── Tab: Cambiar Contraseña ────────────────────────────────────────────────

function PasswordTab({ theme }: { theme: ModalTheme }) {
  const supabase = createClient()
  const { toast } = useToast()

  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPass.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPass !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    try {
      setLoading(true)

      // Re-autenticar primero con la contraseña actual
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user?.email) throw new Error('No se encontró el email del usuario.')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: current,
      })
      if (signInError) {
        setError('La contraseña actual es incorrecta.')
        return
      }

      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({ password: newPass })
      if (updateError) throw updateError

      toast({ title: '¡Contraseña actualizada!', description: 'Tu contraseña ha sido cambiada exitosamente.' })
      setCurrent('')
      setNewPass('')
      setConfirm('')
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  const VisibilityToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contraseña actual</Label>
        <div className="relative">
          <Input
            type={showCurrent ? 'text' : 'password'}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            placeholder="Tu contraseña actual"
            required
            className={`pr-10 rounded-xl border-gray-200 ${theme.ring}`}
          />
          <VisibilityToggle show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nueva contraseña</Label>
        <div className="relative">
          <Input
            type={showNew ? 'text' : 'password'}
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            className={`pr-10 rounded-xl border-gray-200 ${theme.ring}`}
          />
          <VisibilityToggle show={showNew} onToggle={() => setShowNew(v => !v)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Confirmar contraseña</Label>
        <div className="relative">
          <Input
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repite la nueva contraseña"
            required
            className={`pr-10 rounded-xl border-gray-200 ${theme.ring}`}
          />
          <VisibilityToggle show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl py-2.5">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={loading || !current || !newPass || !confirm}
        className={`w-full ${theme.btnBg} ${theme.btnHover} text-white rounded-xl font-bold`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Actualizando…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Cambiar contraseña
          </span>
        )}
      </Button>
    </form>
  )
}

// ─── Tab: Actualizar Correo ─────────────────────────────────────────────────

function EmailTab({ currentEmail, theme }: { currentEmail: string; theme: ModalTheme }) {
  const supabase = createClient()
  const { toast } = useToast()

  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newEmail === currentEmail) {
      setError('El nuevo correo debe ser diferente al actual.')
      return
    }

    try {
      setLoading(true)

      // Verificar contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password,
      })
      if (signInError) {
        setError('La contraseña es incorrecta.')
        return
      }

      // Solicitar cambio de email (Supabase envía email de confirmación)
      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail })
      if (updateError) throw updateError

      setSent(true)
      toast({
        title: 'Correo de confirmación enviado',
        description: `Revisa ${newEmail} para confirmar el cambio.`,
      })
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el correo.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-green-600" />
        </div>
        <div>
          <p className="font-black text-gray-900 tracking-tight">¡Verifica tu nuevo correo!</p>
          <p className="text-sm text-gray-500 mt-1">
            Enviamos un enlace de confirmación a <strong>{newEmail}</strong>.
            Haz click en el enlace para completar el cambio.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setSent(false); setNewEmail(''); setPassword('') }}
          className="rounded-xl text-xs font-bold"
        >
          Cambiar otro correo
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Correo actual</p>
        <p className="text-sm font-semibold text-gray-700">{currentEmail}</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nuevo correo</Label>
        <Input
          type="email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder="nuevo@correo.com"
          required
          className={`rounded-xl border-gray-200 ${theme.ring}`}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Confirma tu contraseña</Label>
        <div className="relative">
          <Input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Tu contraseña actual"
            required
            className={`pr-10 rounded-xl border-gray-200 ${theme.ring}`}
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Alert className={`rounded-xl py-2.5 ${theme.infoBg} ${theme.infoBorder}`}>
        <Info className={`w-4 h-4 ${theme.infoIcon}`} />
        <AlertDescription className={`text-xs ${theme.infoText}`}>
          Te enviaremos un email de verificación a la nueva dirección. El cambio aplicará solo al confirmar.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="rounded-xl py-2.5">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={loading || !newEmail || !password}
        className={`w-full ${theme.btnBg} ${theme.btnHover} text-white rounded-xl font-bold`}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Enviando…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Actualizar correo
          </span>
        )}
      </Button>
    </form>
  )
}

// ─── Tab: Eliminar Cuenta ───────────────────────────────────────────────────

function DeleteAccountTab({ businessName, onClose }: { businessName: string; onClose: () => void }) {
  const supabase = createClient()
  const { toast } = useToast()
  const { authState } = useAuth()
  const router = useRouter()

  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'warning' | 'confirm'>('warning')

  const isConfirmed = confirmText.trim() === businessName.trim()

  const handleDelete = async () => {
    if (!authState.user?.id || !isConfirmed) return

    try {
      setLoading(true)

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ user_id: authState.user.id }),
        }
      )

      const result = await res.json()

      if (!result.success) {
        throw new Error(result.error || 'No se pudo eliminar la cuenta.')
      }

      // Cerrar sesión localmente
      await supabase.auth.signOut()

      toast({
        title: 'Cuenta eliminada',
        description: 'Tu cuenta y todos tus datos han sido eliminados.',
      })

      onClose()
      router.push('/auth/business/login')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: err.message || 'Ocurrió un error. Inténtalo de nuevo.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Pantalla de advertencia inicial
  if (step === 'warning') {
    return (
      <div className="py-2 space-y-5">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="space-y-1">
            <p className="font-black text-red-800 tracking-tight text-sm">Esta acción es irreversible</p>
            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
              <li>Se eliminará el negocio y todos sus datos</li>
              <li>Se eliminarán todos los empleados y servicios</li>
              <li>Se eliminarán todos los clientes y citas</li>
              <li>No podrás recuperar esta información</li>
            </ul>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl font-bold"
          onClick={() => setStep('confirm')}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Entiendo, quiero eliminar mi cuenta
        </Button>
        <Button
          variant="ghost"
          className="w-full text-gray-500 hover:text-gray-700 rounded-xl font-bold"
          onClick={onClose}
        >
          Cancelar
        </Button>
      </div>
    )
  }

  // Paso de confirmación con nombre del negocio
  return (
    <div className="py-2 space-y-4">
      <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-xs text-red-700">
          Para confirmar, escribe exactamente el nombre de tu negocio:
        </p>
        <p className="text-sm font-black text-red-800 mt-1">"{businessName}"</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Nombre del negocio
        </Label>
        <Input
          type="text"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder={businessName}
          className="rounded-xl border-gray-200 focus-visible:ring-red-400"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <Button
        onClick={handleDelete}
        disabled={!isConfirmed || loading}
        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold disabled:opacity-40"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Eliminando…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Eliminar cuenta permanentemente
          </span>
        )}
      </Button>

      <Button
        variant="ghost"
        onClick={() => { setStep('warning'); setConfirmText('') }}
        className="w-full text-gray-500 hover:text-gray-700 rounded-xl text-xs font-bold"
      >
        ← Volver
      </Button>
    </div>
  )
}

// ─── Main Modal Component ───────────────────────────────────────────────────

export default function AccountManagementModal({
  open,
  onClose,
  businessName,
  variant = 'business',
}: AccountManagementModalProps) {
  const supabase = createClient()
  const { authState } = useAuth()

  const theme = buildTheme(variant)

  const [activeTab, setActiveTab] = useState<Tab>('password')
  const [isGoogleUser, setIsGoogleUser] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [detectingProvider, setDetectingProvider] = useState(true)

  // Detectar proveedor al abrir el modal
  useEffect(() => {
    if (!open) return

    const detect = async () => {
      setDetectingProvider(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setUserEmail(user.email || '')

        const providers = (user.identities || []).map(i => i.provider)
        setIsGoogleUser(providers.includes('google') && !providers.includes('email'))
      } catch {
        setIsGoogleUser(false)
      } finally {
        setDetectingProvider(false)
      }
    }

    detect()
  }, [open])

  const tabs: { id: Tab; icon: React.ElementType; label: string; danger?: boolean }[] = [
    { id: 'password', icon: Lock, label: 'Contraseña' },
    { id: 'email', icon: Mail, label: 'Correo' },
    { id: 'delete', icon: Trash2, label: 'Eliminar cuenta', danger: true },
  ]

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      {/*
        Mobile: ancho completo, esquinas superiores redondeadas (bottom-sheet feel)
        Desktop: cuadro centrado max-w-md con todas las esquinas redondeadas
      */}
      <DialogContent className="p-0 gap-0 overflow-hidden border-0 shadow-2xl max-h-[90dvh] flex flex-col w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${theme.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
              <ShieldCheck className={`w-5 h-5 ${theme.iconText}`} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-black tracking-tight text-gray-900">
                Gestionar Cuenta
              </DialogTitle>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                {userEmail || authState.user?.email || ''}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex items-center justify-center gap-1 px-4 pt-3 pb-1 overflow-x-auto scrollbar-hide flex-shrink-0 border-b border-gray-50">
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              id={tab.id}
              active={activeTab === tab.id}
              icon={tab.icon}
              label={tab.label}
              danger={tab.danger}
              onClick={() => setActiveTab(tab.id)}
              theme={theme}
            />
          ))}
        </div>

        {/* Tab Content — scrollable on small screens */}
        <div className="px-5 pb-6 pt-4 overflow-y-auto flex-1 min-h-[240px]">
          {detectingProvider ? (
            <div className="flex items-center justify-center h-40">
              <div className={`w-6 h-6 border-2 ${theme.spinnerBorder} ${theme.spinnerTop} rounded-full animate-spin`} />
            </div>
          ) : (
            <>
              {activeTab === 'password' && (
                isGoogleUser
                  ? <GoogleProviderNotice />
                  : <PasswordTab theme={theme} />
              )}
              {activeTab === 'email' && (
                isGoogleUser
                  ? <GoogleProviderNotice />
                  : <EmailTab currentEmail={userEmail} theme={theme} />
              )}
              {activeTab === 'delete' && (
                <DeleteAccountTab businessName={businessName} onClose={onClose} />
              )}
            </>
          )}
        </div>

        {/* Safe area spacer for iOS home indicator */}
        <div className="h-safe-area-inset-bottom sm:hidden flex-shrink-0" />
      </DialogContent>
    </Dialog>
  )
}
