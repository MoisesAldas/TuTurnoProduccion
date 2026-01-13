import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi, beforeAll } from "vitest";

// Setup de variables de entorno para tests
beforeAll(() => {
  process.env.APPOINTMENT_TOKEN_SECRET = "test-secret-key-for-testing-12345";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
});

// Cleanup después de cada test
afterEach(() => {
  cleanup();
});

// Mock de Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock de Supabase client
vi.mock("@/lib/supabaseClient", () => ({
  createClient: vi.fn(),
}));
