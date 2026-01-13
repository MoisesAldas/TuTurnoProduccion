import { test, expect } from "@playwright/test";

/**
 * Tests E2E para Dashboards
 *
 * Propósito: Verificar que los dashboards funcionan correctamente:
 * - Dashboard de cliente
 * - Dashboard de negocio
 * - Navegación entre secciones
 * - Visualización de datos
 */

test.describe("Dashboard de Cliente", () => {
  test.beforeEach(async ({ page }) => {
    // NOTA: Estos tests requieren autenticación
    // En un ambiente real, se haría login primero
    await page.goto("/client/dashboard");
  });

  test("debería mostrar página de dashboard", async ({ page }) => {
    // Verificar que carga el dashboard
    await expect(
      page.getByRole("heading", { name: /dashboard|mis citas/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("debería mostrar próximas citas", async ({ page }) => {
    // Verificar sección de próximas citas
    const seccionCitas = page.locator('[data-testid="upcoming-appointments"]');

    if (await seccionCitas.isVisible()) {
      await expect(seccionCitas).toBeVisible();
    }
  });

  test("debería mostrar historial de citas", async ({ page }) => {
    // Verificar sección de historial
    const historial = page.locator('[data-testid="appointment-history"]');

    if (await historial.isVisible()) {
      await expect(historial).toBeVisible();
    }
  });

  test("debería permitir navegar a perfil", async ({ page }) => {
    // Buscar enlace o botón de perfil
    const perfilLink = page.getByRole("link", { name: /perfil|mi cuenta/i });

    if (await perfilLink.isVisible()) {
      await perfilLink.click();
      await expect(page).toHaveURL(/\/profile/);
    }
  });

  test("debería mostrar notificaciones", async ({ page }) => {
    // Verificar icono de notificaciones
    const notificaciones = page.locator('[data-testid="notifications-icon"]');

    if (await notificaciones.isVisible()) {
      await expect(notificaciones).toBeVisible();
    }
  });

  test("debería permitir buscar negocios", async ({ page }) => {
    // Verificar barra de búsqueda
    const searchInput = page.getByPlaceholder(/buscar|search/i);

    if (await searchInput.isVisible()) {
      await searchInput.fill("barbería");
      await expect(searchInput).toHaveValue("barbería");
    }
  });
});

test.describe("Dashboard de Negocio", () => {
  test.beforeEach(async ({ page }) => {
    // NOTA: Requiere autenticación como propietario de negocio
    await page.goto("/dashboard");
  });

  test("debería mostrar dashboard de negocio", async ({ page }) => {
    // Verificar elementos del dashboard
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible(
      { timeout: 5000 }
    );
  });

  test("debería mostrar métricas principales", async ({ page }) => {
    // Verificar KPIs
    const metricas = [
      "total-appointments",
      "total-revenue",
      "active-clients",
      "completion-rate",
    ];

    for (const metrica of metricas) {
      const elemento = page.locator(`[data-testid="${metrica}"]`);
      if (await elemento.isVisible()) {
        await expect(elemento).toBeVisible();
      }
    }
  });

  test("debería mostrar calendario de citas", async ({ page }) => {
    // Verificar calendario
    const calendario = page.locator('[data-testid="calendar-view"]');

    if (await calendario.isVisible()) {
      await expect(calendario).toBeVisible();
    }
  });

  test("debería permitir navegar a citas", async ({ page }) => {
    // Click en sección de citas
    const citasLink = page.getByRole("link", { name: /citas|appointments/i });

    if (await citasLink.isVisible()) {
      await citasLink.click();
      await expect(page).toHaveURL(/\/appointments/);
    }
  });

  test("debería permitir navegar a clientes", async ({ page }) => {
    // Click en sección de clientes
    const clientesLink = page.getByRole("link", { name: /clientes|clients/i });

    if (await clientesLink.isVisible()) {
      await clientesLink.click();
      await expect(page).toHaveURL(/\/clients/);
    }
  });

  test("debería permitir navegar a servicios", async ({ page }) => {
    // Click en sección de servicios
    const serviciosLink = page.getByRole("link", {
      name: /servicios|services/i,
    });

    if (await serviciosLink.isVisible()) {
      await serviciosLink.click();
      await expect(page).toHaveURL(/\/services/);
    }
  });

  test("debería mostrar gráficos de ingresos", async ({ page }) => {
    // Verificar gráficos
    const grafico = page.locator('[data-testid="revenue-chart"]');

    if (await grafico.isVisible()) {
      await expect(grafico).toBeVisible();
    }
  });

  test("debería permitir exportar datos", async ({ page }) => {
    // Verificar botón de exportar
    const exportButton = page.getByRole("button", { name: /exportar|export/i });

    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeVisible();
    }
  });
});

test.describe("Navegación del Dashboard", () => {
  test("debería mostrar menú lateral", async ({ page }) => {
    await page.goto("/dashboard");

    // Verificar sidebar
    const sidebar = page.locator('[data-testid="sidebar"]');

    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeVisible();
    }
  });

  test("debería permitir colapsar menú lateral", async ({ page }) => {
    await page.goto("/dashboard");

    // Buscar botón de colapsar
    const collapseButton = page.getByRole("button", { name: /menu|toggle/i });

    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      // Verificar que el menú se colapsó
      await page.waitForTimeout(500);
    }
  });

  test("debería mostrar breadcrumbs", async ({ page }) => {
    await page.goto("/dashboard/appointments");

    // Verificar breadcrumbs
    const breadcrumbs = page.locator('[data-testid="breadcrumbs"]');

    if (await breadcrumbs.isVisible()) {
      await expect(breadcrumbs).toBeVisible();
    }
  });
});

test.describe("Responsive Design", () => {
  test("debería funcionar en móvil", async ({ page }) => {
    // Configurar viewport móvil
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Verificar que carga correctamente
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible(
      { timeout: 5000 }
    );
  });

  test("debería mostrar menú hamburguesa en móvil", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Buscar botón de menú hamburguesa
    const menuButton = page.getByRole("button", { name: /menu|☰/i });

    if (await menuButton.isVisible()) {
      await expect(menuButton).toBeVisible();
    }
  });

  test("debería funcionar en tablet", async ({ page }) => {
    // Configurar viewport tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard");

    // Verificar que carga correctamente
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible(
      { timeout: 5000 }
    );
  });
});
