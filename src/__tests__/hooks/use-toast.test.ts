/**
 * Pruebas unitarias para useToast hook y reducer
 *
 * Verifica el sistema de notificaciones toast
 */

import { reducer } from '@/hooks/use-toast'

// Tipo para los tests
type ToasterToast = {
  id: string
  title?: string
  description?: string
  open?: boolean
}

type State = {
  toasts: ToasterToast[]
}

describe('Toast Reducer', () => {
  const initialState: State = { toasts: [] }

  describe('ADD_TOAST', () => {
    it('debe agregar un toast al estado', () => {
      const toast: ToasterToast = {
        id: '1',
        title: 'Test Toast',
        description: 'Test description',
      }

      const newState = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: toast as any,
      })

      expect(newState.toasts).toHaveLength(1)
      expect(newState.toasts[0].id).toBe('1')
      expect(newState.toasts[0].title).toBe('Test Toast')
    })

    it('debe agregar nuevos toasts al inicio (pero TOAST_LIMIT=1 solo mantiene uno)', () => {
      // Nota: TOAST_LIMIT = 1, así que al agregar un nuevo toast,
      // el array se limita a 1 elemento
      const state: State = {
        toasts: [] as any,
      }

      const newState = reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: '1', title: 'First' } as any,
      })

      expect(newState.toasts[0].id).toBe('1')
      expect(newState.toasts).toHaveLength(1)
    })

    it('debe limitar el número de toasts (TOAST_LIMIT = 1)', () => {
      const state: State = {
        toasts: [{ id: '1', title: 'First' }] as any,
      }

      const newState = reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: '2', title: 'Second' } as any,
      })

      // Con TOAST_LIMIT = 1, solo debe haber 1 toast
      expect(newState.toasts).toHaveLength(1)
      expect(newState.toasts[0].id).toBe('2')
    })
  })

  describe('UPDATE_TOAST', () => {
    it('debe actualizar un toast existente', () => {
      const state: State = {
        toasts: [{ id: '1', title: 'Original', description: 'Desc' }] as any,
      }

      const newState = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      })

      expect(newState.toasts[0].title).toBe('Updated')
      expect(newState.toasts[0].description).toBe('Desc') // Mantiene otros campos
    })

    it('no debe modificar toasts con diferente id', () => {
      const state: State = {
        toasts: [
          { id: '1', title: 'Toast 1' },
          { id: '2', title: 'Toast 2' },
        ] as any,
      }

      const newState = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      })

      expect(newState.toasts[0].title).toBe('Updated')
      expect(newState.toasts[1].title).toBe('Toast 2') // Sin cambios
    })

    it('no debe hacer nada si el id no existe', () => {
      const state: State = {
        toasts: [{ id: '1', title: 'Toast 1' }] as any,
      }

      const newState = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: 'nonexistent', title: 'Updated' },
      })

      expect(newState.toasts[0].title).toBe('Toast 1')
    })
  })

  describe('DISMISS_TOAST', () => {
    it('debe marcar un toast específico como cerrado', () => {
      const state: State = {
        toasts: [{ id: '1', title: 'Toast', open: true }] as any,
      }

      const newState = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      })

      expect(newState.toasts[0].open).toBe(false)
    })

    it('debe cerrar todos los toasts si no se especifica id', () => {
      const state: State = {
        toasts: [
          { id: '1', open: true },
          { id: '2', open: true },
        ] as any,
      }

      const newState = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: undefined,
      })

      expect(newState.toasts[0].open).toBe(false)
      expect(newState.toasts[1].open).toBe(false)
    })
  })

  describe('REMOVE_TOAST', () => {
    it('debe eliminar un toast específico', () => {
      const state: State = {
        toasts: [
          { id: '1', title: 'Toast 1' },
          { id: '2', title: 'Toast 2' },
        ] as any,
      }

      const newState = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      })

      expect(newState.toasts).toHaveLength(1)
      expect(newState.toasts[0].id).toBe('2')
    })

    it('debe eliminar todos los toasts si no se especifica id', () => {
      const state: State = {
        toasts: [
          { id: '1' },
          { id: '2' },
        ] as any,
      }

      const newState = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: undefined,
      })

      expect(newState.toasts).toHaveLength(0)
    })

    it('no debe hacer nada si el id no existe', () => {
      const state: State = {
        toasts: [{ id: '1' }] as any,
      }

      const newState = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: 'nonexistent',
      })

      expect(newState.toasts).toHaveLength(1)
    })
  })

  describe('Inmutabilidad', () => {
    it('no debe mutar el estado original en ADD_TOAST', () => {
      const state: State = { toasts: [] }
      const stateCopy = { ...state, toasts: [...state.toasts] }

      reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: '1' } as any,
      })

      expect(state).toEqual(stateCopy)
    })

    it('no debe mutar el estado original en UPDATE_TOAST', () => {
      const state: State = { toasts: [{ id: '1', title: 'Original' }] as any }
      const originalTitle = state.toasts[0].title

      reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' },
      })

      expect(state.toasts[0].title).toBe(originalTitle)
    })

    it('no debe mutar el estado original en REMOVE_TOAST', () => {
      const state: State = { toasts: [{ id: '1' }] as any }
      const originalLength = state.toasts.length

      reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      })

      expect(state.toasts).toHaveLength(originalLength)
    })
  })
})
