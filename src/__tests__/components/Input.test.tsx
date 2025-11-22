/**
 * Pruebas unitarias para el componente Input
 *
 * Verifica tipos, estados y comportamientos del input
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  describe('Renderizado básico', () => {
    it('debe renderizar correctamente', () => {
      render(<Input data-testid="input" />)

      expect(screen.getByTestId('input')).toBeInTheDocument()
    })

    it('debe ser un elemento input', () => {
      render(<Input data-testid="input" />)

      const input = screen.getByTestId('input')
      expect(input.tagName).toBe('INPUT')
    })

    it('debe funcionar sin type explícito (text por defecto del navegador)', () => {
      render(<Input data-testid="input" />)

      const input = screen.getByTestId('input')
      // El navegador trata inputs sin type como text por defecto
      expect(input.tagName).toBe('INPUT')
    })
  })

  describe('Tipos de input', () => {
    it('debe soportar type="text"', () => {
      render(<Input type="text" data-testid="input" />)

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'text')
    })

    it('debe soportar type="email"', () => {
      render(<Input type="email" data-testid="input" />)

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'email')
    })

    it('debe soportar type="password"', () => {
      render(<Input type="password" data-testid="input" />)

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'password')
    })

    it('debe soportar type="number"', () => {
      render(<Input type="number" data-testid="input" />)

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'number')
    })

    it('debe soportar type="tel"', () => {
      render(<Input type="tel" data-testid="input" />)

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'tel')
    })

    it('debe soportar type="search"', () => {
      render(<Input type="search" data-testid="input" />)

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'search')
    })
  })

  describe('Props de input', () => {
    it('debe aceptar placeholder', () => {
      render(<Input placeholder="Enter your name" data-testid="input" />)

      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
    })

    it('debe aceptar value controlado', () => {
      render(<Input value="test value" onChange={() => {}} data-testid="input" />)

      expect(screen.getByTestId('input')).toHaveValue('test value')
    })

    it('debe aceptar defaultValue', () => {
      render(<Input defaultValue="default" data-testid="input" />)

      expect(screen.getByTestId('input')).toHaveValue('default')
    })

    it('debe aceptar name', () => {
      render(<Input name="email" data-testid="input" />)

      expect(screen.getByTestId('input')).toHaveAttribute('name', 'email')
    })

    it('debe aceptar id', () => {
      render(<Input id="email-input" data-testid="input" />)

      expect(screen.getByTestId('input')).toHaveAttribute('id', 'email-input')
    })
  })

  describe('Estados', () => {
    it('debe poder ser deshabilitado', () => {
      render(<Input disabled data-testid="input" />)

      const input = screen.getByTestId('input')
      expect(input).toBeDisabled()
      expect(input).toHaveClass('disabled:opacity-50')
    })

    it('debe poder ser readonly', () => {
      render(<Input readOnly value="readonly" data-testid="input" />)

      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('readonly')
    })

    it('debe poder ser required', () => {
      render(<Input required data-testid="input" />)

      expect(screen.getByTestId('input')).toBeRequired()
    })
  })

  describe('Eventos', () => {
    it('debe ejecutar onChange al escribir', async () => {
      const handleChange = jest.fn()
      render(<Input onChange={handleChange} data-testid="input" />)

      const input = screen.getByTestId('input')
      await userEvent.type(input, 'hello')

      expect(handleChange).toHaveBeenCalled()
    })

    it('debe actualizar el valor al escribir', async () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('')
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="input"
          />
        )
      }

      render(<TestComponent />)
      const input = screen.getByTestId('input')

      await userEvent.type(input, 'hello')

      expect(input).toHaveValue('hello')
    })

    it('debe ejecutar onFocus al enfocar', () => {
      const handleFocus = jest.fn()
      render(<Input onFocus={handleFocus} data-testid="input" />)

      const input = screen.getByTestId('input')
      fireEvent.focus(input)

      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('debe ejecutar onBlur al perder foco', () => {
      const handleBlur = jest.fn()
      render(<Input onBlur={handleBlur} data-testid="input" />)

      const input = screen.getByTestId('input')
      fireEvent.focus(input)
      fireEvent.blur(input)

      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })

  describe('Estilos', () => {
    it('debe tener estilos base correctos', () => {
      render(<Input data-testid="input" />)

      const input = screen.getByTestId('input')
      expect(input).toHaveClass('flex')
      expect(input).toHaveClass('h-9')
      expect(input).toHaveClass('w-full')
      expect(input).toHaveClass('rounded-md')
    })

    it('debe tener estilos de borde', () => {
      render(<Input data-testid="input" />)

      const input = screen.getByTestId('input')
      expect(input).toHaveClass('border')
      expect(input).toHaveClass('border-input')
    })

    it('debe tener estilos de focus', () => {
      render(<Input data-testid="input" />)

      const input = screen.getByTestId('input')
      expect(input).toHaveClass('focus-visible:outline-none')
      expect(input).toHaveClass('focus-visible:ring-1')
    })
  })

  describe('Clases personalizadas', () => {
    it('debe permitir agregar clases adicionales', () => {
      render(<Input className="custom-class" data-testid="input" />)

      const input = screen.getByTestId('input')
      expect(input).toHaveClass('custom-class')
    })
  })

  describe('Accesibilidad', () => {
    it('debe ser accesible con aria-label', () => {
      render(<Input aria-label="Email address" data-testid="input" />)

      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    })

    it('debe soportar aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="help-text" data-testid="input" />
          <span id="help-text">Enter a valid email</span>
        </>
      )

      expect(screen.getByTestId('input')).toHaveAttribute('aria-describedby', 'help-text')
    })
  })

  describe('Casos de uso del sistema TuTurno', () => {
    it('debe funcionar para campo de nombre de cliente', async () => {
      render(
        <Input
          type="text"
          placeholder="Nombre del cliente"
          name="clientName"
          data-testid="input"
        />
      )

      const input = screen.getByTestId('input')
      await userEvent.type(input, 'Juan Pérez')

      expect(input).toHaveValue('Juan Pérez')
    })

    it('debe funcionar para campo de teléfono', async () => {
      render(
        <Input
          type="tel"
          placeholder="+593 999 999 999"
          name="phone"
          data-testid="input"
        />
      )

      const input = screen.getByTestId('input')
      await userEvent.type(input, '+593999123456')

      expect(input).toHaveValue('+593999123456')
    })

    it('debe funcionar para campo de precio', async () => {
      render(
        <Input
          type="number"
          placeholder="0.00"
          name="price"
          min="0"
          step="0.01"
          data-testid="input"
        />
      )

      const input = screen.getByTestId('input')
      await userEvent.type(input, '25.50')

      expect(input).toHaveValue(25.5)
    })

    it('debe funcionar para campo de búsqueda', async () => {
      render(
        <Input
          type="search"
          placeholder="Buscar clientes..."
          name="search"
          data-testid="input"
        />
      )

      const input = screen.getByTestId('input')
      await userEvent.type(input, 'María')

      expect(input).toHaveValue('María')
    })
  })
})
