import { describe, it, expect } from "vitest";

describe("Configuración de Testing", () => {
  it("debería ejecutar tests correctamente", () => {
    expect(true).toBe(true);
  });

  it("debería poder usar matemáticas básicas", () => {
    const suma = 2 + 2;
    expect(suma).toBe(4);
  });

  it("debería poder trabajar con strings", () => {
    const saludo = "Hola Mundo";
    expect(saludo).toContain("Mundo");
  });
});
