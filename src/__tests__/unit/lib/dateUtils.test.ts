import { describe, it, expect } from "vitest";
import {
  parseDateString,
  formatDateString,
  toDateString,
  formatSpanishDate,
  translateDateLabel,
} from "@/lib/dateUtils";

describe("Utilidades de Fechas", () => {
  describe("parseDateString", () => {
    it("debería convertir string a Date correctamente", () => {
      const fecha = parseDateString("2024-01-15");

      expect(fecha).toBeInstanceOf(Date);
      expect(fecha.getFullYear()).toBe(2024);
      expect(fecha.getMonth()).toBe(0); // Enero = 0
      expect(fecha.getDate()).toBe(15);
    });

    it("debería retornar Date si ya es un objeto Date", () => {
      const fechaOriginal = new Date(2024, 0, 15);
      const resultado = parseDateString(fechaOriginal);

      expect(resultado).toBe(fechaOriginal);
    });

    it("debería usar hora del mediodía para evitar problemas de zona horaria", () => {
      const fecha = parseDateString("2024-06-15");

      expect(fecha.getHours()).toBe(12);
      expect(fecha.getMinutes()).toBe(0);
      expect(fecha.getSeconds()).toBe(0);
    });

    it("debería manejar diferentes formatos de fecha", () => {
      const fecha1 = parseDateString("2024-01-01");
      const fecha2 = parseDateString("2024-12-31");

      expect(fecha1.getDate()).toBe(1);
      expect(fecha2.getDate()).toBe(31);
    });
  });

  describe("formatDateString", () => {
    it("debería formatear Date a YYYY-MM-DD", () => {
      const fecha = new Date(2024, 0, 15, 12, 0, 0);
      const formateada = formatDateString(fecha);

      expect(formateada).toBe("2024-01-15");
    });

    it("debería agregar ceros a la izquierda en mes y día", () => {
      const fecha = new Date(2024, 0, 5, 12, 0, 0); // 5 de enero
      const formateada = formatDateString(fecha);

      expect(formateada).toBe("2024-01-05");
    });

    it("debería manejar fin de año correctamente", () => {
      const fecha = new Date(2024, 11, 31, 12, 0, 0); // 31 de diciembre
      const formateada = formatDateString(fecha);

      expect(formateada).toBe("2024-12-31");
    });
  });

  describe("toDateString", () => {
    it("debería ser alias de formatDateString", () => {
      const fecha = new Date(2024, 5, 15, 12, 0, 0);
      const resultado1 = toDateString(fecha);
      const resultado2 = formatDateString(fecha);

      expect(resultado1).toBe(resultado2);
      expect(resultado1).toBe("2024-06-15");
    });
  });

  describe("formatSpanishDate", () => {
    it("debería formatear fecha en español", () => {
      const formateada = formatSpanishDate("2024-01-15");

      expect(formateada).toContain("enero");
      expect(formateada).toContain("2024");
    });

    it("debería capitalizar la primera letra", () => {
      const formateada = formatSpanishDate("2024-06-15");

      // La primera letra debe estar en mayúscula
      expect(formateada[0]).toBe(formateada[0].toUpperCase());
    });

    it("debería incluir día de la semana por defecto", () => {
      const formateada = formatSpanishDate("2024-01-15");

      // Debe incluir el día de la semana (lunes, martes, etc.)
      const diasSemana = [
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
        "sábado",
        "domingo",
      ];
      const incluyeDiaSemana = diasSemana.some((dia) =>
        formateada.toLowerCase().includes(dia)
      );

      expect(incluyeDiaSemana).toBe(true);
    });

    it("debería aceptar opciones personalizadas de formato", () => {
      const formateada = formatSpanishDate("2024-01-15", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      expect(formateada).toContain("enero");
      expect(formateada).toContain("2024");
      expect(formateada).toContain("15");
    });

    it("debería formatear correctamente diferentes meses", () => {
      const enero = formatSpanishDate("2024-01-01");
      const diciembre = formatSpanishDate("2024-12-31");

      expect(enero.toLowerCase()).toContain("enero");
      expect(diciembre.toLowerCase()).toContain("diciembre");
    });
  });

  describe("translateDateLabel", () => {
    it("debería traducir meses abreviados de inglés a español", () => {
      expect(translateDateLabel("05 Jan")).toBe("05 Ene");
      expect(translateDateLabel("15 Feb")).toBe("15 Feb");
      expect(translateDateLabel("20 Mar")).toBe("20 Mar");
      expect(translateDateLabel("10 Apr")).toBe("10 Abr");
      expect(translateDateLabel("25 Aug")).toBe("25 Ago");
      expect(translateDateLabel("30 Dec")).toBe("30 Dic");
    });

    it("debería traducir nombres completos de meses", () => {
      expect(translateDateLabel("January 2024")).toBe("Enero 2024");
      expect(translateDateLabel("February 2024")).toBe("Febrero 2024");
      expect(translateDateLabel("August 2024")).toBe("Agosto 2024");
      expect(translateDateLabel("December 2024")).toBe("Diciembre 2024");
    });

    it("debería manejar múltiples meses en el mismo string", () => {
      const resultado = translateDateLabel("Jan to Feb");
      expect(resultado).toBe("Ene to Feb");
    });

    it("debería retornar N/A sin cambios", () => {
      expect(translateDateLabel("N/A")).toBe("N/A");
    });

    it("debería retornar string vacío sin cambios", () => {
      expect(translateDateLabel("")).toBe("");
    });

    it("debería manejar null/undefined gracefully", () => {
      expect(translateDateLabel(null as any)).toBe(null);
      expect(translateDateLabel(undefined as any)).toBe(undefined);
    });

    it("debería preservar formato de fecha completa", () => {
      const resultado = translateDateLabel("15 January 2024");
      expect(resultado).toBe("15 Enero 2024");
    });
  });

  describe("Integración de funciones de fecha", () => {
    it("debería poder parsear y formatear de vuelta", () => {
      const fechaOriginal = "2024-06-15";
      const fechaParseada = parseDateString(fechaOriginal);
      const fechaFormateada = formatDateString(fechaParseada);

      expect(fechaFormateada).toBe(fechaOriginal);
    });

    it("debería mantener consistencia entre funciones", () => {
      const fecha = new Date(2024, 5, 15, 12, 0, 0);
      const string1 = toDateString(fecha);
      const string2 = formatDateString(fecha);

      expect(string1).toBe(string2);
    });
  });
});
