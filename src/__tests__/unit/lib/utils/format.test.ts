import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatTime,
  formatPhone,
  formatCurrency,
  truncateText,
} from "@/lib/utils/format";

describe("Utilidades de Formato", () => {
  describe("formatDate", () => {
    it("debería formatear fecha en español", () => {
      const fecha = "2024-01-15";
      const formateada = formatDate(fecha);

      // Verificar que la fecha está formateada (contiene el año)
      expect(formateada).toContain("2024");
      expect(formateada.length).toBeGreaterThan(0);
    });

    it("debería aceptar objeto Date", () => {
      const fecha = new Date(2024, 5, 15); // 15 de junio
      const formateada = formatDate(fecha);

      expect(formateada).toContain("2024");
      expect(formateada.length).toBeGreaterThan(0);
    });

    it("debería aceptar opciones personalizadas", () => {
      const fecha = "2024-01-15";
      const formateada = formatDate(fecha, { month: "short" });

      expect(formateada).toBeDefined();
    });
  });

  describe("formatTime", () => {
    it("debería formatear hora correctamente", () => {
      expect(formatTime("09:00")).toBe("09:00");
      expect(formatTime("14:30")).toBe("14:30");
    });

    it("debería usar formato 24 horas", () => {
      const formateada = formatTime("23:59");
      expect(formateada).toBe("23:59");
    });

    it("debería manejar horas de un dígito", () => {
      const formateada = formatTime("9:00");
      expect(formateada).toBe("09:00");
    });
  });

  describe("formatPhone", () => {
    it("debería formatear teléfono de 10 dígitos", () => {
      const formateado = formatPhone("0999123456");
      expect(formateado).toBe("(099) 912-3456");
    });

    it("debería limpiar caracteres no numéricos", () => {
      const formateado = formatPhone("099-912-3456");
      expect(formateado).toBe("(099) 912-3456");
    });

    it("debería retornar original si no tiene 10 dígitos", () => {
      expect(formatPhone("123")).toBe("123");
      expect(formatPhone("12345678901")).toBe("12345678901");
    });

    it("debería manejar teléfonos con espacios", () => {
      const formateado = formatPhone("099 912 3456");
      expect(formateado).toBe("(099) 912-3456");
    });
  });

  describe("formatCurrency", () => {
    it("debería formatear moneda en USD por defecto", () => {
      const formateada = formatCurrency(15.5);
      expect(formateada).toContain("15");
      expect(formateada).toContain("50");
    });

    it("debería formatear números enteros", () => {
      const formateada = formatCurrency(100);
      expect(formateada).toContain("100");
    });

    it("debería manejar decimales correctamente", () => {
      const formateada = formatCurrency(25.99);
      expect(formateada).toContain("25");
      expect(formateada).toContain("99");
    });

    it("debería manejar cero", () => {
      const formateada = formatCurrency(0);
      expect(formateada).toBeDefined();
    });

    it("debería aceptar diferentes monedas", () => {
      const formateada = formatCurrency(100, "EUR");
      expect(formateada).toBeDefined();
    });
  });

  describe("truncateText", () => {
    it("debería truncar texto largo", () => {
      const texto = "Este es un texto muy largo que necesita ser truncado";
      const truncado = truncateText(texto, 20);

      expect(truncado.length).toBeLessThanOrEqual(23); // 20 + '...'
      expect(truncado).toContain("...");
    });

    it("debería retornar texto corto sin cambios", () => {
      const texto = "Texto corto";
      const truncado = truncateText(texto, 20);

      expect(truncado).toBe(texto);
      expect(truncado).not.toContain("...");
    });

    it("debería manejar texto exactamente del límite", () => {
      const texto = "12345678901234567890"; // 20 caracteres
      const truncado = truncateText(texto, 20);

      expect(truncado).toBe(texto);
    });

    it("debería truncar en el límite correcto", () => {
      const texto = "Hola Mundo";
      const truncado = truncateText(texto, 5);

      expect(truncado).toBe("Hola ...");
    });

    it("debería manejar string vacío", () => {
      const truncado = truncateText("", 10);
      expect(truncado).toBe("");
    });
  });

  describe("Integración de funciones de formato", () => {
    it("debería poder formatear múltiples tipos de datos", () => {
      const fecha = formatDate("2024-01-15");
      const hora = formatTime("14:30");
      const telefono = formatPhone("0999123456");
      const precio = formatCurrency(15.5);

      expect(fecha).toBeDefined();
      expect(hora).toBeDefined();
      expect(telefono).toBeDefined();
      expect(precio).toBeDefined();
    });
  });
});
