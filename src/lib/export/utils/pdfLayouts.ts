/**
 * PDF Layouts - Utilidades para crear layouts profesionales en PDFs
 * Maneja páginas, headers, footers, secciones y elementos visuales
 */

import jsPDF from 'jspdf'
import { PDF_COLORS, FONT_SIZES, MARGINS, PAGE_LAYOUT, KPI_CARD } from './pdfStyles'

// ========================================
// PAGE MANAGEMENT
// ========================================

/**
 * Add a new page with standard margins
 */
export function addPage(doc: jsPDF): void {
  doc.addPage()
}

/**
 * Get current Y position with bottom margin check
 * Adds new page if needed
 */
export function checkPageBreak(doc: jsPDF, requiredSpace: number = 30): number {
  const currentY = doc.internal.pageSize.getHeight() - MARGINS.PAGE_BOTTOM
  const y = (doc as any).lastAutoTable?.finalY || MARGINS.PAGE_TOP

  if (y + requiredSpace > currentY) {
    doc.addPage()
    return MARGINS.PAGE_TOP
  }

  return y
}

/**
 * Get safe Y position (either last table end or top margin)
 */
export function getSafeY(doc: jsPDF): number {
  return (doc as any).lastAutoTable?.finalY || MARGINS.PAGE_TOP
}

// ========================================
// HEADERS & FOOTERS
// ========================================

/**
 * Add page footer with page number and generation date
 */
export function addFooter(doc: jsPDF, pageNumber: number, totalPages: number, date: string): void {
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(FONT_SIZES.SMALL)
  doc.setTextColor(...PDF_COLORS.GRAY_600)

  // Left: Generation date
  doc.text(`Generado: ${date}`, MARGINS.PAGE_LEFT, pageHeight - 10)

  // Center: TuTurno branding
  doc.text('TuTurno - Sistema de Gestión de Citas', pageWidth / 2, pageHeight - 10, {
    align: 'center',
  })

  // Right: Page number
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - MARGINS.PAGE_RIGHT, pageHeight - 10, {
    align: 'right',
  })
}

/**
 * Add all footers to document
 */
export function addAllFooters(doc: jsPDF, generatedDate: string): void {
  const totalPages = doc.getNumberOfPages()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(doc, i, totalPages, generatedDate)
  }
}

// ========================================
// SECTION HEADERS
// ========================================

/**
 * Add section header with orange accent
 */
export function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  // Orange accent bar
  doc.setFillColor(...PDF_COLORS.ORANGE_PRIMARY)
  doc.rect(MARGINS.PAGE_LEFT, y, 5, 8, 'F')

  // Section title
  doc.setFontSize(FONT_SIZES.HEADING)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_COLORS.GRAY_900)
  doc.text(title, MARGINS.PAGE_LEFT + 8, y + 6)

  return y + 8 + MARGINS.PARAGRAPH_SPACING
}

/**
 * Add subsection header
 */
export function addSubsectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(FONT_SIZES.SUBHEADING)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_COLORS.GRAY_700)
  doc.text(title, MARGINS.PAGE_LEFT, y)

  return y + MARGINS.LINE_SPACING
}

// ========================================
// KPI CARDS
// ========================================

/**
 * Render a single KPI card
 */
export function renderKPICard(
  doc: jsPDF,
  x: number,
  y: number,
  title: string,
  value: string,
  width: number = KPI_CARD.WIDTH
): void {
  // Background
  doc.setFillColor(...KPI_CARD.BACKGROUND)
  doc.setDrawColor(...KPI_CARD.BORDER_COLOR)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, width, KPI_CARD.HEIGHT, KPI_CARD.BORDER_RADIUS, KPI_CARD.BORDER_RADIUS, 'FD')

  // Title
  doc.setFontSize(KPI_CARD.TITLE_SIZE)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...KPI_CARD.TITLE_COLOR)
  doc.text(title, x + width / 2, y + KPI_CARD.PADDING + 3, { align: 'center' })

  // Value
  doc.setFontSize(KPI_CARD.VALUE_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...KPI_CARD.VALUE_COLOR)
  doc.text(value, x + width / 2, y + KPI_CARD.HEIGHT - KPI_CARD.PADDING - 2, { align: 'center' })
}

/**
 * Render a grid of KPI cards (2 columns)
 */
export function renderKPIGrid(
  doc: jsPDF,
  kpis: Array<{ title: string; value: string }>,
  startY: number
): number {
  const cardWidth = 80
  const cardSpacing = 10
  const rowSpacing = 10
  const cardsPerRow = 2

  let currentY = startY

  for (let i = 0; i < kpis.length; i++) {
    const row = Math.floor(i / cardsPerRow)
    const col = i % cardsPerRow
    const x = MARGINS.PAGE_LEFT + col * (cardWidth + cardSpacing)
    const y = currentY + row * (KPI_CARD.HEIGHT + rowSpacing)

    renderKPICard(doc, x, y, kpis[i].title, kpis[i].value, cardWidth)
  }

  // Calculate total height used
  const totalRows = Math.ceil(kpis.length / cardsPerRow)
  return currentY + totalRows * (KPI_CARD.HEIGHT + rowSpacing)
}

// ========================================
// DIVIDERS
// ========================================

/**
 * Add horizontal divider line
 */
export function addDivider(doc: jsPDF, y: number): number {
  doc.setDrawColor(...PDF_COLORS.GRAY_200)
  doc.setLineWidth(0.5)
  doc.line(MARGINS.PAGE_LEFT, y, PAGE_LAYOUT.WIDTH - MARGINS.PAGE_RIGHT, y)

  return y + MARGINS.LINE_SPACING
}

// ========================================
// TEXT UTILITIES
// ========================================

/**
 * Add wrapped text (multi-line)
 */
export function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number = FONT_SIZES.BODY
): number {
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_COLORS.GRAY_900)

  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)

  return y + lines.length * (fontSize * 0.35) + MARGINS.LINE_SPACING
}

/**
 * Add bullet point list
 */
export function addBulletList(
  doc: jsPDF,
  items: string[],
  x: number,
  y: number,
  maxWidth: number
): number {
  doc.setFontSize(FONT_SIZES.BODY)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_COLORS.GRAY_900)

  let currentY = y

  items.forEach((item) => {
    // Bullet point
    doc.setFillColor(...PDF_COLORS.ORANGE_PRIMARY)
    doc.circle(x, currentY - 1, 1, 'F')

    // Text
    const lines = doc.splitTextToSize(item, maxWidth - 5)
    doc.text(lines, x + 4, currentY)
    currentY += lines.length * (FONT_SIZES.BODY * 0.35) + MARGINS.LINE_SPACING
  })

  return currentY
}

// ========================================
// LOGO HANDLING
// ========================================

/**
 * Add logo image to PDF
 */
export function addLogo(
  doc: jsPDF,
  logoBase64: string,
  x: number,
  y: number,
  size: number = PAGE_LAYOUT.LOGO_SIZE
): void {
  try {
    doc.addImage(logoBase64, 'PNG', x, y, size, size)
  } catch (error) {
    console.error('Error adding logo to PDF:', error)
    // Fallback: draw placeholder rectangle
    doc.setFillColor(...PDF_COLORS.ORANGE_LIGHT)
    doc.rect(x, y, size, size, 'F')
  }
}

// ========================================
// PROGRESS BARS
// ========================================

/**
 * Render a horizontal progress bar
 */
export function renderProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  percentage: number,
  color: [number, number, number] = PDF_COLORS.ORANGE_PRIMARY
): void {
  const height = 5

  // Background
  doc.setFillColor(...PDF_COLORS.GRAY_200)
  doc.roundedRect(x, y, width, height, 2, 2, 'F')

  // Progress
  const progressWidth = (width * percentage) / 100
  doc.setFillColor(...color)
  doc.roundedRect(x, y, progressWidth, height, 2, 2, 'F')
}
