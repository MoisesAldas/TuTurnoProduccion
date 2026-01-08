/**
 * PDF Styles - Constantes de estilo para exportación PDF
 * Define colores, fuentes y layouts profesionales para reportes gerenciales
 */

// ========================================
// COLORES TUTURNO (RGB for jsPDF)
// ========================================

export const PDF_COLORS = {
  // Brand colors
  ORANGE_PRIMARY: [234, 88, 12] as [number, number, number], // #ea580c
  ORANGE_LIGHT: [254, 215, 170] as [number, number, number], // #fed7aa
  ORANGE_DARK: [194, 65, 12] as [number, number, number], // #c2410c

  // UI colors
  WHITE: [255, 255, 255] as [number, number, number],
  BLACK: [0, 0, 0] as [number, number, number],
  GRAY_50: [249, 250, 251] as [number, number, number],
  GRAY_100: [243, 244, 246] as [number, number, number],
  GRAY_200: [229, 231, 235] as [number, number, number],
  GRAY_600: [75, 85, 99] as [number, number, number],
  GRAY_700: [55, 65, 81] as [number, number, number],
  GRAY_900: [17, 24, 39] as [number, number, number],

  // Data visualization
  GREEN: [16, 185, 129] as [number, number, number], // Success
  RED: [239, 68, 68] as [number, number, number], // Error
  BLUE: [59, 130, 246] as [number, number, number], // Info
  YELLOW: [245, 158, 11] as [number, number, number], // Warning
  PURPLE: [139, 92, 246] as [number, number, number], // Accent
} as const;

// ========================================
// FONT SIZES
// ========================================

export const FONT_SIZES = {
  TITLE: 24,
  SUBTITLE: 18,
  HEADING: 16,
  SUBHEADING: 14,
  BODY: 12,
  BODY_LARGE: 13,
  SMALL: 10,
  TINY: 8,
} as const;

// ========================================
// MARGINS & SPACING
// ========================================

export const MARGINS = {
  PAGE_TOP: 20,
  PAGE_BOTTOM: 20,
  PAGE_LEFT: 20,
  PAGE_RIGHT: 20,
  SECTION_SPACING: 15,
  PARAGRAPH_SPACING: 8,
  LINE_SPACING: 5,
};

// ========================================
// PAGE LAYOUT
// ========================================

export const PAGE_LAYOUT = {
  WIDTH: 210, // A4 width in mm
  HEIGHT: 297, // A4 height in mm
  CONTENT_WIDTH: 170, // 210 - 20 - 20 (margins)
  LOGO_SIZE: 40, // mm
  HEADER_HEIGHT: 50,
  FOOTER_HEIGHT: 15,
} as const;

// ========================================
// TABLE STYLES (for autoTable)
// ========================================

export const TABLE_STYLES = {
  HEADER: {
    fillColor: PDF_COLORS.ORANGE_PRIMARY,
    textColor: PDF_COLORS.WHITE,
    fontStyle: "bold",
    fontSize: FONT_SIZES.SMALL,
    halign: "center" as const,
    valign: "middle" as const,
    cellPadding: 5,
  },
  BODY: {
    fontSize: FONT_SIZES.SMALL,
    textColor: PDF_COLORS.GRAY_900,
    cellPadding: 4,
  },
  ALTERNATING_ROW: {
    fillColor: PDF_COLORS.GRAY_50,
  },
  BORDER: {
    lineColor: PDF_COLORS.GRAY_200,
    lineWidth: 0.1,
  },
} as const;

// ========================================
// KPI CARD STYLES
// ========================================

export const KPI_CARD = {
  WIDTH: 80,
  HEIGHT: 30,
  PADDING: 5,
  BORDER_RADIUS: 2,
  BORDER_COLOR: PDF_COLORS.GRAY_200,
  BACKGROUND: PDF_COLORS.GRAY_50,
  TITLE_SIZE: FONT_SIZES.SMALL,
  VALUE_SIZE: FONT_SIZES.HEADING,
  TITLE_COLOR: PDF_COLORS.GRAY_600,
  VALUE_COLOR: PDF_COLORS.GRAY_900,
} as const;

// ========================================
// CHART STYLES
// ========================================

export const CHART_STYLES = {
  BAR_HEIGHT: 15,
  BAR_SPACING: 5,
  MAX_BAR_WIDTH: 120,
  LABEL_WIDTH: 50,
  VALUE_WIDTH: 40,
  COLORS: [
    PDF_COLORS.ORANGE_PRIMARY,
    PDF_COLORS.BLUE,
    PDF_COLORS.GREEN,
    PDF_COLORS.PURPLE,
    PDF_COLORS.YELLOW,
  ],
} as const;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Convert RGB array to hex string for compatibility
 */
export function rgbToHex(rgb: [number, number, number]): string {
  return "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Lighten a color by a percentage (for hover effects, etc.)
 */
export function lightenColor(
  rgb: [number, number, number],
  percent: number
): [number, number, number] {
  return rgb.map((c) =>
    Math.min(255, Math.floor(c + (255 - c) * (percent / 100)))
  ) as [number, number, number];
}

/**
 * Format currency for display in PDF
 */
export function formatPDFCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format percentage for display in PDF
 */
export function formatPDFPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format integer for display in PDF
 */
export function formatPDFInteger(value: number): string {
  return value.toLocaleString("en-US");
}
