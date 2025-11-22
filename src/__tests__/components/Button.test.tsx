/**
 * Pruebas unitarias para el componente Button
 *
 * Verifica variantes, tamaños, estados y comportamientos
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  describe('Renderizado básico', () => {
    it('debe renderizar correctamente con texto', () => {
      render(<Button>Click me</Button>)

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Click me')).toBeInTheDocument()
    })

    it('debe renderizar como elemento button', () => {
      render(<Button>Submit</Button>)

      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('debe permitir cambiar el tipo', () => {
      render(<Button type="submit">Submit</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })
  })

  describe('Variantes', () => {
    it('debe aplicar la variante default por defecto', () => {
      render(<Button>Default</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
    })

    it('debe aplicar la variante destructive', () => {
      render(<Button variant="destructive">Delete</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
    })

    it('debe aplicar la variante outline', () => {
      render(<Button variant="outline">Outline</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('bg-background')
    })

    it('debe aplicar la variante secondary', () => {
      render(<Button variant="secondary">Secondary</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary')
    })

    it('debe aplicar la variante ghost', () => {
      render(<Button variant="ghost">Ghost</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('debe aplicar la variante link', () => {
      render(<Button variant="link">Link</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('underline-offset-4')
    })
  })

  describe('Tamaños', () => {
    it('debe aplicar el tamaño default por defecto', () => {
      render(<Button>Default Size</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9')
      expect(button).toHaveClass('px-4')
    })

    it('debe aplicar el tamaño sm', () => {
      render(<Button size="sm">Small</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-8')
      expect(button).toHaveClass('px-3')
    })

    it('debe aplicar el tamaño lg', () => {
      render(<Button size="lg">Large</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10')
      expect(button).toHaveClass('px-8')
    })

    it('debe aplicar el tamaño icon', () => {
      render(<Button size="icon">🔍</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9')
      expect(button).toHaveClass('w-9')
    })
  })

  describe('Estados', () => {
    it('debe estar habilitado por defecto', () => {
      render(<Button>Enabled</Button>)

      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    it('debe poder ser deshabilitado', () => {
      render(<Button disabled>Disabled</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50')
    })

    it('no debe ejecutar onClick cuando está deshabilitado', () => {
      const handleClick = jest.fn()
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Eventos', () => {
    it('debe ejecutar onClick al hacer clic', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('debe pasar el evento al handler', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click me</Button>)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({
        type: 'click',
      }))
    })
  })

  describe('Clases personalizadas', () => {
    it('debe permitir agregar clases adicionales', () => {
      render(<Button className="custom-class">Custom</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('debe mantener las clases base con clases adicionales', () => {
      render(<Button className="custom-class">Custom</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('inline-flex')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('Accesibilidad', () => {
    it('debe ser accesible por teclado', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Accessible</Button>)

      const button = screen.getByRole('button')
      button.focus()

      expect(button).toHaveFocus()
    })

    it('debe tener clases de focus visibles', () => {
      render(<Button>Focusable</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:outline-none')
      expect(button).toHaveClass('focus-visible:ring-1')
    })
  })

  describe('Renderizado con children', () => {
    it('debe renderizar children de texto', () => {
      render(<Button>Text Content</Button>)

      expect(screen.getByText('Text Content')).toBeInTheDocument()
    })

    it('debe renderizar children de elementos', () => {
      render(
        <Button>
          <span data-testid="icon">🔥</span>
          With Icon
        </Button>
      )

      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('With Icon')).toBeInTheDocument()
    })
  })
})
