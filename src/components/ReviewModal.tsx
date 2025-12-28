'use client'

import { useState } from 'react'
import { Star, MessageSquare, Send, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabaseClient'
import StarRating from './StarRating'

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  appointmentId: string
  businessId: string
  businessName: string
  clientId: string
  onReviewSubmitted?: () => void
}

/**
 * ReviewModal Component
 *
 * Modal dialog for clients to leave reviews for completed appointments
 * Includes star rating (1-5) and optional comment
 *
 * @param isOpen - Controls modal visibility
 * @param onClose - Callback when modal is closed
 * @param appointmentId - ID of the appointment being reviewed
 * @param businessId - ID of the business being reviewed
 * @param businessName - Display name of the business
 * @param clientId - ID of the client leaving the review
 * @param onReviewSubmitted - Optional callback after successful submission
 */
export default function ReviewModal({
  isOpen,
  onClose,
  appointmentId,
  businessId,
  businessName,
  clientId,
  onReviewSubmitted
}: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async () => {
    // Validation
    if (rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Calificación requerida',
        description: 'Por favor selecciona una calificación con estrellas.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create review
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          business_id: businessId,
          client_id: clientId,
          appointment_id: appointmentId,
          rating: rating,
          comment: comment.trim() || null
        })
        .select()
        .single()

      if (error) {
        // Check for specific errors
        if (error.code === '23505') {
          // Unique constraint violation - review already exists
          toast({
            variant: 'destructive',
            title: 'Reseña ya existe',
            description: 'Ya has dejado una reseña para esta cita.',
          })
        } else {
          throw error
        }
      } else {
        // Success
        console.log('✅ Review created successfully:', data)
        toast({
          title: '¡Gracias por tu reseña!',
          description: 'Tu opinión ha sido registrada exitosamente.',
          className: 'bg-emerald-50 border-emerald-200',
        })

        // Reset form
        setRating(0)
        setComment('')

        // Call callback if provided
        if (onReviewSubmitted) {
          console.log('📞 Calling onReviewSubmitted callback...')
          onReviewSubmitted()
        }

        // Close modal
        onClose()
      }
    } catch (error: any) {
      console.error('Error creating review:', error)
      toast({
        variant: 'destructive',
        title: 'Error al guardar reseña',
        description: error.message || 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(0)
      setComment('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Star className="w-6 h-6 text-slate-700" />
            <span className="text-slate-900 font-bold">
              Deja tu Reseña
            </span>
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Comparte tu experiencia en <strong className="text-gray-900">{businessName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating Section */}
          <div className="space-y-3">
            <Label htmlFor="rating" className="text-base font-semibold text-gray-900">
              Calificación <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                size="lg"
              />
              {rating > 0 && (
                <span className="text-sm font-medium text-gray-700 ml-2">
                  {rating === 1 && '😞 Muy mala'}
                  {rating === 2 && '😕 Mala'}
                  {rating === 3 && '😐 Regular'}
                  {rating === 4 && '😊 Buena'}
                  {rating === 5 && '🤩 Excelente'}
                </span>
              )}
            </div>
          </div>

          {/* Comment Section */}
          <div className="space-y-3">
            <Label htmlFor="comment" className="text-base font-semibold text-gray-900">
              Comentario <span className="text-gray-500 text-sm font-normal">(opcional)</span>
            </Label>
            <div className="relative">
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Cuéntanos sobre tu experiencia..."
                className="min-h-[120px] resize-none focus:border-slate-500 focus:ring-slate-500"
                maxLength={500}
                disabled={isSubmitting}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {comment.length}/500
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <Alert className="bg-blue-50 border-blue-200">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-sm">
              Tu reseña será visible públicamente en el perfil del negocio y ayudará a otros clientes a tomar decisiones informadas.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Reseña
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
