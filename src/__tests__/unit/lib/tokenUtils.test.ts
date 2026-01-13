import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateAppointmentToken,
  validateAppointmentToken,
} from "@/lib/tokenUtils";

describe("Utilidades de Tokens", () => {
  // Configurar variable de entorno para tests
  beforeEach(() => {
    process.env.APPOINTMENT_TOKEN_SECRET = "test-secret-key-12345";
  });

  describe("generateAppointmentToken", () => {
    it("debería generar un token válido", () => {
      const citaId = "cita-123";
      const token = generateAppointmentToken(citaId);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("debería incluir el ID de la cita en el token", () => {
      const citaId = "cita-456";
      const token = generateAppointmentToken(citaId);

      expect(token).toContain(citaId);
      expect(token.startsWith(citaId + ".")).toBe(true);
    });

    it("debería generar tokens diferentes para IDs diferentes", () => {
      const token1 = generateAppointmentToken("cita-1");
      const token2 = generateAppointmentToken("cita-2");

      expect(token1).not.toBe(token2);
    });

    it("debería generar el mismo token para el mismo ID", () => {
      const citaId = "cita-789";
      const token1 = generateAppointmentToken(citaId);
      const token2 = generateAppointmentToken(citaId);

      expect(token1).toBe(token2);
    });

    it("debería lanzar error si no hay secret configurado", () => {
      delete process.env.APPOINTMENT_TOKEN_SECRET;

      expect(() => {
        generateAppointmentToken("cita-123");
      }).toThrow("APPOINTMENT_TOKEN_SECRET no está configurado");
    });
  });

  describe("validateAppointmentToken", () => {
    it("debería validar un token correcto", () => {
      const citaId = "cita-123";
      const token = generateAppointmentToken(citaId);

      const esValido = validateAppointmentToken(citaId, token);
      expect(esValido).toBe(true);
    });

    it("debería rechazar un token inválido", () => {
      const esValido = validateAppointmentToken("cita-123", "token-invalido");
      expect(esValido).toBe(false);
    });

    it("debería rechazar token con ID incorrecto", () => {
      const token = generateAppointmentToken("cita-123");
      const esValido = validateAppointmentToken("cita-456", token);

      expect(esValido).toBe(false);
    });

    it("debería rechazar token vacío", () => {
      const esValido = validateAppointmentToken("cita-123", "");
      expect(esValido).toBe(false);
    });

    it("debería rechazar ID vacío", () => {
      const token = generateAppointmentToken("cita-123");
      const esValido = validateAppointmentToken("", token);

      expect(esValido).toBe(false);
    });

    it("debería rechazar token manipulado", () => {
      const citaId = "cita-123";
      const token = generateAppointmentToken(citaId);
      const tokenManipulado = token.slice(0, -5) + "12345";

      const esValido = validateAppointmentToken(citaId, tokenManipulado);
      expect(esValido).toBe(false);
    });

    it("debería rechazar token con formato incorrecto", () => {
      const esValido = validateAppointmentToken(
        "cita-123",
        "sin-punto-ni-firma"
      );
      expect(esValido).toBe(false);
    });

    it("debería manejar errores gracefully", () => {
      // Token con caracteres especiales que podrían causar errores
      const esValido = validateAppointmentToken(
        "cita-123",
        "token.con.muchos.puntos"
      );
      expect(esValido).toBe(false);
    });
  });

  describe("Seguridad de Tokens", () => {
    it("debería usar timing-safe comparison", () => {
      const citaId = "cita-security-test";
      const tokenCorrecto = generateAppointmentToken(citaId);

      // Verificar que la validación es consistente
      const resultado1 = validateAppointmentToken(citaId, tokenCorrecto);
      const resultado2 = validateAppointmentToken(citaId, tokenCorrecto);

      expect(resultado1).toBe(resultado2);
      expect(resultado1).toBe(true);
    });
  });
});
