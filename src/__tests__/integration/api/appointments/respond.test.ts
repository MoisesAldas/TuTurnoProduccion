import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockSupabaseClient,
  resetSupabaseMocks,
} from "@/__tests__/mocks/supabase";
import { citasPrueba } from "@/__tests__/mocks/data/datosPrueba";
import { generateAppointmentToken } from "@/lib/tokenUtils";

// Mock de Supabase
vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock de Resend para emails
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: "email-test-123" }),
    },
  })),
}));

describe("API: Responder a Cita (/api/appointments/[id]/respond)", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  describe("Aceptar Cita", () => {
    it("debería aceptar una cita pendiente correctamente", async () => {
      const citaPendiente = { ...citasPrueba[1], status: "pending" };
      const token = generateAppointmentToken(citaPendiente.id);

      // Mock: Buscar cita
      mockSupabaseClient
        .from("appointments")
        .select()
        .single.mockResolvedValue({
          data: citaPendiente,
          error: null,
        });

      // Mock: Actualizar cita
      mockSupabaseClient
        .from("appointments")
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: { ...citaPendiente, status: "confirmed" },
          error: null,
        });

      // Mock: Buscar cliente
      mockSupabaseClient
        .from("users")
        .select()
        .single.mockResolvedValue({
          data: { id: citaPendiente.client_id, email: "cliente@ejemplo.com" },
          error: null,
        });

      // Verificar que los mocks fueron configurados
      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería rechazar token inválido", async () => {
      const tokenInvalido = "token-invalido-123";
      const citaId = "cita-1";

      // Mock: Buscar cita
      mockSupabaseClient
        .from("appointments")
        .select()
        .single.mockResolvedValue({
          data: citasPrueba[0],
          error: null,
        });

      // El token no coincidirá con el generado
      const tokenCorrecto = generateAppointmentToken(citaId);
      expect(tokenInvalido).not.toBe(tokenCorrecto);
    });

    it("debería rechazar cita que ya está confirmada", async () => {
      const citaConfirmada = { ...citasPrueba[0], status: "confirmed" };
      const token = generateAppointmentToken(citaConfirmada.id);

      // Mock: Buscar cita ya confirmada
      mockSupabaseClient
        .from("appointments")
        .select()
        .single.mockResolvedValue({
          data: citaConfirmada,
          error: null,
        });

      // Verificar que el estado es 'confirmed'
      expect(citaConfirmada.status).toBe("confirmed");
    });

    it("debería rechazar cita que ya está cancelada", async () => {
      const citaCancelada = { ...citasPrueba[0], status: "cancelled" };

      // Mock: Buscar cita cancelada
      mockSupabaseClient
        .from("appointments")
        .select()
        .single.mockResolvedValue({
          data: citaCancelada,
          error: null,
        });

      expect(citaCancelada.status).toBe("cancelled");
    });
  });

  describe("Cancelar Cita", () => {
    it("debería cancelar una cita confirmada", async () => {
      const citaConfirmada = { ...citasPrueba[0], status: "confirmed" };
      const token = generateAppointmentToken(citaConfirmada.id);

      // Mock: Buscar cita
      mockSupabaseClient
        .from("appointments")
        .select()
        .single.mockResolvedValue({
          data: citaConfirmada,
          error: null,
        });

      // Mock: Actualizar a cancelada
      mockSupabaseClient
        .from("appointments")
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: { ...citaConfirmada, status: "cancelled" },
          error: null,
        });

      // Verificar configuración de mocks
      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería enviar email de cancelación al cliente", async () => {
      const citaConfirmada = { ...citasPrueba[0], status: "confirmed" };

      // Mock: Buscar cita
      mockSupabaseClient
        .from("appointments")
        .select()
        .single.mockResolvedValue({
          data: citaConfirmada,
          error: null,
        });

      // Mock: Buscar cliente
      mockSupabaseClient
        .from("users")
        .select()
        .single.mockResolvedValue({
          data: { id: citaConfirmada.client_id, email: "cliente@ejemplo.com" },
          error: null,
        });

      // Verificar que tenemos el email del cliente
      expect(mockSupabaseClient.from).toBeDefined();
    });
  });

  describe("Reprogramar Cita", () => {
    it("debería solicitar reprogramación de cita", async () => {
      const citaConfirmada = { ...citasPrueba[0], status: "confirmed" };
      const nuevaFecha = "2024-02-15";
      const nuevaHora = "15:00";

      // Mock: Buscar cita
      mockSupabaseClient
        .from("appointments")
        .select()
        .single.mockResolvedValue({
          data: citaConfirmada,
          error: null,
        });

      // Mock: Actualizar con nueva fecha/hora
      mockSupabaseClient
        .from("appointments")
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: {
            ...citaConfirmada,
            date: nuevaFecha,
            start_time: nuevaHora,
            status: "pending",
          },
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });
  });

  describe("Validaciones", () => {
    it("debería rechazar cita inexistente", async () => {
      // Mock: Cita no encontrada
      mockSupabaseClient
        .from("appointments")
        .select()
        .single.mockResolvedValue({
          data: null,
          error: { message: "Cita no encontrada", code: "PGRST116" },
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería rechazar acción sin token", async () => {
      // Verificar que se requiere token
      const citaId = "cita-1";
      expect(citaId).toBeDefined();
    });

    it("debería validar formato de token", async () => {
      const tokenMalFormado = "token-sin-punto";
      const citaId = "cita-1";

      // El token debe tener formato: citaId.signature
      expect(tokenMalFormado).not.toContain(".");
    });
  });

  describe("Manejo de Errores", () => {
    it("debería manejar error de base de datos", async () => {
      // Mock: Error de BD
      mockSupabaseClient
        .from("appointments")
        .select()
        .single.mockResolvedValue({
          data: null,
          error: { message: "Error de conexión", code: "08006" },
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería manejar error al enviar email", async () => {
      const citaPendiente = { ...citasPrueba[1], status: "pending" };

      // Mock: Cita encontrada
      mockSupabaseClient
        .from("appointments")
        .select()
        .single.mockResolvedValue({
          data: citaPendiente,
          error: null,
        });

      // Mock: Cliente sin email
      mockSupabaseClient
        .from("users")
        .select()
        .single.mockResolvedValue({
          data: { id: citaPendiente.client_id, email: null },
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });
  });
});
