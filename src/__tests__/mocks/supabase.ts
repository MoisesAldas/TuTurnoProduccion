import { vi } from "vitest";

// Mock del cliente de Supabase
export const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  delete: vi.fn(() => mockSupabaseClient),
  upsert: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  neq: vi.fn(() => mockSupabaseClient),
  gt: vi.fn(() => mockSupabaseClient),
  gte: vi.fn(() => mockSupabaseClient),
  lt: vi.fn(() => mockSupabaseClient),
  lte: vi.fn(() => mockSupabaseClient),
  like: vi.fn(() => mockSupabaseClient),
  ilike: vi.fn(() => mockSupabaseClient),
  in: vi.fn(() => mockSupabaseClient),
  contains: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
  limit: vi.fn(() => mockSupabaseClient),
  range: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
  maybeSingle: vi.fn(),
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
    on: vi.fn(() => ({
      subscribe: vi.fn(),
    })),
    unsubscribe: vi.fn(),
  })),
};

// Función helper para resetear todos los mocks
export const resetSupabaseMocks = () => {
  Object.values(mockSupabaseClient).forEach((mock) => {
    if (typeof mock === "function" && "mockClear" in mock) {
      mock.mockClear();
    }
  });
  Object.values(mockSupabaseClient.auth).forEach((mock) => {
    if (typeof mock === "function" && "mockClear" in mock) {
      mock.mockClear();
    }
  });
};
