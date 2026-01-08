/**
 * PDF Export - Professional Gerencial Report Generator
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
  PAGE_LAYOUT,
  TABLE_STYLES,
  formatPDFCurrency,
  formatPDFPercentage,
  formatPDFInteger,
} from "./utils/pdfStyles";
import {
  addPage,
  checkPageBreak,
  getSafeY,
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
  // PAGE 2: EXECUTIVE SUMMARY
  // ==================================================================
  addPage(doc);
  await createExecutiveSummary(doc, data);

  // ==================================================================
  // PAGE 3+: DETAILED SECTIONS
  // ==================================================================
  if (data.dailyRevenue.length > 0 || data.monthlyRevenue.length > 0) {
    addPage(doc);
    await createRevenueSection(doc, data);
  }

  if (data.employees.length > 0) {
    addPage(doc);
    await createEmployeesSection(doc, data);
  }

  if (data.services.length > 0) {
    addPage(doc);
    await createServicesSection(doc, data);
  }

  if (data.payments.length > 0) {
    addPage(doc);
    await createPaymentsSection(doc, data);
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
  doc.setFillColor(...PDF_COLORS.ORANGE_PRIMARY);
  doc.rect(0, 0, pageWidth, 100, "F");

  doc.setFillColor(...PDF_COLORS.ORANGE_DARK);
  doc.rect(0, 100, pageWidth, 30, "F");

  // Logo centered at top
  const logoSize = 60;
  addLogo(doc, logoBase64, centerX - logoSize / 2, 30, logoSize);

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
  doc.setDrawColor(...PDF_COLORS.ORANGE_PRIMARY);
  doc.setLineWidth(1);
  doc.line(centerX - 40, 180, centerX + 40, 180);

  // Period
  doc.setFontSize(FONT_SIZES.BODY_LARGE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.GRAY_900);
  doc.text("Período:", centerX, 200, { align: "center" });

  doc.setFontSize(FONT_SIZES.BODY_LARGE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.ORANGE_PRIMARY);
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
  doc.text("Powered by TuTurno", centerX, pageHeight - 20, { align: "center" });

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
// PAGE 2: EXECUTIVE SUMMARY
// ========================================

async function createExecutiveSummary(
  doc: jsPDF,
  data: AnalyticsExportData
): Promise<void> {
  let y = MARGINS.PAGE_TOP;

  // Page Title
  doc.setFontSize(FONT_SIZES.TITLE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.GRAY_900);
  doc.text("Resumen Ejecutivo", MARGINS.PAGE_LEFT, y);
  y += 15;

  // Intro text
  y = addWrappedText(
    doc,
    `Este reporte presenta un análisis completo del desempeño de ${data.business.name} durante el período seleccionado. A continuación se muestran los indicadores clave de rendimiento (KPIs) y hallazgos principales.`,
    MARGINS.PAGE_LEFT,
    y,
    PAGE_LAYOUT.CONTENT_WIDTH,
    FONT_SIZES.BODY
  );

  y += 5;

  // KPIs Grid
  const kpis = [
    {
      title: "Ingresos Totales",
      value: formatPDFCurrency(data.summary.totalRevenue),
    },
    {
      title: "Total de Citas",
      value: formatPDFInteger(data.summary.totalAppointments),
    },
    {
      title: "Citas Completadas",
      value: formatPDFInteger(data.summary.completedAppointments),
    },
    {
      title: "Citas Canceladas",
      value: formatPDFInteger(data.summary.cancelledAppointments),
    },
    {
      title: "Ticket Promedio",
      value: formatPDFCurrency(data.summary.averageTicket),
    },
    {
      title: "Clientes Únicos",
      value: formatPDFInteger(data.summary.uniqueClients),
    },
    {
      title: "Tasa de Finalización",
      value: formatPDFPercentage(data.summary.completionRate),
    },
    {
      title: "Tasa de Cancelación",
      value: formatPDFPercentage(data.summary.cancellationRate),
    },
  ];

  y = renderKPIGrid(doc, kpis, y);
  y += MARGINS.SECTION_SPACING;

  // Divider
  y = addDivider(doc, y);

  // Key Insights Section
  y = addSectionHeader(doc, "Hallazgos Clave", y);

  const insights = generateInsights(data);
  y = addBulletList(
    doc,
    insights,
    MARGINS.PAGE_LEFT,
    y,
    PAGE_LAYOUT.CONTENT_WIDTH
  );

  y += MARGINS.SECTION_SPACING;

  // Recommendations
  y = addSectionHeader(doc, "Recomendaciones", y);

  const recommendations = generateRecommendations(data);
  y = addBulletList(
    doc,
    recommendations,
    MARGINS.PAGE_LEFT,
    y,
    PAGE_LAYOUT.CONTENT_WIDTH
  );
}

// ========================================
// PAGE 3: REVENUE SECTION
// ========================================

async function createRevenueSection(
  doc: jsPDF,
  data: AnalyticsExportData
): Promise<void> {
  let y = MARGINS.PAGE_TOP;

  y = addSectionHeader(doc, "Análisis de Ingresos", y);

  // Monthly Revenue Table
  if (data.monthlyRevenue.length > 0) {
    y = addSubsectionHeader(doc, "Ingresos Mensuales", y);

    autoTable(doc, {
      startY: y,
      head: [
        [
          "Mes del Reporte",
          "Ingresos Totales",
          "Citas Totales",
          "Ticket Promedio",
        ],
      ],
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

  // Daily Revenue Table
  if (data.dailyRevenue.length > 0) {
    y = checkPageBreak(doc, 60);
     y += 10;
    y = addSubsectionHeader(doc, "Desglose de Ingresos Diarios", y);

    const allDays = [...data.dailyRevenue].sort(
      (a, b) =>
        new Date(a.period_label).getTime() - new Date(b.period_label).getTime()
    );

    autoTable(doc, {
      startY: y,
      head: [["Fecha del Período", "Ingresos Diarios", "Total Citas"]],
      body: allDays.map((d) => [
        d.period_label,
        formatPDFCurrency(d.revenue),
        formatPDFInteger(d.appointment_count),
      ]),
      theme: "striped",
      headStyles: TABLE_STYLES.HEADER,
      bodyStyles: TABLE_STYLES.BODY,
      alternateRowStyles: TABLE_STYLES.ALTERNATING_ROW,
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "center" },
        2: { halign: "center" },
      },
      margin: { left: MARGINS.PAGE_LEFT, right: MARGINS.PAGE_RIGHT },
      tableWidth: PAGE_LAYOUT.CONTENT_WIDTH,
    });
  }
}

// ========================================
// PAGE 4: EMPLOYEES SECTION
// ========================================

async function createEmployeesSection(
  doc: jsPDF,
  data: AnalyticsExportData
): Promise<void> {
  let y = MARGINS.PAGE_TOP;

  y = addSectionHeader(doc, "Desempeño de Empleados", y);

  y = addWrappedText(
    doc,
    "Análisis del rendimiento individual de cada empleado basado en citas completadas, ingresos generados y tasas de finalización.",
    MARGINS.PAGE_LEFT,
    y,
    PAGE_LAYOUT.CONTENT_WIDTH,
    FONT_SIZES.BODY
  );

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Empleado",
        "Total Citas",
        "Citas Completadas",
        "Ingresos Generados",
        "Tasa de Finalización",
      ],
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

  y = (doc as any).lastAutoTable.finalY + MARGINS.SECTION_SPACING + 5;

  // Top Performer Highlight
  if (data.employees.length > 0) {
    const topEmployee = [...data.employees].sort(
      (a, b) => b.total_revenue - a.total_revenue
    )[0];

    y = checkPageBreak(doc, 30);
    y += 10;
    y = addSubsectionHeader(doc, "Empleado Destacado", y);

    doc.setFontSize(FONT_SIZES.BODY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.GRAY_900);
    doc.text(
      `${topEmployee.employee_name} generó ${formatPDFCurrency(
        topEmployee.total_revenue
      )} con ${topEmployee.completed_appointments} citas completadas.`,
      MARGINS.PAGE_LEFT,
      y
    );
  }
}

// ========================================
// PAGE 5: SERVICES SECTION
// ========================================

async function createServicesSection(
  doc: jsPDF,
  data: AnalyticsExportData
): Promise<void> {
  let y = MARGINS.PAGE_TOP;

  y = addSectionHeader(doc, "Servicios Más Vendidos", y);

  y = addWrappedText(
    doc,
    "Ranking de servicios por ingresos generados, frecuencia de venta y precio promedio.",
    MARGINS.PAGE_LEFT,
    y,
    PAGE_LAYOUT.CONTENT_WIDTH,
    FONT_SIZES.BODY
  );

  // Calculate percentages
  const totalRevenue = data.services.reduce(
    (sum, s) => sum + s.total_revenue,
    0
  );

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Nombre del Servicio",
        "Veces Vendido",
        "Ingresos Totales",
        "Precio Promedio",
        "Porcentaje de Ingresos",
      ],
    ],
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
}

// ========================================
// PAGE 6: PAYMENTS SECTION
// ========================================

async function createPaymentsSection(
  doc: jsPDF,
  data: AnalyticsExportData
): Promise<void> {
  let y = MARGINS.PAGE_TOP;

  y = addSectionHeader(doc, "Métodos de Pago", y);

  y = addWrappedText(
    doc,
    "Distribución de ingresos por método de pago utilizado.",
    MARGINS.PAGE_LEFT,
    y,
    PAGE_LAYOUT.CONTENT_WIDTH,
    FONT_SIZES.BODY
  );

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Método de Pago Seleccionado",
        "Monto Total Recaudado",
        "Número de Transacciones",
        "Porcentaje del Período",
      ],
    ],
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

  y = (doc as any).lastAutoTable.finalY + MARGINS.SECTION_SPACING + 5;

  // Visual progress bars for payment methods
  y = checkPageBreak(doc, 40);
  y += 8;
  y = addSubsectionHeader(doc, "Distribución Visual", y);
   y += 3;
  data.payments.forEach((payment) => {
    const label =
      payment.payment_method === "cash" ? "Efectivo" : "Transferencia";

    doc.setFontSize(FONT_SIZES.BODY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.GRAY_900);
    doc.text(label, MARGINS.PAGE_LEFT, y);

    doc.setFont("helvetica", "bold");
    doc.text(
      formatPDFPercentage(payment.percentage),
      MARGINS.PAGE_LEFT + 50,
      y
    );

    renderProgressBar(
      doc,
      MARGINS.PAGE_LEFT + 70,
      y - 3,
      90,
      payment.percentage,
      payment.payment_method === "cash" ? PDF_COLORS.GREEN : PDF_COLORS.BLUE
    );

    y += 12;
  });
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
      )} con un ticket promedio de ${formatPDFCurrency(
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
