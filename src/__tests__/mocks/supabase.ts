import { vi } from "vitest";

// Mock del cliente de Supabase
export const mockSupabaseClient: any = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  like: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  // Terminal methods - estos NO deben hacer mockReturnThis para que mockResolvedValue funcione
  single: vi.fn(),
  maybeSingle: vi.fn(),
  csv: vi.fn().mockReturnThis(),
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    updateUser: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    admin: {
      deleteUser: vi.fn(),
      createUser: vi.fn(),
      updateUserById: vi.fn(),
      listUsers: vi.fn(),
    },
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
      getPublicUrl: vi.fn(),
    })),
  },
  rpc: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  })),
};

// Función helper para resetear todos los mocks
export const resetSupabaseMocks = () => {
  const resetAllMocks = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === "function" && obj[key].mockClear) {
        obj[key].mockClear();
        // Restaurar mockReturnThis para métodos de cadena
        if (
          [
            "from",
            "select",
            "insert",
            "update",
            "delete",
            "upsert",
            "eq",
            "neq",
            "gt",
            "gte",
            "lt",
            "lte",
            "in",
            "order",
            "limit",
            "range",
            "like",
            "ilike",
            "contains",
            "csv",
          ].includes(key)
        ) {
          obj[key].mockReturnThis();
        }
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        resetAllMocks(obj[key]);
      }
    }
  };
  resetAllMocks(mockSupabaseClient);
};
