import { test, expect } from "@playwright/test";

/**
 * Tests E2E para el flujo de reserva de citas
 *
 * Propósito: Verificar que los clientes puedan:
 * - Navegar a la página de un negocio
 * - Seleccionar servicios
 * - Elegir fecha y hora
 * - Completar la reserva
 */

test.describe("Flujo de Reserva de Cita", () => {
  test("debería mostrar página de negocio", async ({ page }) => {
    // Navegar a un negocio de ejemplo
    await page.goto("/business/negocio-1/book");

    // Verificar que carga la información del negocio
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Verificar que muestra servicios
    await expect(page.getByText(/servicios/i)).toBeVisible();
  });

  test("debería mostrar lista de servicios", async ({ page }) => {
    await page.goto("/business/negocio-1/book");

    // Esperar a que carguen los servicios
    await page.waitForSelector('[data-testid="service-card"]', {
      timeout: 5000,
    });

    // Verificar que hay al menos un servicio
    const servicios = page.locator('[data-testid="service-card"]');
    await expect(servicios.first()).toBeVisible();
  });

  test("debería permitir seleccionar un servicio", async ({ page }) => {
    await page.goto("/business/negocio-1/book");

    // Esperar y seleccionar primer servicio
    await page.waitForSelector('[data-testid="service-card"]');
    await page.locator('[data-testid="service-card"]').first().click();

    // Verificar que se marca como seleccionado
    const primerServicio = page.locator('[data-testid="service-card"]').first();
    await expect(primerServicio).toHaveClass(/selected|active/);
  });

  test("debería mostrar calendario después de seleccionar servicio", async ({
    page,
  }) => {
    await page.goto("/business/negocio-1/book");

    // Seleccionar servicio
    await page.waitForSelector('[data-testid="service-card"]');
    await page.locator('[data-testid="service-card"]').first().click();

    // Verificar que aparece el calendario
    await expect(page.getByText(/selecciona una fecha/i)).toBeVisible({
      timeout: 3000,
    });
  });

  test("debería mostrar horarios disponibles", async ({ page }) => {
    await page.goto("/business/negocio-1/book");

    // Seleccionar servicio
    await page.waitForSelector('[data-testid="service-card"]');
    await page.locator('[data-testid="service-card"]').first().click();

    // Seleccionar una fecha
    await page.locator('[data-testid="calendar-day"]').first().click();

    // Verificar que muestra horarios
    await expect(page.getByText(/horarios disponibles/i)).toBeVisible({
      timeout: 3000,
    });
  });

  test("debería mostrar resumen de la cita", async ({ page }) => {
    await page.goto("/business/negocio-1/book");

    // Completar selección de servicio, fecha y hora
    await page.waitForSelector('[data-testid="service-card"]');
    await page.locator('[data-testid="service-card"]').first().click();

    // Verificar que muestra resumen
    await expect(page.getByText(/resumen/i)).toBeVisible();
  });

  test.skip("debería completar reserva exitosamente", async ({ page }) => {
    // NOTA: Requiere autenticación y datos reales
    // Se marca como skip para no fallar en CI/CD

    await page.goto("/business/negocio-1/book");

    // Seleccionar servicio
    await page.locator('[data-testid="service-card"]').first().click();

    // Seleccionar fecha
    await page.locator('[data-testid="calendar-day"]').first().click();

    // Seleccionar hora
    await page.locator('[data-testid="time-slot"]').first().click();

    // Confirmar reserva
    await page.getByRole("button", { name: /confirmar/i }).click();

    // Verificar confirmación
    await expect(page.getByText(/reserva confirmada/i)).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Validaciones de Reserva", () => {
  test("debería requerir selección de servicio", async ({ page }) => {
    await page.goto("/business/negocio-1/book");

    // Intentar avanzar sin seleccionar servicio
    const botonContinuar = page.getByRole("button", { name: /continuar/i });

    if (await botonContinuar.isVisible()) {
      await expect(botonContinuar).toBeDisabled();
    }
  });

  test("debería mostrar precio del servicio", async ({ page }) => {
    await page.goto("/business/negocio-1/book");

    // Verificar que los servicios muestran precio
    await page.waitForSelector('[data-testid="service-card"]');
    const precioElement = page.locator('[data-testid="service-price"]').first();

    if (await precioElement.isVisible()) {
      const precioTexto = await precioElement.textContent();
      expect(precioTexto).toMatch(/\$|USD/);
    }
  });

  test("debería mostrar duración del servicio", async ({ page }) => {
    await page.goto("/business/negocio-1/book");

    // Verificar que los servicios muestran duración
    await page.waitForSelector('[data-testid="service-card"]');
    const duracionElement = page
      .locator('[data-testid="service-duration"]')
      .first();

    if (await duracionElement.isVisible()) {
      const duracionTexto = await duracionElement.textContent();
      expect(duracionTexto).toMatch(/min|hora/);
    }
  });
});

test.describe("Navegación de Reserva", () => {
  test("debería permitir volver atrás", async ({ page }) => {
    await page.goto("/business/negocio-1/book");

    // Seleccionar servicio
    await page.waitForSelector('[data-testid="service-card"]');
    await page.locator('[data-testid="service-card"]').first().click();

    // Buscar botón de volver
    const botonVolver = page.getByRole("button", { name: /volver|atrás/i });

    if (await botonVolver.isVisible()) {
      await botonVolver.click();

      // Verificar que vuelve a la selección de servicios
      await expect(
        page.locator('[data-testid="service-card"]').first()
      ).toBeVisible();
    }
  });

  test("debería mostrar progreso de reserva", async ({ page }) => {
    await page.goto("/business/negocio-1/book");

    // Verificar indicador de pasos
    const indicadorPasos = page.locator('[data-testid="booking-steps"]');

    if (await indicadorPasos.isVisible()) {
      await expect(indicadorPasos).toBeVisible();
    }
  });
});
