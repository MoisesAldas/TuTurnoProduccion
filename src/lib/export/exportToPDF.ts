/**
 * PDF Export - Professional Managerial Report Generator
 * Generates multi-page executive reports with business branding
 * Architecture: Modular functions for each page/section
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AnalyticsExportData } from "./types";
import {
  fetchImageAsBase64,
  createLogoPlaceholder,
} from "./utils/imageHelpers";
import {
  PDF_COLORS,
  FONT_SIZES,
  MARGINS,
  PAGE_LAYOUT,  // ¡Añade esto!
  TABLE_STYLES,
  formatPDFCurrency,
  formatPDFPercentage,
  formatPDFInteger,
} from "./utils/pdfStyles";
import {
  addPage,
  checkPageBreak,
  addAllFooters,
  addSectionHeader,
  addSubsectionHeader,
  renderKPIGrid,
  addDivider,
  addWrappedText,
  addBulletList,
  addLogo,
  renderProgressBar,
} from "./utils/pdfLayouts";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

// ========================================
// MAIN EXPORT FUNCTION
// ========================================

/**
 * Main export function - generates and downloads PDF
 * Multi-page professional report with business branding
 */
export const exportToPDF = async (
  data: AnalyticsExportData,
  filename?: string
): Promise<void> => {
  const timestamp = format(new Date(), "yyyy-MM-dd", { locale: es });
  const defaultFilename = `reporte-gerencial-${data.business.name
    .toLowerCase()
    .replace(/\s+/g, "-")}-${timestamp}.pdf`;

  // Create PDF document (A4 size)
  const doc = new jsPDF("portrait", "mm", "a4");

  // Fetch or create logo
  let logoBase64: string;
  try {
    if (data.business.logoUrl) {
      logoBase64 = await fetchImageAsBase64(data.business.logoUrl);
    } else {
      logoBase64 = await createLogoPlaceholder(data.business.name);
    }
  } catch (error) {
    console.error("Error loading logo, using placeholder:", error);
    logoBase64 = await createLogoPlaceholder(data.business.name);
  }

  // ==================================================================
  // PAGE 1: COVER PAGE
  // ==================================================================
  await createCoverPage(doc, data, logoBase64);

  // ==================================================================
  // PAGE 2: MANAGERIAL REPORT (Compact 1-2 Pages)
  // ==================================================================
  addPage(doc);

  // 1. Managerial Header Grid
  let currentY = await createManagerialHeader(doc, data);

  // 2. Executive Summary (KPIs as Grid)
  currentY = await createExecutiveSummary(doc, data, currentY);

  // 3. Revenue Section (Monthly Table)
  // SIEMPRE usar monthlyRevenue (nunca dailyRevenue) para mantener PDF compacto
  if (data.monthlyRevenue.length > 0) {
    currentY = await createRevenueSection(doc, data, currentY);
  }

  // 4. Operational Performance (Employees + Services)
  if (data.employees.length > 0 || data.services.length > 0) {
    // Check if we need a page break because of low space
    if (currentY > 220) {
      addPage(doc);
      currentY = MARGINS.PAGE_TOP;
    } else {
      currentY += 5; // Small gap
    }

    if (data.employees.length > 0) {
      currentY = await createEmployeesSection(doc, data, currentY);
    }

    if (data.services.length > 0) {
      // Small gap between sections if on same page
      if (data.employees.length > 0 && currentY < 220) {
        currentY += 5;
      }
      currentY = await createServicesSection(doc, data, currentY);
    }
  }

  // 5. Payments
  if (data.payments.length > 0) {
    // Check page break
    if (currentY > 220) {
      addPage(doc);
      currentY = MARGINS.PAGE_TOP;
    } else {
      currentY += 5;
    }

    await createPaymentsSection(doc, data, currentY);
  }

  // ==================================================================
  // FINAL: ADD FOOTERS TO ALL PAGES
  // ==================================================================
  const formattedDate = format(new Date(), "dd 'de' MMMM, yyyy", {
    locale: es,
  });
  addAllFooters(doc, formattedDate);

  // Save the PDF
  doc.save(filename || defaultFilename);
};

// ========================================
// PAGE 1: COVER PAGE
// ========================================

async function createCoverPage(
  doc: jsPDF,
  data: AnalyticsExportData,
  logoBase64: string
): Promise<void> {
  const pageWidth = PAGE_LAYOUT.WIDTH;
  const pageHeight = PAGE_LAYOUT.HEIGHT;
  const centerX = pageWidth / 2;

  // Orange gradient background (simulated with rectangles)
  doc.setFillColor(...PDF_COLORS.GRAY_900);
  doc.rect(0, 0, pageWidth, 100, "F");

  doc.setFillColor(...PDF_COLORS.GRAY_700);
  doc.rect(0, 100, pageWidth, 30, "F");

  // Logo centered at top
  const logoSize = 60;
  addLogo(doc, logoBase64, centerX - logoSize / 2, 30, logoSize);
let currentY = 30;
  // Business Name
  doc.setFontSize(FONT_SIZES.TITLE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.WHITE);
  doc.text(data.business.name, centerX, 105, { align: "center" });

  // Business Category
  doc.setFontSize(FONT_SIZES.SUBHEADING);
  doc.setFont("helvetica", "normal");
  doc.text(data.business.category || "Servicios Profesionales", centerX, 115, {
    align: "center",
  });

  // White section
  doc.setFillColor(...PDF_COLORS.WHITE);
  doc.rect(0, 130, pageWidth, pageHeight - 130, "F");

  // Report Title
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.GRAY_900);
  doc.text("Reporte Gerencial", centerX, 160, { align: "center" });

  doc.setFontSize(FONT_SIZES.HEADING);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.GRAY_700);
  doc.text("Análisis de Desempeño y Métricas", centerX, 172, {
    align: "center",
  });

  // Divider
  doc.setDrawColor(...PDF_COLORS.GRAY_900);
  doc.setLineWidth(1);
  doc.line(centerX - 40, 180, centerX + 40, 180);

  // Period
  doc.setFontSize(FONT_SIZES.BODY_LARGE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.GRAY_900);
  doc.text("Período:", centerX, 200, { align: "center" });

  doc.setFontSize(FONT_SIZES.BODY_LARGE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.GRAY_900);
  doc.text(data.metadata.reportPeriod, centerX, 210, { align: "center" });

  // Generated info
  doc.setFontSize(FONT_SIZES.SMALL);
  doc.setTextColor(...PDF_COLORS.GRAY_600);
  doc.text(`Generado: ${data.metadata.generatedDate}`, centerX, 230, {
    align: "center",
  });
  doc.text(`Por: ${data.metadata.generatedBy}`, centerX, 238, {
    align: "center",
  });

  // Footer branding
  doc.setFontSize(FONT_SIZES.SMALL);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.GRAY_600);
  doc.text("Desarrollado por TuTurno", centerX, pageHeight - 20, { align: "center" });

  doc.setFontSize(FONT_SIZES.TINY);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Sistema Profesional de Gestión de Citas",
    centerX,
    pageHeight - 15,
    { align: "center" }
  );
}

// ========================================
// MANAGERIAL HEADER GRID
// ========================================

async function createManagerialHeader(
  doc: jsPDF,
  data: AnalyticsExportData
): Promise<number> {
  let y = MARGINS.PAGE_TOP;

  // Title "Reporte de Gestión"
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.GRAY_900);
  doc.text("Reporte de Gestión", MARGINS.PAGE_LEFT, y);

  // Right side business name
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.GRAY_600);
  doc.text(data.business.name, PAGE_LAYOUT.WIDTH - MARGINS.PAGE_RIGHT, y, {
    align: "right",
  });

  y += 5;

  // Header Grid using autoTable for perfect alignment
  autoTable(doc, {
    startY: y,
    head: [
      [
        "Negocio / Sede",
        "Período de Reporte",
        "Fecha de Emisión",
        "Solicitado Por",
      ],
    ],
    body: [
      [
        data.business.name,
        data.metadata.reportPeriod,
        data.metadata.generatedDate,
        data.metadata.generatedBy,
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [100, 100, 100],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: PDF_COLORS.GRAY_900,
      textColor: PDF_COLORS.WHITE,
      fontStyle: "bold",
      halign: "left",
    },
    bodyStyles: {
      textColor: PDF_COLORS.GRAY_900,
      fillColor: PDF_COLORS.WHITE,
    },
    margin: { left: MARGINS.PAGE_LEFT, right: MARGINS.PAGE_RIGHT },
    tableWidth: PAGE_LAYOUT.CONTENT_WIDTH,
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

// ========================================
// EXECUTIVE SUMMARY (KPI GRID)
// ========================================

async function createExecutiveSummary(
  doc: jsPDF,
  data: AnalyticsExportData,
  startY: number
): Promise<number> {
  let y = startY;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.GRAY_900);
  doc.text("Indicadores Clave de Riesgo y Desempeño", MARGINS.PAGE_LEFT, y);
  y += 5;

  // KPI Table Grid
  const kpiData = [
    {
      label: "Ingresos Totales",
      value: formatPDFCurrency(data.summary.totalRevenue),
    },
    {
      label: "Total Citas",
      value: formatPDFInteger(data.summary.totalAppointments),
    },
    {
      label: "Citas Completadas",
      value: formatPDFInteger(data.summary.completedAppointments),
    },
    {
      label: "Tasa Completitud",
      value: formatPDFPercentage(data.summary.completionRate),
    },
  ];

  const kpiData2 = [
    {
      label: "Ticket Promedio",
      value: formatPDFCurrency(data.summary.averageTicket),
    },
    {
      label: "Clientes Únicos",
      value: formatPDFInteger(data.summary.uniqueClients),
    },
    {
      label: "Citas Canceladas",
      value: formatPDFInteger(data.summary.cancelledAppointments),
    },
    {
      label: "Tasa Cancelación",
      value: formatPDFPercentage(data.summary.cancellationRate),
    },
  ];

  autoTable(doc, {
    startY: y,
    head: [["Métrica", "Estado", "Métrica", "Estado"]],
    body: [
      [
        kpiData[0].label,
        kpiData[0].value,
        kpiData2[0].label,
        kpiData2[0].value,
      ],
      [
        kpiData[1].label,
        kpiData[1].value,
        kpiData2[1].label,
        kpiData2[1].value,
      ],
      [
        kpiData[2].label,
        kpiData[2].value,
        kpiData2[2].label,
        kpiData2[2].value,
      ],
      [
        kpiData[3].label,
        kpiData[3].value,
        kpiData2[3].label,
        kpiData2[3].value,
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: PDF_COLORS.GRAY_900,
      textColor: PDF_COLORS.WHITE,
      fontStyle: "bold",
      halign: "center",
    },
  columnStyles: {
  0: { halign: "left", fontStyle: "bold", cellWidth: 60 },
  1: { halign: "center", cellWidth: 40 },
  2: { halign: "center", cellWidth: 40 },
  3: { halign: "center", cellWidth: 35 },
},
    margin: { left: MARGINS.PAGE_LEFT, right: MARGINS.PAGE_RIGHT },
    tableWidth: PAGE_LAYOUT.CONTENT_WIDTH,
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

// ========================================
// REVENUE SECTION (COMPACT - MONTHLY ONLY)
// ========================================

async function createRevenueSection(
  doc: jsPDF,
  data: AnalyticsExportData,
  startY: number
): Promise<number> {
  let y = startY;

  // Monthly Revenue Table (SOLO MENSUAL - nunca diario)
  if (data.monthlyRevenue.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Mes", "Ingresos", "Citas Facturadas", "Promedio/Cita"]],
      body: data.monthlyRevenue.map((m) => [
        m.period_label,
        formatPDFCurrency(m.revenue),
        formatPDFInteger(m.appointment_count),
        formatPDFCurrency(m.revenue / (m.appointment_count || 1)),
      ]),
      theme: "grid",
      headStyles: TABLE_STYLES.HEADER,
      bodyStyles: TABLE_STYLES.BODY,
      alternateRowStyles: TABLE_STYLES.ALTERNATING_ROW,
      columnStyles: {
        0: { halign: "left", fontStyle: "bold" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
      },
      margin: { left: MARGINS.PAGE_LEFT, right: MARGINS.PAGE_RIGHT },
      tableWidth: PAGE_LAYOUT.CONTENT_WIDTH,
    });

    y = (doc as any).lastAutoTable.finalY + MARGINS.SECTION_SPACING;
  }

  return y; // Return current Y position for stacking sections
}

// ========================================
// PAGE 4: EMPLOYEES SECTION
// ========================================

async function createEmployeesSection(
  doc: jsPDF,
  data: AnalyticsExportData,
  startY: number
): Promise<number> {
  let y = startY;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.GRAY_900);
  doc.text("Desempeño Operativo - Empleados", MARGINS.PAGE_LEFT, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [
      ["Empleado", "Total Citas", "Completadas", "Ingresos", "Finalización"],
    ],
    body: data.employees.map((e) => [
      e.employee_name,
      formatPDFInteger(e.total_appointments),
      formatPDFInteger(e.completed_appointments),
      formatPDFCurrency(e.total_revenue),
      formatPDFPercentage(e.completion_rate),
    ]),
    theme: "grid",
    headStyles: TABLE_STYLES.HEADER,
    bodyStyles: TABLE_STYLES.BODY,
    alternateRowStyles: TABLE_STYLES.ALTERNATING_ROW,
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
    },
    margin: { left: MARGINS.PAGE_LEFT, right: MARGINS.PAGE_RIGHT },
    tableWidth: PAGE_LAYOUT.CONTENT_WIDTH,
  });

  return (doc as any).lastAutoTable.finalY + MARGINS.SECTION_SPACING;
}

// ========================================
// PAGE 5: SERVICES SECTION
// ========================================

async function createServicesSection(
  doc: jsPDF,
  data: AnalyticsExportData,
  startY: number
): Promise<number> {
  let y = startY;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.GRAY_900);
  doc.text("Desempeño Comercial - Servicios Top", MARGINS.PAGE_LEFT, y);
  y += 3;

  // Calculate percentages
  const totalRevenue = data.services.reduce(
    (sum, s) => sum + s.total_revenue,
    0
  );

  autoTable(doc, {
    startY: y,
    head: [["Servicio", "Ventas", "Ingresos", "Precio Prom.", "% Total"]],
    body: data.services.map((s) => [
      s.service_name,
      formatPDFInteger(s.times_sold),
      formatPDFCurrency(s.total_revenue),
      formatPDFCurrency(s.average_price),
      formatPDFPercentage((s.total_revenue / totalRevenue) * 100),
    ]),
    theme: "grid",
    headStyles: TABLE_STYLES.HEADER,
    bodyStyles: TABLE_STYLES.BODY,
    alternateRowStyles: TABLE_STYLES.ALTERNATING_ROW,
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
    },
    margin: { left: MARGINS.PAGE_LEFT, right: MARGINS.PAGE_RIGHT },
    tableWidth: PAGE_LAYOUT.CONTENT_WIDTH,
  });

  y = (doc as any).lastAutoTable.finalY + MARGINS.SECTION_SPACING;
  return y; // Return current Y position for stacking sections
}

// ========================================
// PAGE 6: PAYMENTS SECTION
// ========================================

async function createPaymentsSection(
  doc: jsPDF,
  data: AnalyticsExportData,
  startY: number
): Promise<number> {
  let y = startY;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.GRAY_900);
  doc.text("Desglose de Facturación", MARGINS.PAGE_LEFT, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [["Método", "Total", "Transacciones", "% Part."]],
    body: data.payments.map((p) => [
      p.payment_method === "cash" ? "Efectivo" : "Transferencia",
      formatPDFCurrency(p.total_amount),
      formatPDFInteger(p.transaction_count),
      formatPDFPercentage(p.percentage),
    ]),
    theme: "grid",
    headStyles: TABLE_STYLES.HEADER,
    bodyStyles: TABLE_STYLES.BODY,
    alternateRowStyles: TABLE_STYLES.ALTERNATING_ROW,
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
    },
    margin: { left: MARGINS.PAGE_LEFT, right: MARGINS.PAGE_RIGHT },
    tableWidth: PAGE_LAYOUT.CONTENT_WIDTH,
  });

  return (doc as any).lastAutoTable.finalY + MARGINS.SECTION_SPACING + 5;
}

// ========================================
// INSIGHTS GENERATOR
// ========================================

function generateInsights(data: AnalyticsExportData): string[] {
  const insights: string[] = [];

  // Revenue insight
  if (data.summary.totalRevenue > 0) {
    insights.push(
      `Los ingresos totales alcanzaron ${formatPDFCurrency(
        data.summary.totalRevenue
      )} con un precio promedio de servicio de ${formatPDFCurrency(
        data.summary.averageTicket
      )}.`
    );
  }

  // Completion rate insight
  if (data.summary.completionRate >= 80) {
    insights.push(
      `Excelente tasa de finalización del ${formatPDFPercentage(
        data.summary.completionRate
      )}, indicando alta satisfacción del cliente.`
    );
  } else if (data.summary.completionRate < 70) {
    insights.push(
      `La tasa de finalización del ${formatPDFPercentage(
        data.summary.completionRate
      )} puede mejorarse. Considere revisar procesos de confirmación.`
    );
  }

  // Top service insight
  if (data.services.length > 0) {
    const topService = data.services[0];
    insights.push(
      `El servicio más demandado es "${topService.service_name}" con ${topService.times_sold} ventas.`
    );
  }

  // Payment method insight
  if (data.payments.length > 0) {
    const topPayment = [...data.payments].sort(
      (a, b) => b.total_amount - a.total_amount
    )[0];
    const method =
      topPayment.payment_method === "cash" ? "efectivo" : "transferencia";
    insights.push(
      `El ${formatPDFPercentage(
        topPayment.percentage
      )} de los pagos se realizan en ${method}.`
    );
  }

  return insights;
}

// ========================================
// RECOMMENDATIONS GENERATOR
// ========================================

function generateRecommendations(data: AnalyticsExportData): string[] {
  const recommendations: string[] = [];

  // Low completion rate
  if (data.summary.completionRate < 75) {
    recommendations.push(
      "Implementar recordatorios automáticos 24h antes de cada cita para reducir no-shows."
    );
  }

  // High cancellation rate
  if (data.summary.cancellationRate > 15) {
    recommendations.push(
      "Revisar política de cancelaciones y considerar depósito inicial para reducir cancelaciones."
    );
  }

  // Service diversity
  if (
    data.services.length > 0 &&
    data.services[0].total_revenue > data.summary.totalRevenue * 0.5
  ) {
    recommendations.push(
      "Diversificar portafolio de servicios para no depender excesivamente de un solo servicio."
    );
  }

  // Payment methods
  const cashPayment = data.payments.find((p) => p.payment_method === "cash");
  if (cashPayment && cashPayment.percentage > 70) {
    recommendations.push(
      "Incentivar pagos digitales para mejorar trazabilidad y reducir manejo de efectivo."
    );
  }

  // Default recommendation if none generated
  if (recommendations.length === 0) {
    recommendations.push(
      "Continuar monitoreando métricas clave y mantener los estándares actuales de servicio."
    );
  }

  return recommendations;
}
