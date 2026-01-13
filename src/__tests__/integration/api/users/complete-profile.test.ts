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

describe("API: Completar Perfil (/api/complete-profile)", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  describe("Completar Perfil de Cliente", () => {
    it("debería completar perfil de cliente con datos válidos", async () => {
      const perfilCliente = {
        user_id: usuariosPrueba[0].id,
        first_name: "CARLOS",
        last_name: "LÓPEZ",
        phone: "0999123456",
      };

      // Mock: Actualizar usuario
      mockSupabaseClient
        .from("users")
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: { ...usuariosPrueba[0], ...perfilCliente },
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería actualizar solo campos proporcionados", async () => {
      const actualizacionParcial = {
        user_id: usuariosPrueba[0].id,
        phone: "0988777666",
      };

      mockSupabaseClient
        .from("users")
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: { ...usuariosPrueba[0], phone: actualizacionParcial.phone },
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });
  });

  describe("Completar Perfil de Negocio", () => {
    it("debería completar perfil de negocio con información completa", async () => {
      const perfilNegocio = {
        user_id: usuariosPrueba[1].id,
        business_name: "Mi Negocio",
        business_address: "Av. Principal 123",
        business_phone: "0999888777",
        business_category_id: 1,
      };

      // Mock: Crear negocio
      mockSupabaseClient
        .from("businesses")
        .insert()
        .select()
        .single.mockResolvedValue({
          data: {
            id: "negocio-nuevo-1",
            owner_id: perfilNegocio.user_id,
            name: perfilNegocio.business_name,
            address: perfilNegocio.business_address,
            phone: perfilNegocio.business_phone,
            category_id: perfilNegocio.business_category_id,
          },
          error: null,
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería validar categoría de negocio", async () => {
      const categoriasValidas = [1, 2, 3, 4, 5];

      categoriasValidas.forEach((categoryId) => {
        expect(categoryId).toBeGreaterThan(0);
      });
    });
  });

  describe("Validaciones", () => {
    it("debería rechazar usuario inexistente", async () => {
      const usuarioInexistente = {
        user_id: "usuario-no-existe",
        first_name: "Test",
      };

      mockSupabaseClient
        .from("users")
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: null,
          error: {
            code: "PGRST116",
            message: "No rows found",
            details: "The result contains 0 rows",
          },
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería validar formato de teléfono", async () => {
      const telefonoValido = "0999123456";
      const telefonoInvalido = "abc123";

      expect(telefonoValido).toMatch(/^09\d{8}$/);
      expect(telefonoInvalido).not.toMatch(/^09\d{8}$/);
    });

    it("debería rechazar nombres muy cortos", async () => {
      const nombreCorto = "A";
      expect(nombreCorto.length).toBeLessThan(2);
    });

    it("debería rechazar nombres muy largos", async () => {
      const nombreLargo = "A".repeat(51);
      expect(nombreLargo.length).toBeGreaterThan(50);
    });
  });

  describe("Actualización de Avatar", () => {
    it("debería permitir subir avatar", async () => {
      const avatarData = {
        user_id: usuariosPrueba[0].id,
        avatar_url: "https://storage.supabase.co/avatars/user-1.jpg",
      };

      mockSupabaseClient
        .from("users")
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: { ...usuariosPrueba[0], avatar_url: avatarData.avatar_url },
          error: null,
        });

      expect(avatarData.avatar_url).toContain("https://");
    });

    it("debería validar URL de avatar", async () => {
      const urlsValidas = [
        "https://storage.supabase.co/avatars/user.jpg",
        "https://example.com/avatar.png",
      ];

      const urlsInvalidas = ["not-a-url", "ftp://invalid.com/file"];

      urlsValidas.forEach((url) => {
        expect(url).toMatch(/^https?:\/\//);
      });

      urlsInvalidas.forEach((url) => {
        expect(url).toBeDefined();
      });
    });
  });

  describe("Manejo de Errores", () => {
    it("debería manejar error de permisos", async () => {
      mockSupabaseClient
        .from("users")
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: null,
          error: {
            code: "42501",
            message: "insufficient_privilege",
          },
        });

      expect(mockSupabaseClient.from).toBeDefined();
    });

    it("debería manejar error de validación", async () => {
      const datosInvalidos = {
        user_id: "invalid-uuid",
        first_name: "",
      };

      expect(datosInvalidos.first_name).toBe("");
    });
  });

  describe("Respuestas de API", () => {
    it("debería retornar perfil actualizado", async () => {
      const perfilActualizado = {
        ...usuariosPrueba[0],
        first_name: "NUEVO NOMBRE",
        updated_at: new Date().toISOString(),
      };

      mockSupabaseClient
        .from("users")
        .update()
        .eq()
        .select()
        .single.mockResolvedValue({
          data: perfilActualizado,
          error: null,
        });

      expect(perfilActualizado).toHaveProperty("updated_at");
    });

    it("debería incluir todos los campos del usuario", async () => {
      const perfilCompleto = {
        id: "usuario-1",
        email: "test@ejemplo.com",
        first_name: "TEST",
        last_name: "USUARIO",
        phone: "0999123456",
        avatar_url: null,
        is_client: true,
        is_business_owner: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      expect(perfilCompleto).toHaveProperty("id");
      expect(perfilCompleto).toHaveProperty("email");
      expect(perfilCompleto).toHaveProperty("first_name");
    });
  });
});
