/**
 * Pruebas unitarias para el componente Badge
 *
 * Verifica variantes y estilos del badge
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge Component', () => {
  describe('Renderizado básico', () => {
    it('debe renderizar correctamente con texto', () => {
      render(<Badge>Status</Badge>)

      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('debe renderizar como un div', () => {
      render(<Badge data-testid="badge">Test</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge.tagName).toBe('DIV')
    })
  })

  describe('Variantes', () => {
    it('debe aplicar la variante default por defecto', () => {
      render(<Badge data-testid="badge">Default</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-primary')
      expect(badge).toHaveClass('text-primary-foreground')
    })

    it('debe aplicar la variante secondary', () => {
      render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-secondary')
      expect(badge).toHaveClass('text-secondary-foreground')
    })

    it('debe aplicar la variante destructive', () => {
      render(<Badge variant="destructive" data-testid="badge">Error</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-destructive')
      expect(badge).toHaveClass('text-destructive-foreground')
    })

    it('debe aplicar la variante outline', () => {
      render(<Badge variant="outline" data-testid="badge">Outline</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('text-foreground')
    })
  })

  describe('Estilos base', () => {
    it('debe tener estilos inline-flex', () => {
      render(<Badge data-testid="badge">Inline</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('inline-flex')
      expect(badge).toHaveClass('items-center')
    })

    it('debe tener bordes redondeados', () => {
      render(<Badge data-testid="badge">Rounded</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('rounded-md')
    })

    it('debe tener padding correcto', () => {
      render(<Badge data-testid="badge">Padded</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('px-2.5')
      expect(badge).toHaveClass('py-0.5')
    })

    it('debe tener tipografía correcta', () => {
      render(<Badge data-testid="badge">Typography</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('font-semibold')
    })
  })

  describe('Clases personalizadas', () => {
    it('debe permitir agregar clases adicionales', () => {
      render(<Badge className="custom-class" data-testid="badge">Custom</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('custom-class')
    })

    it('debe mantener las clases base con clases adicionales', () => {
      render(<Badge className="custom-class" data-testid="badge">Custom</Badge>)

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('inline-flex')
      expect(badge).toHaveClass('custom-class')
    })
  })

  describe('Props adicionales', () => {
    it('debe pasar props adicionales al elemento', () => {
      render(
        <Badge data-testid="badge" aria-label="Status badge">
          Active
        </Badge>
      )

      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('aria-label', 'Status badge')
    })
  })

  describe('Casos de uso comunes', () => {
    it('debe funcionar para estados de cita', () => {
      const { rerender } = render(<Badge data-testid="badge">Pendiente</Badge>)
      expect(screen.getByText('Pendiente')).toBeInTheDocument()

      rerender(<Badge variant="secondary" data-testid="badge">Confirmada</Badge>)
      expect(screen.getByText('Confirmada')).toBeInTheDocument()

      rerender(<Badge variant="destructive" data-testid="badge">Cancelada</Badge>)
      expect(screen.getByText('Cancelada')).toBeInTheDocument()
    })

    it('debe funcionar para etiquetas de servicios', () => {
      render(<Badge variant="outline">30 min</Badge>)

      expect(screen.getByText('30 min')).toBeInTheDocument()
    })
  })
})
