/**
 * usePDFPreview Hook
 * Custom hook for managing PDF preview state and interactions
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import jsPDF from 'jspdf'
import { getPDFPageCount } from '@/lib/export/utils/pdfPreview'

interface UsePDFPreviewReturn {
  currentPage: number
  totalPages: number
  zoom: number
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  zoomIn: () => void
  zoomOut: () => void
  setZoom: (zoom: number) => void
  isFirstPage: boolean
  isLastPage: boolean
  canZoomIn: boolean
  canZoomOut: boolean
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.0
const ZOOM_STEP = 0.25

export const usePDFPreview = (pdfDocument: jsPDF | null): UsePDFPreviewReturn => {
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoomState] = useState(1)

  // Calculate total pages
  const totalPages = useMemo(() => {
    return pdfDocument ? getPDFPageCount(pdfDocument) : 0
  }, [pdfDocument])

  // Calculate boundary conditions
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages
  const canZoomIn = zoom < MAX_ZOOM
  const canZoomOut = zoom > MIN_ZOOM

  // Navigate to specific page
  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return
      setCurrentPage(page)
    },
    [totalPages]
  )

  // Navigate to next page
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1)
    }
  }, [currentPage, totalPages])

  // Navigate to previous page
  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }, [currentPage])

  // Zoom in
  const zoomIn = useCallback(() => {
    setZoomState((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM))
  }, [])

  // Zoom out
  const zoomOut = useCallback(() => {
    setZoomState((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM))
  }, [])

  // Set specific zoom level
  const setZoom = useCallback((newZoom: number) => {
    setZoomState(Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM)))
  }, [])

  // Reset to page 1 when document changes
  useEffect(() => {
    if (pdfDocument) {
      setCurrentPage(1)
      setZoomState(1)
    }
  }, [pdfDocument])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          previousPage()
          break
        case 'ArrowRight':
          e.preventDefault()
          nextPage()
          break
        case '+':
        case '=':
          e.preventDefault()
          zoomIn()
          break
        case '-':
        case '_':
          e.preventDefault()
          zoomOut()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previousPage, nextPage, zoomIn, zoomOut])

  return {
    currentPage,
    totalPages,
    zoom,
    goToPage,
    nextPage,
    previousPage,
    zoomIn,
    zoomOut,
    setZoom,
    isFirstPage,
    isLastPage,
    canZoomIn,
    canZoomOut,
  }
}

