/**
 * Módulo de Exportación a PDF para Citas
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  translateMonthToSpanish,
  translateAppointmentStatus,
} from "../exportToExcel";
import { formatEcuadorianPhone } from "../utils/phoneUtils";
import { AppointmentExportParams } from "./types";

/**
 * Genera y descarga el archivo PDF de citas
 */
export const exportAppointmentsPDF = async ({
  businessName,
  data: allRows,
  dateFrom,
  dateTo,
}: AppointmentExportParams): Promise<void> => {
  const doc = new jsPDF("landscape", "mm", "a4");
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;

  // ========================================
  // MAIN HEADER - Black
  // ========================================
  doc.setFillColor(0, 0, 0); // Negro
  doc.rect(0, 0, pageWidth, 30, "F");

  // Title in white with business name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`LISTADO DE CITAS - ${businessName}`, margin, 18);

  // Subtitle / Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const today = new Date();
  const dateStr = translateMonthToSpanish(
    today.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );
  doc.text(`Reporte  generado el ${dateStr}`, margin, 25);

  let currentY = 30;

  // ========================================
  // INFORMACIÓN DEL REPORTE
  // ========================================
  doc.setFillColor(0, 0, 0);
  doc.rect(0, currentY, pageWidth, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMACIÓN DEL REPORTE", pageWidth / 2, currentY + 6.5, {
    align: "center",
  });

  currentY += 10;

  // Meta info grid (4 columns)
  const totalRevenue = allRows
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + Number(r.total_price || 0), 0);
  const totalAppointments = allRows.length;

  const period =
    dateFrom && dateTo
      ? translateMonthToSpanish(
          `${new Date(dateFrom + "T00:00:00").toLocaleDateString(
            "es-ES"
          )} - ${new Date(dateTo + "T00:00:00").toLocaleDateString("es-ES")}`
        )
      : "Todas las fechas";

  autoTable(doc, {
    startY: currentY,
    margin: { left: 0, right: 0 },
    tableWidth: pageWidth,
    head: [["Generado el", "Período", "Total de citas", "Ingresos totales"]],
    body: [
      [
        dateStr,
        period,
        String(totalAppointments),
        new Intl.NumberFormat("es-EC", {
          style: "currency",
          currency: "USD",
        }).format(totalRevenue),
      ],
    ],
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      halign: "center",
      valign: "middle",
      lineColor: [209, 213, 219], // gray-300 (BORDERS)
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [229, 231, 235], // gray-200 (INFO_HEADER)
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [31, 41, 55], // gray-800
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ========================================
  // DETALLE DE CITAS HEADER
  // ========================================
  doc.setFillColor(0, 0, 0);
  doc.rect(0, currentY, pageWidth, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLE DE CITAS", pageWidth / 2, currentY + 6.5, {
    align: "center",
  });

  currentY += 10;

  // ========================================
  // PROFESSIONAL TABLE
  // ========================================
  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "Fecha",
        "Inicio",
        "Fin",
        "Estado",
        "Precio",
        "Empleado",
        "Cliente",
        "Teléfono",
        "Sin Registro",
        "Servicios",
      ],
    ],
    body: allRows.map((r) => [
      translateMonthToSpanish(
        new Date(r.appointment_date + "T00:00:00").toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      ),
      r.start_time?.substring(0, 5) || "-",
      r.end_time?.substring(0, 5) || "-",
      translateAppointmentStatus(r.status || ""),
      new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
      }).format(Number(r.total_price || 0)),
      r.employee_name || "-",
      r.client_name || "-",
      formatEcuadorianPhone(r.client_phone),
      r.is_walk_in ? "Sí" : "No",
      (r.service_names || []).join(" • ") || "-",
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
      halign: "left",
      valign: "middle",
      lineColor: [209, 213, 219], // gray-300 (TABLE BORDERS)
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [243, 244, 246], // gray-100 (TABLE_HEADER)
      textColor: [31, 41, 55], // gray-800
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [243, 244, 246], // gray-100 (ZEBRA)
    },
    columnStyles: {
      0: { cellWidth: 22 }, // Fecha
      1: { cellWidth: 14 }, // Inicio
      2: { cellWidth: 14 }, // Fin
      3: { cellWidth: 22 }, // Estado
      4: { cellWidth: 20, halign: "right" }, // Precio
      5: { cellWidth: 30 }, // Empleado
      6: { cellWidth: 30 }, // Cliente
      7: { cellWidth: 25 }, // Teléfono
      8: { cellWidth: 20, halign: "center" }, // Sin Cuenta
      9: { cellWidth: "auto" }, // Servicios
    },
    margin: { left: 15, right: 15 },
  });

  // ========================================
  // FOOTER - Page numbers and decorative line
  // ========================================
  const totalPages = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Black decorative line
    doc.setDrawColor(0, 0, 0); // Negro
    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

    // Page numbers
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, {
      align: "center",
    });

    // Generated by TuTurno
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text("Generado por TuTurno", pageWidth - 15, pageHeight - 10, {
      align: "right",
    });
  }

  const ts = today.toISOString().split("T")[0];
  doc.save(`citas-${ts}.pdf`);
};
