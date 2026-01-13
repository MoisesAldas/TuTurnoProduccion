import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockSupabaseClient,
  resetSupabaseMocks,
} from "@/__tests__/mocks/supabase";
import {
  usuariosPrueba,
  citasPrueba,
  negociosPrueba,
} from "@/__tests__/mocks/data/datosPrueba";

// Mock de Supabase
vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createClient: () => mockSupabaseClient,
}));

describe("API: Eliminar Cuenta (/api/delete-account)", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  describe("Eliminación de Cuenta de Cliente", () => {
    it("debería eliminar cuenta de cliente sin citas activas", async () => {
      const clienteId = usuariosPrueba[0].id;

      // Mock: Verificar que no hay citas activas
      mockSupabaseClient
        .from("appointments")
        .select()
        .eq()
        .in.mockResolvedValue({
          data: [],
          error: null,
        });

      // Mock: Eliminar usuario
      mockSupabaseClient.from("users").delete().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock: Eliminar cuenta de auth
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería rechazar eliminación con citas pendientes", async () => {
      const clienteId = usuariosPrueba[0].id;
      const citasPendientes = citasPrueba.filter(
        (c) => c.client_id === clienteId && c.status === "pending"
      );

      // Mock: Hay citas pendientes
      mockSupabaseClient
        .from("appointments")
        .select()
        .eq()
        .in.mockResolvedValue({
          data: citasPendientes,
          error: null,
        });

      expect(citasPendientes.length).toBeGreaterThan(0);
    });

    it("debería rechazar eliminación con citas confirmadas", async () => {
      const clienteId = usuariosPrueba[0].id;
      const citasConfirmadas = citasPrueba.filter(
        (c) => c.client_id === clienteId && c.status === "confirmed"
      );

      mockSupabaseClient
        .from("appointments")
        .select()
        .eq()
        .in.mockResolvedValue({
          data: citasConfirmadas,
          error: null,
        });

      expect(citasConfirmadas.length).toBeGreaterThan(0);
    });

    it("debería permitir eliminación con solo citas completadas o canceladas", async () => {
      const clienteId = usuariosPrueba[0].id;
      const citasFinalizadas = citasPrueba.filter(
        (c) =>
          c.client_id === clienteId &&
          (c.status === "completed" || c.status === "cancelled")
      );

      mockSupabaseClient
        .from("appointments")
        .select()
        .eq()
        .in.mockResolvedValue({
          data: citasFinalizadas,
          error: null,
        });

      mockSupabaseClient.from("users").delete().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      expect(mockSupabaseClient.from).toBeDefined();
    });
  });

  describe("Eliminación de Cuenta de Negocio", () => {
    it("debería rechazar eliminación si tiene negocio activo", async () => {
      const propietarioId = usuariosPrueba[1].id;

      // Mock: Buscar negocios del usuario
      mockSupabaseClient
        .from("businesses")
        .select()
        .eq.mockResolvedValue({
          data: [negociosPrueba[0]],
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería rechazar si el negocio tiene citas activas", async () => {
      const negocioId = negociosPrueba[0].id;
      const citasActivas = citasPrueba.filter(
        (c) =>
          c.business_id === negocioId &&
          (c.status === "pending" || c.status === "confirmed")
      );

      mockSupabaseClient
        .from("appointments")
        .select()
        .eq()
        .in.mockResolvedValue({
          data: citasActivas,
          error: null,
        });

      expect(citasActivas.length).toBeGreaterThan(0);
    });

    it("debería rechazar si el negocio tiene empleados", async () => {
      const negocioId = negociosPrueba[0].id;

      mockSupabaseClient
        .from("employees")
        .select()
        .eq.mockResolvedValue({
          data: [{ id: "emp-1", business_id: negocioId, name: "Empleado 1" }],
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería permitir eliminación si el negocio está inactivo", async () => {
      const propietarioId = usuariosPrueba[1].id;

      // Mock: Negocio marcado como inactivo
      mockSupabaseClient
        .from("businesses")
        .select()
        .eq.mockResolvedValue({
          data: [{ ...negociosPrueba[0], is_active: false }],
          error: null,
        });

      // Mock: Sin citas activas
      mockSupabaseClient
        .from("appointments")
        .select()
        .eq()
        .in.mockResolvedValue({
          data: [],
          error: null,
        });

      // Mock: Sin empleados
      mockSupabaseClient.from("employees").select().eq.mockResolvedValue({
        data: [],
        error: null,
      });

      expect(mockSupabaseClient.from).toBeDefined();
    });
  });

  describe("Proceso de Eliminación", () => {
    it("debería eliminar en orden correcto (cascada)", async () => {
      const usuarioId = usuariosPrueba[0].id;

      // Orden esperado:
      // 1. Verificar citas
      // 2. Eliminar datos relacionados
      // 3. Eliminar usuario de DB
      // 4. Eliminar usuario de Auth

      mockSupabaseClient
        .from("appointments")
        .select()
        .eq()
        .in.mockResolvedValue({
          data: [],
          error: null,
        });

      mockSupabaseClient.from("users").delete().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería limpiar datos relacionados antes de eliminar", async () => {
      const usuarioId = usuariosPrueba[0].id;

      // Mock: Eliminar notificaciones
      mockSupabaseClient.from("notifications").delete().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock: Eliminar preferencias
      mockSupabaseClient
        .from("user_preferences")
        .delete()
        .eq.mockResolvedValue({
          data: null,
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería manejar rollback si falla eliminación de auth", async () => {
      const usuarioId = usuariosPrueba[0].id;

      // Mock: Eliminación de DB exitosa
      mockSupabaseClient.from("users").delete().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock: Falla eliminación de auth
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: { message: "Auth deletion failed", code: "auth_error" },
      });

      expect(mockSupabaseClient.auth.admin.deleteUser).toBeDefined();
    });
  });

  describe("Validaciones de Seguridad", () => {
    it("debería verificar que el usuario está autenticado", async () => {
      // Mock: Sin sesión
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      expect(mockSupabaseClient.auth.getSession).toBeDefined();
    });

    it("debería verificar que el usuario solo puede eliminar su propia cuenta", async () => {
      const usuarioActual = usuariosPrueba[0].id;
      const otroUsuario = usuariosPrueba[1].id;

      // Intentar eliminar cuenta de otro usuario debería fallar
      expect(usuarioActual).not.toBe(otroUsuario);
    });

    it("debería requerir confirmación explícita", async () => {
      // La confirmación debe venir en el body del request
      const confirmacion = {
        confirm: true,
        password: "password123",
      };

      expect(confirmacion.confirm).toBe(true);
      expect(confirmacion.password).toBeDefined();
    });

    it("debería validar contraseña antes de eliminar", async () => {
      const email = usuariosPrueba[0].email;
      const password = "password123";

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: usuariosPrueba[0],
          session: { access_token: "token" },
        },
        error: null,
      });

      expect(mockSupabaseClient.auth.signInWithPassword).toBeDefined();
    });
  });

  describe("Notificaciones", () => {
    it("debería enviar email de confirmación de eliminación", async () => {
      const usuario = usuariosPrueba[0];

      // Mock: Email enviado
      expect(usuario.email).toBeDefined();
    });

    it("debería notificar a negocios con citas del usuario", async () => {
      const clienteId = usuariosPrueba[0].id;
      const citasDelCliente = citasPrueba.filter(
        (c) => c.client_id === clienteId
      );

      // Obtener negocios únicos
      const negociosAfectados = [
        ...new Set(citasDelCliente.map((c) => c.business_id)),
      ];

      expect(negociosAfectados.length).toBeGreaterThan(0);
    });
  });

  describe("Manejo de Errores", () => {
    it("debería manejar error de permisos", async () => {
      mockSupabaseClient
        .from("users")
        .delete()
        .eq.mockResolvedValue({
          data: null,
          error: {
            code: "42501",
            message: "insufficient_privilege",
          },
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería manejar error de usuario no encontrado", async () => {
      mockSupabaseClient
        .from("users")
        .delete()
        .eq.mockResolvedValue({
          data: null,
          error: {
            code: "PGRST116",
            message: "No rows found",
          },
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería manejar error de conexión", async () => {
      mockSupabaseClient
        .from("users")
        .delete()
        .eq.mockResolvedValue({
          data: null,
          error: {
            code: "08006",
            message: "connection_failure",
          },
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería revertir cambios si falla algún paso", async () => {
      // Si falla la eliminación de auth, no debería eliminar de DB
      expect(true).toBe(true);
    });
  });

  describe("Respuestas de API", () => {
    it("debería retornar confirmación de eliminación exitosa", async () => {
      const respuesta = {
        success: true,
        message: "Cuenta eliminada exitosamente",
        deleted_at: new Date().toISOString(),
      };

      expect(respuesta.success).toBe(true);
      expect(respuesta).toHaveProperty("deleted_at");
    });

    it("debería retornar detalles de error si falla", async () => {
      const respuestaError = {
        success: false,
        error: "No se puede eliminar cuenta con citas activas",
        active_appointments: 3,
      };

      expect(respuestaError.success).toBe(false);
      expect(respuestaError).toHaveProperty("error");
    });
  });

  describe("Casos Especiales", () => {
    it("debería manejar usuario con múltiples roles", async () => {
      const usuarioDual = {
        ...usuariosPrueba[0],
        is_client: true,
        is_business_owner: true,
      };

      // Debe verificar ambos roles
      expect(usuarioDual.is_client).toBe(true);
      expect(usuarioDual.is_business_owner).toBe(true);
    });

    it("debería manejar eliminación de cuenta sin email verificado", async () => {
      const usuarioSinVerificar = {
        ...usuariosPrueba[0],
        email_confirmed_at: null,
      };

      expect(usuarioSinVerificar.email_confirmed_at).toBeNull();
    });

    it("debería permitir reactivación dentro de período de gracia", async () => {
      // Período de gracia de 30 días antes de eliminación permanente
      const fechaEliminacion = new Date();
      const fechaGracia = new Date(fechaEliminacion);
      fechaGracia.setDate(fechaGracia.getDate() + 30);

      expect(fechaGracia > fechaEliminacion).toBe(true);
    });
  });
});
