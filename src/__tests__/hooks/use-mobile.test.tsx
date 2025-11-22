/**
 * Pruebas unitarias para useIsMobile hook
 *
 * Verifica la detección correcta del viewport móvil
 */

import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock de window.innerWidth
const setWindowWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

// Mock mejorado de matchMedia
const createMatchMedia = (matches: boolean) => {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []

  return jest.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      listeners.push(listener)
    }),
    removeEventListener: jest.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(listener)
      if (index > -1) listeners.splice(index, 1)
    }),
    dispatchEvent: jest.fn(),
    // Helper para simular cambios
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach(listener => {
        listener({ matches: newMatches } as MediaQueryListEvent)
      })
    },
  }))
}

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    // Restaurar valores originales
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    window.matchMedia = originalMatchMedia
  })

  it('debe retornar false en viewport de escritorio (>= 768px)', () => {
    setWindowWidth(1024)
    window.matchMedia = createMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('debe retornar true en viewport móvil (< 768px)', () => {
    setWindowWidth(375)
    window.matchMedia = createMatchMedia(true)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('debe retornar false exactamente en 768px (breakpoint)', () => {
    setWindowWidth(768)
    window.matchMedia = createMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('debe retornar true en 767px (justo bajo el breakpoint)', () => {
    setWindowWidth(767)
    window.matchMedia = createMatchMedia(true)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('debe manejar viewport de tablet', () => {
    setWindowWidth(1024)
    window.matchMedia = createMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('debe manejar viewport muy pequeño (320px)', () => {
    setWindowWidth(320)
    window.matchMedia = createMatchMedia(true)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('debe agregar event listener al montar', () => {
    setWindowWidth(1024)
    const mockMatchMedia = createMatchMedia(false)
    window.matchMedia = mockMatchMedia

    renderHook(() => useIsMobile())

    const mqlInstance = mockMatchMedia.mock.results[0].value
    expect(mqlInstance.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('debe remover event listener al desmontar', () => {
    setWindowWidth(1024)
    const mockMatchMedia = createMatchMedia(false)
    window.matchMedia = mockMatchMedia

    const { unmount } = renderHook(() => useIsMobile())
    unmount()

    const mqlInstance = mockMatchMedia.mock.results[0].value
    expect(mqlInstance.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
