import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    // Excluir SOLO tests E2E (Playwright)
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/src/__tests__/e2e/**", // Solo excluir carpeta e2e
      "**/*.spec.ts", // Solo archivos .spec.ts (Playwright)
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "json", "html"],
      clean: false, // ✅ NO limpiar coverage
      exclude: [
        "node_modules/**",
        "src/__tests__/**",
        "**/*.d.ts",
        "dist/**",
        ".next/**",
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
    // Continuar build incluso si tests fallan
    passWithNoTests: true,
    bail: 0,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
