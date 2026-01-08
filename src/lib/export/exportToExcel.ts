/**
 * Excel Export - Sistema Profesional Gerencial
 * Genera reportes Excel con diseño limpio y profesional
 */

import ExcelJS from "exceljs";
import type { AnalyticsExportData } from "./types";
import {
  COLORS,
  FILLS,
  FONTS,
  BORDERS,
  ALIGNMENTS,
  NUMBER_FORMATS,
  COLUMN_WIDTHS,
  ROW_HEIGHTS,
  calculateColumnWidth,
} from "./utils/excelStyles";
import {
  fetchImageAsBase64,
  createLogoPlaceholder,
  getImageExtension,
} from "./utils/imageHelpers";

/**
 * Exporta datos a Excel con formato profesional gerencial
 */
export const exportToExcel = async (
  data: AnalyticsExportData,
  filename?: string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();

  // Metadata del workbook
  workbook.creator = "TuTurno";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.company = "TuTurno - Sistema de Gestión";

  try {
    // Crear todas las hojas
    await createSummarySheet(workbook, data);
    await createRevenueSheet(workbook, data);
    await createEmployeesSheet(workbook, data);
    await createServicesSheet(workbook, data);
    await createPaymentsSheet(workbook, data);

    // Generar y descargar
    const buffer = await workbook.xlsx.writeBuffer();
    downloadExcelFile(buffer, filename || generateFilename(data.business.name));
  } catch (error) {
    console.error("Error generating Excel:", error);
    throw error;
  }
};

/**
 * HOJA 1: Resumen Ejecutivo
 */
async function createSummarySheet(
  workbook: ExcelJS.Workbook,
  data: AnalyticsExportData
): Promise<void> {
  const sheet = workbook.addWorksheet("Resumen Ejecutivo", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 5 }],
  });

  let currentRow = 1;

  // ========================================
  // HEADER PRINCIPAL (Fila 1)
  // ========================================
  sheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const mainHeader = sheet.getCell(`A${currentRow}`);
  mainHeader.value = `REPORTE DE ANÁLISIS DE NEGOCIO - ${data.business.name.toUpperCase()}`;
  mainHeader.font = FONTS.MAIN_HEADER;
  mainHeader.fill = FILLS.HEADER_BLACK;
  mainHeader.alignment = ALIGNMENTS.CENTER;
  sheet.getRow(currentRow).height = ROW_HEIGHTS.MAIN_HEADER;
  currentRow++;

  // Logo (si existe)
  try {
    let logoBase64: string;
    if (data.business.logoUrl) {
      logoBase64 = await fetchImageAsBase64(data.business.logoUrl);
    } else {
      logoBase64 = await createLogoPlaceholder(data.business.name);
    }

    const logoId = workbook.addImage({
      base64: logoBase64,
      extension: data.business.logoUrl
        ? getImageExtension(data.business.logoUrl)
        : "png",
    });

    // Logo en la esquina superior derecha (H1)
    sheet.addImage(logoId, {
      tl: { col: 7, row: 0 },
      ext: { width: 60, height: 60 },
    });
  } catch (error) {
    console.warn("Could not add logo:", error);
  }

  // Línea vacía
  currentRow++;

  // ========================================
  // INFORMACIÓN DEL REPORTE (Filas 3-4)
  // ========================================
  sheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const infoHeader = sheet.getCell(`A${currentRow}`);
  infoHeader.value = "INFORMACIÓN DEL REPORTE";
  infoHeader.font = FONTS.SECTION_HEADER;
  infoHeader.fill = FILLS.HEADER_BLACK;
  infoHeader.alignment = ALIGNMENTS.CENTER;
  sheet.getRow(currentRow).height = ROW_HEIGHTS.SECTION_HEADER;
  currentRow++;

  // Headers de información
  const infoHeaderRow = sheet.getRow(currentRow);
  infoHeaderRow.values = [
    "Negocio",
    "Categoría",
    "Período",
    "Generado por",
    "Fecha",
  ];
  infoHeaderRow.font = FONTS.INFO_HEADER;
  infoHeaderRow.fill = FILLS.INFO_HEADER;
  infoHeaderRow.alignment = ALIGNMENTS.CENTER;
  infoHeaderRow.border = BORDERS.ALL_THIN;
  infoHeaderRow.height = ROW_HEIGHTS.TABLE_HEADER;
  currentRow++;

  // Datos de información
  const infoDataRow = sheet.getRow(currentRow);
  infoDataRow.values = [
    data.business.name,
    data.business.category,
    data.metadata.reportPeriod,
    data.business.ownerName,
    data.metadata.generatedDate,
  ];
  infoDataRow.font = FONTS.DATA;
  infoDataRow.fill = FILLS.DATA_WHITE;
  infoDataRow.border = BORDERS.ALL_THIN;
  infoDataRow.alignment = ALIGNMENTS.CENTER;
  infoDataRow.height = ROW_HEIGHTS.NORMAL;
  currentRow++;

  // Línea vacía
  currentRow++;

  // ========================================
  // RESUMEN EJECUTIVO (KPIs)
  // ========================================
  sheet.mergeCells(`A${currentRow}:C${currentRow}`);
  const kpiHeader = sheet.getCell(`A${currentRow}`);
  kpiHeader.value = "RESUMEN EJECUTIVO";
  kpiHeader.font = FONTS.SECTION_HEADER;
  kpiHeader.fill = FILLS.HEADER_BLACK;
  kpiHeader.alignment = ALIGNMENTS.CENTER;
  sheet.getRow(currentRow).height = ROW_HEIGHTS.SECTION_HEADER;
  currentRow++;

  // Headers de tabla KPIs
  const kpiHeaderRow = sheet.getRow(currentRow);
  kpiHeaderRow.values = ["Indicador", "Valor", "Detalle"];
  kpiHeaderRow.font = FONTS.TABLE_HEADER;
  kpiHeaderRow.fill = FILLS.TABLE_HEADER;
  kpiHeaderRow.alignment = ALIGNMENTS.CENTER;
  kpiHeaderRow.border = BORDERS.ALL_THIN;
  kpiHeaderRow.height = ROW_HEIGHTS.TABLE_HEADER;
  currentRow++;

  // Datos KPIs
  const kpis = [
    {
      indicator: "Ingresos Totales",
      value: data.summary.totalRevenue,
      detail: `${data.summary.totalAppointments} citas`,
      format: NUMBER_FORMATS.CURRENCY,
    },
    {
      indicator: "Total de Citas",
      value: data.summary.totalAppointments,
      detail: `${data.summary.completedAppointments} completadas`,
      format: NUMBER_FORMATS.INTEGER,
    },
    {
      indicator: "Clientes Únicos",
      value: data.summary.uniqueClients,
      detail: "En el período",
      format: NUMBER_FORMATS.INTEGER,
    },
    {
      indicator: "Ticket Promedio",
      value: data.summary.averageTicket,
      detail: "Por cita",
      format: NUMBER_FORMATS.CURRENCY,
    },
    {
      indicator: "Tasa de Completitud",
      value: data.summary.completionRate / 100,
      detail: `${data.summary.completedAppointments} de ${data.summary.totalAppointments}`,
      format: NUMBER_FORMATS.PERCENTAGE,
    },
    {
      indicator: "Tasa de Cancelación",
      value: data.summary.cancellationRate / 100,
      detail: `${data.summary.cancelledAppointments} canceladas`,
      format: NUMBER_FORMATS.PERCENTAGE,
    },
  ];

  kpis.forEach((kpi) => {
    const row = sheet.getRow(currentRow);
    row.values = [kpi.indicator, kpi.value, kpi.detail];

    row.getCell(1).font = FONTS.DATA_BOLD;
    row.getCell(1).alignment = { ...ALIGNMENTS.LEFT, wrapText: true };
    row.getCell(1).border = BORDERS.ALL_THIN;
    row.getCell(1).fill = FILLS.DATA_WHITE;

    row.getCell(2).numFmt = kpi.format;
    row.getCell(2).font = FONTS.DATA_NUMBER;
    row.getCell(2).alignment = ALIGNMENTS.RIGHT;
    row.getCell(2).border = BORDERS.ALL_THIN;
    row.getCell(2).fill = FILLS.DATA_WHITE;

    row.getCell(3).font = FONTS.DATA;
    row.getCell(3).alignment = { ...ALIGNMENTS.LEFT, wrapText: true };
    row.getCell(3).border = BORDERS.ALL_THIN;
    row.getCell(3).fill = FILLS.DATA_WHITE;

    row.height = ROW_HEIGHTS.NORMAL;
    currentRow++;
  });

  // ========================================
  // ANCHOS DE COLUMNA FIJOS Y CONSISTENTES
  // ========================================
  // Configurar anchos fijos para toda la hoja para mantener alineación perfecta
  sheet.getColumn(1).width = 25; // Columna principal (Indicador)
  sheet.getColumn(2).width = 20; // Columna de valores
  sheet.getColumn(3).width = 30; // Columna de detalles

  // Columna 4: Ajustar dinámicamente al tamaño del correo
  const emailWidth = calculateColumnWidth(
    ["Generado por", data.business.ownerName],
    20,
    40
  );
  sheet.getColumn(4).width = emailWidth;

  sheet.getColumn(5).width = 20;
  sheet.getColumn(6).width = 15;
  sheet.getColumn(7).width = 15;
}

/**
 * HOJA 2: Análisis de Ingresos
 */
async function createRevenueSheet(
  workbook: ExcelJS.Workbook,
  data: AnalyticsExportData
): Promise<void> {
  const sheet = workbook.addWorksheet("Análisis de Ingresos");
  let currentRow = 1;

  // Header principal
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const mainHeader = sheet.getCell(`A${currentRow}`);
  mainHeader.value = "ANÁLISIS DE INGRESOS";
  mainHeader.font = FONTS.MAIN_HEADER;
  mainHeader.fill = FILLS.HEADER_BLACK;
  mainHeader.alignment = ALIGNMENTS.CENTER;
  sheet.getRow(currentRow).height = ROW_HEIGHTS.MAIN_HEADER;
  currentRow += 2;

  // Ingresos Diarios
  if (data.dailyRevenue.length > 0) {
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const sectionHeader = sheet.getCell(`A${currentRow}`);
    sectionHeader.value = "INGRESOS DIARIOS";
    sectionHeader.font = FONTS.SECTION_HEADER;
    sectionHeader.fill = FILLS.HEADER_BLACK;
    sectionHeader.alignment = ALIGNMENTS.CENTER;
    sheet.getRow(currentRow).height = ROW_HEIGHTS.SECTION_HEADER;
    currentRow++;

    // Headers
    const headerRow = sheet.getRow(currentRow);
    headerRow.values = ["Fecha", "Ingresos", "Facturas", "Citas"];
    headerRow.font = FONTS.TABLE_HEADER;
    headerRow.fill = FILLS.TABLE_HEADER;
    headerRow.alignment = ALIGNMENTS.CENTER;
    headerRow.border = BORDERS.ALL_THIN;
    headerRow.height = ROW_HEIGHTS.TABLE_HEADER;
    currentRow++;

    // Datos
    data.dailyRevenue.forEach((item, index) => {
      const row = sheet.getRow(currentRow);
      row.values = [
        translateMonthToSpanish(item.period_label),
        item.revenue,
        item.invoice_count,
        item.appointment_count,
      ];

      row.getCell(1).font = FONTS.DATA;
      row.getCell(1).alignment = ALIGNMENTS.LEFT;
      row.getCell(2).numFmt = NUMBER_FORMATS.CURRENCY;
      row.getCell(2).font = FONTS.DATA_NUMBER;
      row.getCell(2).alignment = ALIGNMENTS.RIGHT;
      row.getCell(3).numFmt = NUMBER_FORMATS.INTEGER;
      row.getCell(3).alignment = ALIGNMENTS.CENTER;
      row.getCell(4).numFmt = NUMBER_FORMATS.INTEGER;
      row.getCell(4).alignment = ALIGNMENTS.CENTER;

      row.eachCell((cell) => {
        cell.border = BORDERS.ALL_THIN;
        // Zebra striping
        cell.fill = index % 2 === 0 ? FILLS.TABLE_HEADER : FILLS.DATA_WHITE;
      });

      row.height = ROW_HEIGHTS.COMPACT;
      currentRow++;
    });

    currentRow += 2;
  }

  // Ingresos Mensuales
  if (data.monthlyRevenue.length > 0) {
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const sectionHeader = sheet.getCell(`A${currentRow}`);
    sectionHeader.value = "INGRESOS MENSUALES";
    sectionHeader.font = FONTS.SECTION_HEADER;
    sectionHeader.fill = FILLS.HEADER_BLACK;
    sectionHeader.alignment = ALIGNMENTS.CENTER;
    sheet.getRow(currentRow).height = ROW_HEIGHTS.SECTION_HEADER;
    currentRow++;

    // Headers
    const headerRow = sheet.getRow(currentRow);
    headerRow.values = ["Mes", "Ingresos", "Facturas", "Citas"];
    headerRow.font = FONTS.TABLE_HEADER;
    headerRow.fill = FILLS.TABLE_HEADER;
    headerRow.alignment = ALIGNMENTS.CENTER;
    headerRow.border = BORDERS.ALL_THIN;
    headerRow.height = ROW_HEIGHTS.TABLE_HEADER;
    currentRow++;

    // Datos
    data.monthlyRevenue.forEach((item, index) => {
      const row = sheet.getRow(currentRow);
      row.values = [
        translateMonthToSpanish(item.period_label),
        item.revenue,
        item.invoice_count,
        item.appointment_count,
      ];

      row.getCell(1).font = FONTS.DATA;
      row.getCell(1).alignment = ALIGNMENTS.LEFT;
      row.getCell(2).numFmt = NUMBER_FORMATS.CURRENCY;
      row.getCell(2).font = FONTS.DATA_NUMBER;
      row.getCell(2).alignment = ALIGNMENTS.RIGHT;
      row.getCell(3).numFmt = NUMBER_FORMATS.INTEGER;
      row.getCell(3).alignment = ALIGNMENTS.CENTER;
      row.getCell(4).numFmt = NUMBER_FORMATS.INTEGER;
      row.getCell(4).alignment = ALIGNMENTS.CENTER;

      row.eachCell((cell) => {
        cell.border = BORDERS.ALL_THIN;
        // Zebra striping
        cell.fill = index % 2 === 0 ? FILLS.TABLE_HEADER : FILLS.DATA_WHITE;
      });

      row.height = ROW_HEIGHTS.COMPACT;
      currentRow++;
    });
  }

  // Anchos de columnas dinámicos
  const allRevenue = [...data.dailyRevenue, ...data.monthlyRevenue];
  const dateValues = ["Fecha", "Mes", ...allRevenue.map((r) => r.period_label)];
  const revenueValues = ["Ingresos", ...allRevenue.map((r) => r.revenue)];
  const invoiceValues = ["Facturas", ...allRevenue.map((r) => r.invoice_count)];
  const appointmentValues = [
    "Citas",
    ...allRevenue.map((r) => r.appointment_count),
  ];

  sheet.getColumn(1).width = calculateColumnWidth(dateValues, 15, 25);
  sheet.getColumn(2).width = calculateColumnWidth(revenueValues, 15, 20);
  sheet.getColumn(3).width = calculateColumnWidth(invoiceValues, 10, 15);
  sheet.getColumn(4).width = calculateColumnWidth(appointmentValues, 10, 15);
}

/**
 * HOJA 3: Performance de Empleados
 */
async function createEmployeesSheet(
  workbook: ExcelJS.Workbook,
  data: AnalyticsExportData
): Promise<void> {
  if (data.employees.length === 0) return;

  const sheet = workbook.addWorksheet("Performance de Empleados");
  let currentRow = 1;

  // Header principal
  sheet.mergeCells(`A${currentRow}:F${currentRow}`);
  const mainHeader = sheet.getCell(`A${currentRow}`);
  mainHeader.value = "PERFORMANCE DE EMPLEADOS";
  mainHeader.font = FONTS.MAIN_HEADER;
  mainHeader.fill = FILLS.HEADER_BLACK;
  mainHeader.alignment = ALIGNMENTS.CENTER;
  sheet.getRow(currentRow).height = ROW_HEIGHTS.MAIN_HEADER;
  currentRow += 2;

  // Headers
  const headerRow = sheet.getRow(currentRow);
  headerRow.values = [
    "Empleado",
    "Total Citas",
    "Completadas",
    "Ingresos",
    "Ticket Prom.",
    "Tasa Complet.",
  ];
  headerRow.font = FONTS.TABLE_HEADER;
  headerRow.fill = FILLS.TABLE_HEADER;
  headerRow.alignment = ALIGNMENTS.CENTER;
  headerRow.border = BORDERS.ALL_THIN;
  headerRow.height = ROW_HEIGHTS.TABLE_HEADER;
  currentRow++;

  // Datos
  data.employees.forEach((emp, index) => {
    const row = sheet.getRow(currentRow);
    row.values = [
      emp.employee_name,
      emp.total_appointments,
      emp.completed_appointments,
      emp.total_revenue,
      emp.average_ticket,
      emp.completion_rate / 100,
    ];

    row.getCell(1).font = FONTS.DATA_BOLD;
    row.getCell(1).alignment = ALIGNMENTS.LEFT;
    row.getCell(2).numFmt = NUMBER_FORMATS.INTEGER;
    row.getCell(2).alignment = ALIGNMENTS.CENTER;
    row.getCell(3).numFmt = NUMBER_FORMATS.INTEGER;
    row.getCell(3).alignment = ALIGNMENTS.CENTER;
    row.getCell(4).numFmt = NUMBER_FORMATS.CURRENCY;
    row.getCell(4).alignment = ALIGNMENTS.RIGHT;
    row.getCell(5).numFmt = NUMBER_FORMATS.CURRENCY;
    row.getCell(5).alignment = ALIGNMENTS.RIGHT;
    row.getCell(6).numFmt = NUMBER_FORMATS.PERCENTAGE;
    row.getCell(6).alignment = ALIGNMENTS.CENTER;

    row.eachCell((cell) => {
      cell.border = BORDERS.ALL_THIN;
      // Zebra striping
      cell.fill = index % 2 === 0 ? FILLS.TABLE_HEADER : FILLS.DATA_WHITE;
    });

    row.height = ROW_HEIGHTS.COMPACT;
    currentRow++;
  });

  // Anchos dinámicos
  const empNames = ["Empleado", ...data.employees.map((e) => e.employee_name)];
  const empAppointments = [
    "Total Citas",
    ...data.employees.map((e) => e.total_appointments),
  ];
  const empCompleted = [
    "Completadas",
    ...data.employees.map((e) => e.completed_appointments),
  ];
  const empRevenue = [
    "Ingresos",
    ...data.employees.map((e) => e.total_revenue),
  ];
  const empTicket = [
    "Ticket Prom.",
    ...data.employees.map((e) => e.average_ticket),
  ];
  const empRate = [
    "Tasa Complet.",
    ...data.employees.map((e) => e.completion_rate),
  ];

  sheet.getColumn(1).width = calculateColumnWidth(empNames, 20, 35);
  sheet.getColumn(2).width = calculateColumnWidth(empAppointments, 12, 15);
  sheet.getColumn(3).width = calculateColumnWidth(empCompleted, 12, 15);
  sheet.getColumn(4).width = calculateColumnWidth(empRevenue, 15, 20);
  sheet.getColumn(5).width = calculateColumnWidth(empTicket, 15, 20);
  sheet.getColumn(6).width = calculateColumnWidth(empRate, 14, 18);

  // ========================================
  // EMPLEADO DESTACADO
  // ========================================
  if (data.employees.length > 0) {
    currentRow += 3;

    const topEmployee = [...data.employees].sort(
      (a, b) => b.total_revenue - a.total_revenue
    )[0];

    sheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const highlightHeader = sheet.getCell(`A${currentRow}`);
    highlightHeader.value = "EMPLEADO DESTACADO";
    highlightHeader.font = FONTS.SECTION_HEADER;
    highlightHeader.fill = FILLS.HEADER_BLACK;
    highlightHeader.alignment = ALIGNMENTS.CENTER;
    sheet.getRow(currentRow).height = ROW_HEIGHTS.SECTION_HEADER;
    currentRow++;

    sheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const highlightText = sheet.getCell(`A${currentRow}`);
    highlightText.value = `${topEmployee.employee_name} generó ${formatCurrency(
      topEmployee.total_revenue
    )} con ${
      topEmployee.completed_appointments
    } citas completadas, manteniendo una tasa de completitud del ${formatPercentage(
      topEmployee.completion_rate
    )}.`;
    highlightText.font = FONTS.DATA;
    highlightText.alignment = { ...ALIGNMENTS.LEFT, wrapText: true };
    highlightText.border = BORDERS.ALL_THIN;
    highlightText.fill = FILLS.DATA_WHITE;
    sheet.getRow(currentRow).height = ROW_HEIGHTS.NORMAL * 2;
  }
}

/**
 * HOJA 4: Servicios
 */
async function createServicesSheet(
  workbook: ExcelJS.Workbook,
  data: AnalyticsExportData
): Promise<void> {
  if (data.services.length === 0) return;

  const sheet = workbook.addWorksheet("Servicios");
  let currentRow = 1;

  // Header principal
  sheet.mergeCells(`A${currentRow}:E${currentRow}`);
  const mainHeader = sheet.getCell(`A${currentRow}`);
  mainHeader.value = "SERVICIOS MÁS VENDIDOS";
  mainHeader.font = FONTS.MAIN_HEADER;
  mainHeader.fill = FILLS.HEADER_BLACK;
  mainHeader.alignment = ALIGNMENTS.CENTER;
  sheet.getRow(currentRow).height = ROW_HEIGHTS.MAIN_HEADER;
  currentRow += 2;

  // Headers
  const headerRow = sheet.getRow(currentRow);
  headerRow.values = [
    "Servicio",
    "Veces Vendido",
    "Ingresos",
    "Precio Prom.",
    "% del Total",
  ];
  headerRow.font = FONTS.TABLE_HEADER;
  headerRow.fill = FILLS.TABLE_HEADER;
  headerRow.alignment = ALIGNMENTS.CENTER;
  headerRow.border = BORDERS.ALL_THIN;
  headerRow.height = ROW_HEIGHTS.TABLE_HEADER;
  currentRow++;

  // Datos
  data.services.forEach((service, index) => {
    const row = sheet.getRow(currentRow);
    row.values = [
      service.service_name,
      service.times_sold,
      service.total_revenue,
      service.average_price,
      service.percentage_of_total / 100,
    ];

    row.getCell(1).font = FONTS.DATA_BOLD;
    row.getCell(1).alignment = ALIGNMENTS.LEFT;
    row.getCell(2).numFmt = NUMBER_FORMATS.INTEGER;
    row.getCell(2).alignment = ALIGNMENTS.CENTER;
    row.getCell(3).numFmt = NUMBER_FORMATS.CURRENCY;
    row.getCell(3).alignment = ALIGNMENTS.RIGHT;
    row.getCell(4).numFmt = NUMBER_FORMATS.CURRENCY;
    row.getCell(4).alignment = ALIGNMENTS.RIGHT;
    row.getCell(5).numFmt = NUMBER_FORMATS.PERCENTAGE;
    row.getCell(5).alignment = ALIGNMENTS.CENTER;

    row.eachCell((cell) => {
      cell.border = BORDERS.ALL_THIN;
      // Zebra striping
      cell.fill = index % 2 === 0 ? FILLS.TABLE_HEADER : FILLS.DATA_WHITE;
    });

    row.height = ROW_HEIGHTS.COMPACT;
    currentRow++;
  });

  // Anchos dinámicos
  const serviceNames = [
    "Servicio",
    ...data.services.map((s) => s.service_name),
  ];
  const servicesSold = [
    "Veces Vendido",
    ...data.services.map((s) => s.times_sold),
  ];
  const serviceRevenue = [
    "Ingresos",
    ...data.services.map((s) => s.total_revenue),
  ];
  const servicePrice = [
    "Precio Prom.",
    ...data.services.map((s) => s.average_price),
  ];
  const servicePercent = [
    "% del Total",
    ...data.services.map((s) => s.percentage_of_total),
  ];

  sheet.getColumn(1).width = calculateColumnWidth(serviceNames, 25, 45);
  sheet.getColumn(2).width = calculateColumnWidth(servicesSold, 14, 18);
  sheet.getColumn(3).width = calculateColumnWidth(serviceRevenue, 15, 20);
  sheet.getColumn(4).width = calculateColumnWidth(servicePrice, 15, 20);
  sheet.getColumn(5).width = calculateColumnWidth(servicePercent, 12, 16);
}

/**
 * HOJA 5: Métodos de Pago
 */
async function createPaymentsSheet(
  workbook: ExcelJS.Workbook,
  data: AnalyticsExportData
): Promise<void> {
  if (data.payments.length === 0) return;

  const sheet = workbook.addWorksheet("Métodos de Pago");
  let currentRow = 1;

  // Header principal
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const mainHeader = sheet.getCell(`A${currentRow}`);
  mainHeader.value = "DISTRIBUCIÓN DE PAGOS";
  mainHeader.font = FONTS.MAIN_HEADER;
  mainHeader.fill = FILLS.HEADER_BLACK;
  mainHeader.alignment = ALIGNMENTS.CENTER;
  sheet.getRow(currentRow).height = ROW_HEIGHTS.MAIN_HEADER;
  currentRow += 2;

  // Headers
  const headerRow = sheet.getRow(currentRow);
  headerRow.values = [
    "Método de Pago",
    "Monto Total",
    "Transacciones",
    "Porcentaje",
  ];
  headerRow.font = FONTS.TABLE_HEADER;
  headerRow.fill = FILLS.TABLE_HEADER;
  headerRow.alignment = ALIGNMENTS.CENTER;
  headerRow.border = BORDERS.ALL_THIN;
  headerRow.height = ROW_HEIGHTS.TABLE_HEADER;
  currentRow++;

  // Datos
  data.payments.forEach((payment, index) => {
    const row = sheet.getRow(currentRow);
    row.values = [
      payment.payment_method_label,
      payment.total_amount,
      payment.transaction_count,
      payment.percentage / 100,
    ];

    row.getCell(1).font = FONTS.DATA_BOLD;
    row.getCell(1).alignment = ALIGNMENTS.LEFT;
    row.getCell(2).numFmt = NUMBER_FORMATS.CURRENCY;
    row.getCell(2).alignment = ALIGNMENTS.RIGHT;
    row.getCell(3).numFmt = NUMBER_FORMATS.INTEGER;
    row.getCell(3).alignment = ALIGNMENTS.CENTER;
    row.getCell(4).numFmt = NUMBER_FORMATS.PERCENTAGE;
    row.getCell(4).alignment = ALIGNMENTS.CENTER;

    row.eachCell((cell) => {
      cell.border = BORDERS.ALL_THIN;
      // Zebra striping
      cell.fill = index % 2 === 0 ? FILLS.TABLE_HEADER : FILLS.DATA_WHITE;
    });

    row.height = ROW_HEIGHTS.COMPACT;
    currentRow++;
  });

  // Anchos dinámicos
  const paymentMethods = [
    "Método de Pago",
    ...data.payments.map((p) => p.payment_method_label),
  ];
  const paymentAmounts = [
    "Monto Total",
    ...data.payments.map((p) => p.total_amount),
  ];
  const paymentCounts = [
    "Transacciones",
    ...data.payments.map((p) => p.transaction_count),
  ];
  const paymentPercents = [
    "Porcentaje",
    ...data.payments.map((p) => p.percentage),
  ];

  sheet.getColumn(1).width = calculateColumnWidth(paymentMethods, 18, 30);
  sheet.getColumn(2).width = calculateColumnWidth(paymentAmounts, 15, 20);
  sheet.getColumn(3).width = calculateColumnWidth(paymentCounts, 14, 18);
  sheet.getColumn(4).width = calculateColumnWidth(paymentPercents, 12, 16);
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Formatea moneda para Excel
 */
function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formatea porcentaje para Excel
 */
function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Formatea entero para Excel
 */
function formatInteger(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Genera insights automáticos basados en los datos
 */
function generateInsights(data: AnalyticsExportData): string[] {
  const insights: string[] = [];

  // Revenue insight
  if (data.summary.totalRevenue > 0) {
    insights.push(
      `Los ingresos totales alcanzaron ${formatCurrency(
        data.summary.totalRevenue
      )} con un ticket promedio de ${formatCurrency(
        data.summary.averageTicket
      )}.`
    );
  }

  // Completion rate insight
  if (data.summary.completionRate >= 80) {
    insights.push(
      `Excelente tasa de completitud del ${formatPercentage(
        data.summary.completionRate
      )}, indicando alta satisfacción del cliente.`
    );
  } else if (data.summary.completionRate < 70) {
    insights.push(
      `La tasa de completitud del ${formatPercentage(
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
    insights.push(
      `El ${formatPercentage(
        topPayment.percentage
      )} de los pagos se realizan mediante ${topPayment.payment_method_label}.`
    );
  }

  // Client insight
  if (data.summary.uniqueClients > 0) {
    const avgAppointmentsPerClient =
      data.summary.totalAppointments / data.summary.uniqueClients;
    if (avgAppointmentsPerClient > 2) {
      insights.push(
        `Alta fidelización: cada cliente promedia ${avgAppointmentsPerClient.toFixed(
          1
        )} citas en el período.`
      );
    }
  }

  return insights;
}

/**
 * Genera recomendaciones basadas en las métricas
 */
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

  // Low average ticket
  if (data.summary.averageTicket < 50) {
    recommendations.push(
      "Considerar estrategias de upselling o paquetes de servicios para incrementar el ticket promedio."
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

/**
 * Traduce nombres de meses del inglés al español
 */
export function translateMonthToSpanish(text: string): string {
  const monthTranslations: Record<string, string> = {
    January: "Enero",
    February: "Febrero",
    March: "Marzo",
    April: "Abril",
    May: "Mayo",
    June: "Junio",
    July: "Julio",
    August: "Agosto",
    September: "Septiembre",
    October: "Octubre",
    November: "Noviembre",
    December: "Diciembre",
    // Abreviaciones
    Jan: "Ene",
    Feb: "Feb",
    Mar: "Mar",
    Apr: "Abr",
    Jun: "Jun",
    Jul: "Jul",
    Aug: "Ago",
    Sep: "Sep",
    Oct: "Oct",
    Nov: "Nov",
    Dec: "Dic",
  };

  let translatedText = text;
  Object.entries(monthTranslations).forEach(([english, spanish]) => {
    const regex = new RegExp(english, "gi");
    translatedText = translatedText.replace(regex, spanish);
  });

  return translatedText;
}

/**
 * Traduce estados de citas al español
 */
export function translateAppointmentStatus(status: string): string {
  const translations: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmada",
    in_progress: "En Progreso",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No Asistió",
  };
  return translations[status] || status;
}

/**
 * Genera nombre de archivo
 */
function generateFilename(businessName: string): string {
  const date = new Date().toISOString().split("T")[0];
  const sanitizedName = businessName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `reporte-${sanitizedName}-${date}.xlsx`;
}

/**
 * Descarga el archivo Excel
 */
function downloadExcelFile(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
