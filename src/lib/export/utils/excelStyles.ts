/**
 * Excel Styles - Diseño Profesional Gerencial
 * Basado en template de informe profesional
 */

import type { Fill, Borders, Font, Alignment } from "exceljs";

// ========================================
// COLORES - DISEÑO PROFESIONAL
// ========================================

export const COLORS = {
  // Main colors
  BLACK: "FF000000",
  WHITE: "FFFFFFFF",

  // Grays
  GRAY_100: "FFF3F4F6",
  GRAY_200: "FFE5E7EB",
  GRAY_300: "FFD1D5DB",
  GRAY_700: "FF374151",
  GRAY_900: "FF1F2937",

  // Brand accent
  ORANGE_600: "FFEA580C",

  // Status
  GREEN: "FF10B981",
  RED: "FFEF4444",
} as const;

// ========================================
// FILLS (BACKGROUNDS)
// ========================================

export const FILLS: Record<string, Fill> = {
  // Headers principales (negro)
  HEADER_BLACK: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.BLACK },
  },

  // Headers de tabla (gris claro)
  TABLE_HEADER: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.GRAY_100 },
  },

  // Datos (blanco)
  DATA_WHITE: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.WHITE },
  },

  // Info header (gris medio)
  INFO_HEADER: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.GRAY_200 },
  },
};

// ========================================
// FONTS
// ========================================

export const FONTS: Record<string, Partial<Font>> = {
  // Header principal (negro)
  MAIN_HEADER: {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: COLORS.WHITE },
  },

  // Headers de sección (negro)
  SECTION_HEADER: {
    name: "Arial",
    size: 14,
    bold: true,
    color: { argb: COLORS.WHITE },
  },

  // Headers de tabla (gris)
  TABLE_HEADER: {
    name: "Arial",
    size: 11,
    bold: true,
    color: { argb: COLORS.GRAY_900 },
  },

  // Headers de info
  INFO_HEADER: {
    name: "Arial",
    size: 10,
    bold: true,
    color: { argb: COLORS.BLACK },
  },

  // Datos
  DATA: {
    name: "Arial",
    size: 10,
    color: { argb: COLORS.GRAY_700 },
  },

  DATA_BOLD: {
    name: "Arial",
    size: 10,
    bold: true,
    color: { argb: COLORS.GRAY_900 },
  },

  DATA_NUMBER: {
    name: "Arial",
    size: 10,
    color: { argb: COLORS.GRAY_900 },
  },
};

// ========================================
// BORDERS
// ========================================

const THIN_BORDER = {
  style: "thin" as const,
  color: { argb: COLORS.GRAY_300 },
};
const MEDIUM_BORDER = {
  style: "medium" as const,
  color: { argb: COLORS.GRAY_900 },
};

export const BORDERS: Record<string, Partial<Borders>> = {
  ALL_THIN: {
    top: THIN_BORDER,
    bottom: THIN_BORDER,
    left: THIN_BORDER,
    right: THIN_BORDER,
  },
  ALL_MEDIUM: {
    top: MEDIUM_BORDER,
    bottom: MEDIUM_BORDER,
    left: MEDIUM_BORDER,
    right: MEDIUM_BORDER,
  },
  BOTTOM_THIN: {
    bottom: THIN_BORDER,
  },
  BOTTOM_MEDIUM: {
    bottom: MEDIUM_BORDER,
  },
};

// ========================================
// ALIGNMENTS
// ========================================

export const ALIGNMENTS: Record<string, Partial<Alignment>> = {
  CENTER: {
    vertical: "middle",
    horizontal: "center",
  },
  LEFT: {
    vertical: "middle",
    horizontal: "left",
  },
  RIGHT: {
    vertical: "middle",
    horizontal: "right",
  },
};

// ========================================
// NUMBER FORMATS
// ========================================

export const NUMBER_FORMATS = {
  CURRENCY: "$#,##0.00",
  INTEGER: "#,##0",
  PERCENTAGE: "0.00%",
  DECIMAL_2: "#,##0.00",
  DATE_SHORT: "dd/mm/yyyy",
} as const;

// ========================================
// COLUMN WIDTHS
// ========================================

export const COLUMN_WIDTHS = {
  SMALL: 10,
  MEDIUM: 15,
  LARGE: 20,
  XLARGE: 30,
  NAME: 25,
  DESCRIPTION: 40,
  DATE: 12,
  CURRENCY: 15,
} as const;

// ========================================
// ROW HEIGHTS
// ========================================

export const ROW_HEIGHTS = {
  MAIN_HEADER: 40,
  SECTION_HEADER: 30,
  TABLE_HEADER: 25,
  NORMAL: 20,
  COMPACT: 18,
} as const;

// ========================================
// AUTO-WIDTH UTILITIES
// ========================================

export function calculateColumnWidth(
  values: (string | number | null | undefined)[],
  minWidth = 8,
  maxWidth = 50,
  padding = 2
): number {
  let maxLength = 0;

  for (const value of values) {
    if (value === null || value === undefined) continue;

    let length = 0;
    if (typeof value === "number") {
      length = value.toLocaleString("en-US").length;
    } else {
      length = String(value).length;
    }

    if (length > maxLength) {
      maxLength = length;
    }
  }

  const width = maxLength + padding;
  return Math.min(Math.max(width, minWidth), maxWidth);
}
