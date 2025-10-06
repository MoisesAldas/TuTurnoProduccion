export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  
  return new Date(date).toLocaleDateString('es-ES', { ...defaultOptions, ...options })
}

export const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export const formatPhone = (phone: string) => {
  // Remover todos los caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '')
  
  // Formatear como (XXX) XXX-XXXX si tiene 10 dígitos
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  
  return phone
}

export const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount)
}

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}