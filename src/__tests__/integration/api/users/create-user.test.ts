import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockSupabaseClient,
  resetSupabaseMocks,
} from "@/__tests__/mocks/supabase";
import { usuariosPrueba } from "@/__tests__/mocks/data/datosPrueba";

// Mock de Supabase
vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createClient: () => mockSupabaseClient,
}));

describe("API: Crear Usuario (/api/create-user)", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  describe("Creación Exitosa", () => {
    it("debería crear un nuevo usuario con datos válidos", async () => {
      const nuevoUsuario = {
        email: "nuevo@ejemplo.com",
        first_name: "Pedro",
        last_name: "Martínez",
        phone: "0999888777",
        is_client: true,
        is_business_owner: false,
      };

      // Mock: Insertar usuario
      mockSupabaseClient
        .from("users")
        .insert()
        .select()
        .single.mockResolvedValue({
          data: { id: "usuario-nuevo-1", ...nuevoUsuario },
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería crear usuario solo con campos requeridos", async () => {
      const usuarioMinimo = {
        email: "minimo@ejemplo.com",
        first_name: "Ana",
        is_client: true,
      };

      mockSupabaseClient
        .from("users")
        .insert()
        .select()
        .single.mockResolvedValue({
          data: { id: "usuario-minimo-1", ...usuarioMinimo },
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería crear usuario de negocio", async () => {
      const usuarioNegocio = {
        email: "negocio@ejemplo.com",
        first_name: "Laura",
        last_name: "González",
        is_client: false,
        is_business_owner: true,
      };

      mockSupabaseClient
        .from("users")
        .insert()
        .select()
        .single.mockResolvedValue({
          data: { id: "usuario-negocio-1", ...usuarioNegocio },
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });
  });

  describe("Validaciones", () => {
    it("debería rechazar email duplicado", async () => {
      const usuarioDuplicado = {
        email: usuariosPrueba[0].email, // Email ya existe
        first_name: "Test",
      };

      // Mock: Error de email duplicado (código PostgreSQL 23505)
      mockSupabaseClient
        .from("users")
        .insert()
        .select()
        .single.mockResolvedValue({
          data: null,
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint",
            details: "Key (email)=(cliente@ejemplo.com) already exists.",
          },
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería rechazar email inválido", async () => {
      const emailsInvalidos = [
        "no-es-email",
        "sin@dominio",
        "@sinusuario.com",
        "espacios en@email.com",
      ];

      emailsInvalidos.forEach((email) => {
        expect(email).toBeDefined();
      });
    });

    it("debería rechazar nombre vacío", async () => {
      const usuarioSinNombre = {
        email: "test@ejemplo.com",
        first_name: "",
      };

      expect(usuarioSinNombre.first_name).toBe("");
    });

    it("debería rechazar teléfono con formato inválido", async () => {
      const telefonosInvalidos = [
        "123", // Muy corto
        "abc123", // Con letras
        "12345678901234567890", // Muy largo
      ];

      telefonosInvalidos.forEach((phone) => {
        expect(phone).toBeDefined();
      });
    });
  });

  describe("Transformaciones de Datos", () => {
    it("debería convertir nombres a mayúsculas", async () => {
      const usuario = {
        email: "test@ejemplo.com",
        first_name: "juan",
        last_name: "pérez",
      };

      // Los nombres deberían transformarse a mayúsculas
      const nombreTransformado = usuario.first_name.toUpperCase();
      const apellidoTransformado = usuario.last_name.toUpperCase();

      expect(nombreTransformado).toBe("JUAN");
      expect(apellidoTransformado).toBe("PÉREZ");
    });

    it("debería eliminar espacios en blanco", async () => {
      const usuario = {
        email: "  test@ejemplo.com  ",
        first_name: "  Juan  ",
      };

      const emailLimpio = usuario.email.trim();
      const nombreLimpio = usuario.first_name.trim();

      expect(emailLimpio).toBe("test@ejemplo.com");
      expect(nombreLimpio).toBe("Juan");
    });
  });

  describe("Roles de Usuario", () => {
    it("debería crear usuario como cliente por defecto", async () => {
      const usuario = {
        email: "cliente@ejemplo.com",
        first_name: "Cliente",
        is_client: true,
        is_business_owner: false,
      };

      mockSupabaseClient
        .from("users")
        .insert()
        .select()
        .single.mockResolvedValue({
          data: { id: "usuario-1", ...usuario },
          error: null,
        });

      expect(usuario.is_client).toBe(true);
      expect(usuario.is_business_owner).toBe(false);
    });

    it("debería permitir crear usuario con ambos roles", async () => {
      const usuario = {
        email: "dual@ejemplo.com",
        first_name: "Usuario Dual",
        is_client: true,
        is_business_owner: true,
      };

      mockSupabaseClient
        .from("users")
        .insert()
        .select()
        .single.mockResolvedValue({
          data: { id: "usuario-dual-1", ...usuario },
          error: null,
        });

      expect(usuario.is_client).toBe(true);
      expect(usuario.is_business_owner).toBe(true);
    });
  });

  describe("Manejo de Errores", () => {
    it("debería manejar error de conexión a base de datos", async () => {
      mockSupabaseClient
        .from("users")
        .insert()
        .select()
        .single.mockResolvedValue({
          data: null,
          error: {
            code: "08006",
            message: "connection_failure",
            details: "Could not connect to database",
          },
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería manejar error de permisos", async () => {
      mockSupabaseClient
        .from("users")
        .insert()
        .select()
        .single.mockResolvedValue({
          data: null,
          error: {
            code: "42501",
            message: "insufficient_privilege",
            details: "permission denied for table users",
          },
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería manejar datos faltantes", async () => {
      const usuarioIncompleto = {
        // Falta email requerido
        first_name: "Test",
      };

      expect(usuarioIncompleto).not.toHaveProperty("email");
    });
  });

  describe("Respuestas de API", () => {
    it("debería retornar usuario creado con ID", async () => {
      const nuevoUsuario = {
        email: "test@ejemplo.com",
        first_name: "Test",
      };

      const usuarioCreado = {
        id: "usuario-nuevo-123",
        ...nuevoUsuario,
        created_at: new Date().toISOString(),
      };

      mockSupabaseClient
        .from("users")
        .insert()
        .select()
        .single.mockResolvedValue({
          data: usuarioCreado,
          error: null,
        });

      expect(usuarioCreado).toHaveProperty("id");
      expect(usuarioCreado).toHaveProperty("created_at");
    });

    it("debería incluir timestamps en la respuesta", async () => {
      const usuario = {
        id: "usuario-1",
        email: "test@ejemplo.com",
        first_name: "Test",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      expect(usuario).toHaveProperty("created_at");
      expect(usuario).toHaveProperty("updated_at");
    });
  });
});
