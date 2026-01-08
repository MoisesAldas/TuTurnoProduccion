/**
 * Módulo de Exportación a CSV para Citas
 */

import { AppointmentExportParams } from "./types";

/**
 * Genera y descarga el archivo CSV de citas
 */
export const exportAppointmentsCSV = async ({
  data: allRows,
}: Pick<AppointmentExportParams, "data">): Promise<void> => {
  const header = [
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

  const lines = allRows.map((r) => [
    r.appointment_date,
    r.start_time?.substring(0, 5),
    r.end_time?.substring(0, 5),
    r.status,
    r.total_price,
    r.employee_name ?? "",
    r.client_name ?? "",
    r.client_phone ?? "",
    r.is_walk_in ? "Sí" : "No",
    (r.service_names || []).join(" | "),
  ]);

  const csv = [header, ...lines]
    .map((cols) =>
      cols.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const ts = new Date().toISOString().split("T")[0];
  a.download = `citas-${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
