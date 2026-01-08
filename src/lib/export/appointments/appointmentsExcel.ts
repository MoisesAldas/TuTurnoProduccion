/**
 * Módulo de Exportación a Excel para Citas
 */

import ExcelJS from "exceljs";
import {
  FILLS,
  FONTS,
  BORDERS,
  ALIGNMENTS,
  NUMBER_FORMATS,
  ROW_HEIGHTS,
  calculateColumnWidth,
} from "../utils/excelStyles";
import {
  translateMonthToSpanish,
  translateAppointmentStatus,
} from "../exportToExcel";
import { formatEcuadorianPhone } from "../utils/phoneUtils";
import { AppointmentExportParams } from "./types";

/**
 * Genera y descarga el archivo Excel de citas
 */
export const exportAppointmentsExcel = async ({
  businessName,
  data: allRows,
  dateFrom,
  dateTo,
}: AppointmentExportParams): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Citas");

  const today = new Date();
  const dateStr = translateMonthToSpanish(
    today.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  // Calcular totales
  const totalRevenue = allRows
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + Number(r.total_price || 0), 0);
  const totalAppointments = allRows.length;

  // Período de fechas
  const period =
    dateFrom && dateTo
      ? translateMonthToSpanish(
          `${new Date(dateFrom + "T00:00:00").toLocaleDateString(
            "es-ES"
          )} - ${new Date(dateTo + "T00:00:00").toLocaleDateString("es-ES")}`
        )
      : "Todas las fechas";

  let currentRow = 1;

  // ========================================
  // HEADER PRINCIPAL (Fila 1)
  // ========================================
  worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = `LISTADO DE CITAS - ${businessName}`;
  titleCell.font = FONTS.MAIN_HEADER;
  titleCell.fill = FILLS.HEADER_BLACK;
  titleCell.alignment = ALIGNMENTS.CENTER;
  worksheet.getRow(currentRow).height = ROW_HEIGHTS.MAIN_HEADER;
  currentRow += 2;

  // ========================================
  // INFORMACIÓN DEL REPORTE
  // ========================================
  worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
  const infoHeader = worksheet.getCell(`A${currentRow}`);
  infoHeader.value = "INFORMACIÓN DEL REPORTE";
  infoHeader.font = FONTS.SECTION_HEADER;
  infoHeader.fill = FILLS.HEADER_BLACK;
  infoHeader.alignment = ALIGNMENTS.CENTER;
  worksheet.getRow(currentRow).height = ROW_HEIGHTS.SECTION_HEADER;
  currentRow++;

  // Headers de información
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  const genHeader = worksheet.getCell(`A${currentRow}`);
  genHeader.value = "Generado el";
  genHeader.font = FONTS.INFO_HEADER;
  genHeader.fill = FILLS.INFO_HEADER;
  genHeader.alignment = ALIGNMENTS.CENTER;
  genHeader.border = BORDERS.ALL_THIN;

  worksheet.mergeCells(`C${currentRow}:E${currentRow}`);
  const perHeader = worksheet.getCell(`C${currentRow}`);
  perHeader.value = "Período";
  perHeader.font = FONTS.INFO_HEADER;
  perHeader.fill = FILLS.INFO_HEADER;
  perHeader.alignment = ALIGNMENTS.CENTER;
  perHeader.border = BORDERS.ALL_THIN;

  worksheet.mergeCells(`F${currentRow}:H${currentRow}`);
  const totHeader = worksheet.getCell(`F${currentRow}`);
  totHeader.value = "Total de citas";
  totHeader.font = FONTS.INFO_HEADER;
  totHeader.fill = FILLS.INFO_HEADER;
  totHeader.alignment = ALIGNMENTS.CENTER;
  totHeader.border = BORDERS.ALL_THIN;

  worksheet.mergeCells(`I${currentRow}:J${currentRow}`);
  const ingHeader = worksheet.getCell(`I${currentRow}`);
  ingHeader.value = "Ingresos totales";
  ingHeader.font = FONTS.INFO_HEADER;
  ingHeader.fill = FILLS.INFO_HEADER;
  ingHeader.alignment = ALIGNMENTS.CENTER;
  ingHeader.border = BORDERS.ALL_THIN;

  worksheet.getRow(currentRow).height = ROW_HEIGHTS.TABLE_HEADER;
  currentRow++;

  // Datos de información
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  const genData = worksheet.getCell(`A${currentRow}`);
  genData.value = today;
  genData.font = FONTS.DATA;
  genData.fill = FILLS.DATA_WHITE;
  genData.alignment = ALIGNMENTS.CENTER;
  genData.border = BORDERS.ALL_THIN;
  genData.numFmt = NUMBER_FORMATS.DATE_SHORT;

  worksheet.mergeCells(`C${currentRow}:E${currentRow}`);
  const perData = worksheet.getCell(`C${currentRow}`);
  perData.value = period;
  perData.font = FONTS.DATA;
  perData.fill = FILLS.DATA_WHITE;
  perData.alignment = ALIGNMENTS.CENTER;
  perData.border = BORDERS.ALL_THIN;

  worksheet.mergeCells(`F${currentRow}:H${currentRow}`);
  const totData = worksheet.getCell(`F${currentRow}`);
  totData.value = totalAppointments;
  totData.font = FONTS.DATA;
  totData.fill = FILLS.DATA_WHITE;
  totData.alignment = ALIGNMENTS.CENTER;
  totData.border = BORDERS.ALL_THIN;

  worksheet.mergeCells(`I${currentRow}:J${currentRow}`);
  const ingData = worksheet.getCell(`I${currentRow}`);
  ingData.value = totalRevenue;
  ingData.font = FONTS.DATA_NUMBER;
  ingData.fill = FILLS.DATA_WHITE;
  ingData.alignment = ALIGNMENTS.CENTER;
  ingData.border = BORDERS.ALL_THIN;
  ingData.numFmt = NUMBER_FORMATS.CURRENCY;

  worksheet.getRow(currentRow).height = ROW_HEIGHTS.NORMAL;
  currentRow += 3;

  // ========================================
  // TABLA DE CITAS
  // ========================================
  worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
  const tableHeader = worksheet.getCell(`A${currentRow}`);
  tableHeader.value = "DETALLE DE CITAS";
  tableHeader.font = FONTS.SECTION_HEADER;
  tableHeader.fill = FILLS.HEADER_BLACK;
  tableHeader.alignment = ALIGNMENTS.CENTER;
  worksheet.getRow(currentRow).height = ROW_HEIGHTS.SECTION_HEADER;
  currentRow++;

  // Headers de columnas
  const headers = [
    "Fecha",
    "Hora Inicio",
    "Hora Fin",
    "Estado",
    "Precio",
    "Empleado",
    "Cliente",
    "Teléfono",
    "Sin Registro",
    "Servicios",
  ];
  const headerRow = worksheet.getRow(currentRow);
  headerRow.values = headers;
  headerRow.font = FONTS.TABLE_HEADER;
  headerRow.fill = FILLS.TABLE_HEADER;
  headerRow.alignment = ALIGNMENTS.CENTER;
  headerRow.border = BORDERS.ALL_THIN;
  headerRow.height = ROW_HEIGHTS.TABLE_HEADER;
  currentRow++;

  // Datos
  allRows.forEach((row, index) => {
    const dataRow = worksheet.getRow(currentRow);

    dataRow.values = [
      new Date(row.appointment_date + "T00:00:00"),
      row.start_time?.substring(0, 5) || "-",
      row.end_time?.substring(0, 5) || "-",
      translateAppointmentStatus(row.status || ""),
      Number(row.total_price || 0),
      row.employee_name || "-",
      row.client_name || "-",
      formatEcuadorianPhone(row.client_phone),
      row.is_walk_in ? "Sí" : "No",
      (row.service_names || []).join(" | ") || "-",
    ];

    const fillColor = index % 2 === 0 ? FILLS.TABLE_HEADER : FILLS.DATA_WHITE;

    dataRow.eachCell((cell, colNum) => {
      cell.fill = fillColor;
      cell.border = BORDERS.ALL_THIN;
      cell.alignment = {
        ...ALIGNMENTS.LEFT,
        vertical: "top",
        wrapText: true,
      };
      cell.font = FONTS.DATA;

      // Formato especial para Fecha (columna 1)
      if (colNum === 1) {
        cell.numFmt = NUMBER_FORMATS.DATE_SHORT;
        cell.alignment = { ...ALIGNMENTS.CENTER, vertical: "top" };
      }

      // Formato especial para precio (columna 5)
      if (colNum === 5) {
        cell.numFmt = NUMBER_FORMATS.CURRENCY;
        cell.alignment = { ...ALIGNMENTS.RIGHT, vertical: "top" };
        cell.font = FONTS.DATA_NUMBER;
      }

      // Centrar Sin Registro (columna 9)
      if (colNum === 9) {
        cell.alignment = { ...ALIGNMENTS.CENTER, vertical: "top" };
      }
    });

    currentRow++;
  });

  // ========================================
  // ANCHOS DE COLUMNA DINÁMICOS
  // ========================================
  const col1Values = [
    "Generado el",
    dateStr,
    "Fecha",
    ...allRows.map((r) =>
      new Date(r.appointment_date + "T00:00:00").toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    ),
  ];
  const col2Values = [
    "Período",
    period,
    "Hora Inicio",
    ...allRows.map((r) => r.start_time?.substring(0, 5) || "-"),
  ];
  const col3Values = [
    "Total de citas",
    String(totalAppointments),
    "Hora Fin",
    ...allRows.map((r) => r.end_time?.substring(0, 5) || "-"),
  ];
  const col4Values = [
    "Ingresos totales",
    String(totalRevenue),
    "Estado",
    ...allRows.map((r) => translateAppointmentStatus(r.status || "")),
  ];
  const priceValues = ["Precio", ...allRows.map((r) => String(r.total_price))];
  const employeeValues = [
    "Empleado",
    ...allRows.map((r) => r.employee_name || "-"),
  ];
  const clientValues = ["Cliente", ...allRows.map((r) => r.client_name || "-")];
  const phoneValues = [
    "Teléfono",
    ...allRows.map((r) => formatEcuadorianPhone(r.client_phone)),
  ];
  const walkinValues = ["Walk-in", "Sí", "No"];
  const serviceValues = [
    "Servicios",
    ...allRows.map((r) => (r.service_names || []).join(" | ") || "-"),
  ];

  worksheet.getColumn(1).width = calculateColumnWidth(col1Values, 15, 30);
  worksheet.getColumn(2).width = calculateColumnWidth(col2Values, 15, 35);
  worksheet.getColumn(3).width = calculateColumnWidth(col3Values, 12, 20);
  worksheet.getColumn(4).width = calculateColumnWidth(col4Values, 15, 25);
  worksheet.getColumn(5).width = calculateColumnWidth(priceValues, 12, 15);
  worksheet.getColumn(6).width = calculateColumnWidth(employeeValues, 20, 30);
  worksheet.getColumn(7).width = calculateColumnWidth(clientValues, 20, 30);
  worksheet.getColumn(8).width = calculateColumnWidth(phoneValues, 15, 20);
  worksheet.getColumn(9).width = calculateColumnWidth(walkinValues, 10, 12);
  worksheet.getColumn(10).width = calculateColumnWidth(serviceValues, 25, 50);

  // EXPORTAR
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ts = today.toISOString().split("T")[0];
  a.download = `citas-${ts}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};
