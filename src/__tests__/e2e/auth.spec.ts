import { test, expect } from "@playwright/test";

/**
 * Tests E2E para el flujo de autenticación
 *
 * Propósito: Verificar que los usuarios puedan:
 * - Acceder a la página de login
 * - Iniciar sesión con credenciales válidas
 * - Ver errores con credenciales inválidas
 * - Cerrar sesión correctamente
 */

test.describe("Autenticación de Usuario", () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de login antes de cada test
    await page.goto("/");
  });

  test("debería mostrar la página de login", async ({ page }) => {
    // Verificar que la página de login carga correctamente
    await expect(page).toHaveTitle(/TuTurno/);

    // Verificar que los elementos principales están presentes
    await expect(
      page.getByRole("heading", { name: /iniciar sesión/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/contraseña/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /iniciar sesión/i })
    ).toBeVisible();
  });

  test("debería mostrar botón de Google OAuth", async ({ page }) => {
    // Verificar que el botón de Google está presente
    const googleButton = page.getByRole("button", { name: /google/i });
    await expect(googleButton).toBeVisible();
  });

  test("debería navegar a página de registro", async ({ page }) => {
    // Click en el enlace de registro
    await page.getByRole("link", { name: /registrarse/i }).click();

    // Verificar que navegó a la página de registro
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: /crear cuenta/i })
    ).toBeVisible();
  });

  test("debería mostrar error con credenciales inválidas", async ({ page }) => {
    // Intentar login con credenciales incorrectas
    await page.getByPlaceholder(/email/i).fill("usuario@invalido.com");
    await page.getByPlaceholder(/contraseña/i).fill("passwordincorrecto");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    // Verificar que muestra mensaje de error
    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("debería validar formato de email", async ({ page }) => {
    // Intentar con email inválido
    await page.getByPlaceholder(/email/i).fill("no-es-un-email");
    await page.getByPlaceholder(/contraseña/i).fill("password123");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    // Verificar validación de HTML5 o mensaje de error
    const emailInput = page.getByPlaceholder(/email/i);
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });

  test.skip("debería iniciar sesión exitosamente", async ({ page }) => {
    // NOTA: Este test requiere credenciales reales o un usuario de prueba
    // Se marca como skip para no fallar en CI/CD

    await page.getByPlaceholder(/email/i).fill("test@ejemplo.com");
    await page.getByPlaceholder(/contraseña/i).fill("TestPassword123!");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    // Verificar redirección al dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test.skip("debería cerrar sesión correctamente", async ({ page }) => {
    // NOTA: Requiere estar autenticado primero
    // Se marca como skip para no fallar en CI/CD

    // Asumiendo que ya estamos autenticados
    await page.goto("/dashboard");

    // Click en botón de cerrar sesión
    await page.getByRole("button", { name: /cerrar sesión/i }).click();

    // Verificar redirección a login
    await expect(page).toHaveURL("/");
  });
});

test.describe("Recuperación de Contraseña", () => {
  test("debería mostrar formulario de recuperación", async ({ page }) => {
    await page.goto("/");

    // Click en "Olvidé mi contraseña"
    await page.getByRole("link", { name: /olvidé mi contraseña/i }).click();

    // Verificar formulario de recuperación
    await expect(
      page.getByRole("heading", { name: /recuperar contraseña/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test("debería validar email en recuperación", async ({ page }) => {
    await page.goto("/forgot-password");

    // Intentar con email inválido
    await page.getByPlaceholder(/email/i).fill("invalido");
    await page.getByRole("button", { name: /enviar/i }).click();

    // Verificar validación
    const emailInput = page.getByPlaceholder(/email/i);
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });
});

test.describe("Registro de Usuario", () => {
  test("debería mostrar formulario de registro", async ({ page }) => {
    await page.goto("/register");

    // Verificar campos del formulario
    await expect(page.getByPlaceholder(/nombre/i)).toBeVisible();
    await expect(page.getByPlaceholder(/apellido/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/contraseña/i)).toBeVisible();
  });

  test("debería validar campos requeridos", async ({ page }) => {
    await page.goto("/register");

    // Intentar registrarse sin llenar campos
    await page.getByRole("button", { name: /registrarse/i }).click();

    // Verificar que no permite submit
    await expect(page).toHaveURL(/\/register/);
  });

  test("debería validar formato de contraseña", async ({ page }) => {
    await page.goto("/register");

    await page.getByPlaceholder(/nombre/i).fill("Juan");
    await page.getByPlaceholder(/apellido/i).fill("Pérez");
    await page.getByPlaceholder(/email/i).fill("juan@ejemplo.com");
    await page.getByPlaceholder(/contraseña/i).fill("corta");

    await page.getByRole("button", { name: /registrarse/i }).click();

    // Verificar mensaje de error de contraseña débil
    await expect(page.getByText(/contraseña debe tener/i)).toBeVisible({
      timeout: 3000,
    });
  });
});
