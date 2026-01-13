import { describe, it, expect } from "vitest";
import {
  firstNameSchema,
  lastNameSchema,
  phoneSchema,
  requiredPhoneSchema,
  emailSchema,
  requiredEmailSchema,
  priceSchema,
  timeSchema,
  dateSchema,
  passwordSchema,
  businessNameSchema,
  employeeFormSchema,
  serviceFormSchema,
} from "@/lib/validation";

describe("Esquemas de Validación", () => {
  describe("Validación de Nombres", () => {
    it("debería aceptar nombres válidos", () => {
      expect(firstNameSchema.parse("Juan")).toBe("JUAN");
      expect(firstNameSchema.parse("maría")).toBe("MARÍA");
      expect(lastNameSchema.parse("pérez")).toBe("PÉREZ");
    });

    it("debería convertir a mayúsculas automáticamente", () => {
      expect(firstNameSchema.parse("carlos")).toBe("CARLOS");
      expect(firstNameSchema.parse("María José")).toBe("MARÍA JOSÉ");
    });

    it("debería eliminar espacios al inicio y final", () => {
      expect(firstNameSchema.parse("  Juan  ")).toBe("JUAN");
    });

    it("debería rechazar nombres muy cortos", () => {
      expect(() => firstNameSchema.parse("A")).toThrow("al menos 2 caracteres");
    });

    it("debería rechazar nombres muy largos", () => {
      const nombreLargo = "A".repeat(51);
      expect(() => firstNameSchema.parse(nombreLargo)).toThrow(
        "No puede exceder 50 caracteres"
      );
    });

    it("debería rechazar nombres con números", () => {
      expect(() => firstNameSchema.parse("Juan123")).toThrow(
        "Solo puede contener letras"
      );
    });

    it("debería aceptar caracteres españoles", () => {
      expect(firstNameSchema.parse("José")).toBe("JOSÉ");
      expect(firstNameSchema.parse("Ñoño")).toBe("ÑOÑO");
      expect(firstNameSchema.parse("Raúl")).toBe("RAÚL");
    });
  });

  describe("Validación de Teléfono", () => {
    it("debería aceptar teléfonos válidos de Ecuador", () => {
      expect(phoneSchema.parse("0999123456")).toBe("0999123456");
      expect(phoneSchema.parse("0987654321")).toBe("0987654321");
    });

    it("debería aceptar string vacío como opcional", () => {
      expect(phoneSchema.parse("")).toBe("");
    });

    it("debería rechazar teléfonos que no empiezan con 09", () => {
      expect(() => requiredPhoneSchema.parse("1234567890")).toThrow(
        "teléfono válido de Ecuador"
      );
    });

    it("debería rechazar teléfonos con menos de 10 dígitos", () => {
      expect(() => requiredPhoneSchema.parse("099912345")).toThrow(
        "teléfono válido de Ecuador"
      );
    });

    it("debería rechazar teléfonos con más de 10 dígitos", () => {
      expect(() => requiredPhoneSchema.parse("09991234567")).toThrow(
        "teléfono válido de Ecuador"
      );
    });

    it("debería rechazar teléfonos con letras", () => {
      expect(() => requiredPhoneSchema.parse("099912345a")).toThrow(
        "teléfono válido de Ecuador"
      );
    });
  });

  describe("Validación de Email", () => {
    it("debería aceptar emails válidos", () => {
      expect(emailSchema.parse("test@ejemplo.com")).toBe("test@ejemplo.com");
      expect(emailSchema.parse("usuario@dominio.ec")).toBe(
        "usuario@dominio.ec"
      );
    });

    it("debería aceptar string vacío como opcional", () => {
      expect(emailSchema.parse("")).toBe("");
    });

    it("debería rechazar emails inválidos", () => {
      expect(() => requiredEmailSchema.parse("no-es-email")).toThrow(
        "email válido"
      );
      expect(() => requiredEmailSchema.parse("sin@dominio")).toThrow(
        "email válido"
      );
      expect(() => requiredEmailSchema.parse("@sinusuario.com")).toThrow(
        "email válido"
      );
    });

    it("debería requerir email cuando es obligatorio", () => {
      expect(() => requiredEmailSchema.parse("")).toThrow("email es requerido");
    });
  });

  describe("Validación de Precio", () => {
    it("debería aceptar precios válidos", () => {
      expect(priceSchema.parse("10")).toBe("10");
      expect(priceSchema.parse("10.50")).toBe("10.50");
      expect(priceSchema.parse("25.99")).toBe("25.99");
    });

    it("debería rechazar precios con más de 2 decimales", () => {
      expect(() => priceSchema.parse("10.999")).toThrow("Precio inválido");
    });

    it("debería rechazar precios negativos", () => {
      expect(() => priceSchema.parse("-5")).toThrow("Precio inválido");
    });

    it("debería rechazar texto como precio", () => {
      expect(() => priceSchema.parse("abc")).toThrow("Precio inválido");
    });

    it("debería requerir precio", () => {
      expect(() => priceSchema.parse("")).toThrow("precio es requerido");
    });
  });

  describe("Validación de Hora", () => {
    it("debería aceptar horas válidas", () => {
      expect(timeSchema.parse("09:00")).toBe("09:00");
      expect(timeSchema.parse("14:30")).toBe("14:30");
      expect(timeSchema.parse("23:59")).toBe("23:59");
    });

    it("debería rechazar horas inválidas", () => {
      expect(() => timeSchema.parse("25:00")).toThrow(
        "Formato de hora inválido"
      );
      expect(() => timeSchema.parse("12:60")).toThrow(
        "Formato de hora inválido"
      );
    });
  });

  describe("Validación de Fecha", () => {
    it("debería aceptar fechas válidas", () => {
      expect(dateSchema.parse("2024-01-15")).toBe("2024-01-15");
      expect(dateSchema.parse("2024-12-31")).toBe("2024-12-31");
    });

    it("debería rechazar fechas con formato incorrecto", () => {
      expect(() => dateSchema.parse("15-01-2024")).toThrow(
        "Formato de fecha inválido"
      );
      expect(() => dateSchema.parse("2024/01/15")).toThrow(
        "Formato de fecha inválido"
      );
    });
  });

  describe("Validación de Contraseña", () => {
    it("debería aceptar contraseñas válidas", () => {
      expect(passwordSchema.parse("Password123")).toBe("Password123");
      expect(passwordSchema.parse("MiClave2024")).toBe("MiClave2024");
    });

    it("debería rechazar contraseñas cortas", () => {
      expect(() => passwordSchema.parse("Pass1")).toThrow(
        "al menos 8 caracteres"
      );
    });

    it("debería requerir al menos una minúscula", () => {
      expect(() => passwordSchema.parse("PASSWORD123")).toThrow("1 minúscula");
    });

    it("debería requerir al menos una mayúscula", () => {
      expect(() => passwordSchema.parse("password123")).toThrow("1 mayúscula");
    });

    it("debería requerir al menos un número", () => {
      expect(() => passwordSchema.parse("PasswordSinNumero")).toThrow(
        "1 número"
      );
    });
  });

  describe("Schema de Empleado", () => {
    it("debería validar empleado completo correctamente", () => {
      const empleadoValido = {
        first_name: "Juan",
        last_name: "Pérez",
        email: "juan@ejemplo.com",
        phone: "0999123456",
        position: "Barbero",
        bio: "Barbero profesional",
        is_active: true,
      };

      const resultado = employeeFormSchema.parse(empleadoValido);
      expect(resultado.first_name).toBe("JUAN");
      expect(resultado.last_name).toBe("PÉREZ");
      expect(resultado.email).toBe("juan@ejemplo.com");
    });

    it("debería rechazar empleado sin email", () => {
      const empleadoInvalido = {
        first_name: "Juan",
        last_name: "Pérez",
        email: "",
        phone: "0999123456",
        position: "Barbero",
        is_active: true,
      };

      expect(() => employeeFormSchema.parse(empleadoInvalido)).toThrow(
        "email es requerido"
      );
    });

    it("debería rechazar empleado sin teléfono", () => {
      const empleadoInvalido = {
        first_name: "Juan",
        last_name: "Pérez",
        email: "juan@ejemplo.com",
        phone: "",
        position: "Barbero",
        is_active: true,
      };

      expect(() => employeeFormSchema.parse(empleadoInvalido)).toThrow();
    });
  });

  describe("Schema de Servicio", () => {
    it("debería validar servicio completo correctamente", () => {
      const servicioValido = {
        name: "Corte de Cabello",
        description: "Corte profesional",
        price: "15.00",
        duration_minutes: "30",
        is_active: true,
      };

      const resultado = serviceFormSchema.parse(servicioValido);
      expect(resultado.name).toBe("Corte de Cabello");
      expect(resultado.price).toBe("15.00");
    });

    it("debería rechazar servicio sin nombre", () => {
      const servicioInvalido = {
        name: "",
        price: "15.00",
        duration_minutes: "30",
        is_active: true,
      };

      expect(() => serviceFormSchema.parse(servicioInvalido)).toThrow();
    });

    it("debería rechazar servicio con precio inválido", () => {
      const servicioInvalido = {
        name: "Corte",
        price: "gratis",
        duration_minutes: "30",
        is_active: true,
      };

      expect(() => serviceFormSchema.parse(servicioInvalido)).toThrow(
        "Precio inválido"
      );
    });
  });

  describe("Validación de Nombre de Negocio", () => {
    it("debería aceptar nombres de negocio válidos", () => {
      expect(businessNameSchema.parse("Barbería El Estilo")).toBe(
        "Barbería El Estilo"
      );
      expect(businessNameSchema.parse("Salón de Belleza")).toBe(
        "Salón de Belleza"
      );
    });

    it("debería rechazar nombres muy cortos", () => {
      expect(() => businessNameSchema.parse("A")).toThrow(
        "al menos 2 caracteres"
      );
    });

    it("debería rechazar nombres muy largos", () => {
      const nombreLargo = "A".repeat(101);
      expect(() => businessNameSchema.parse(nombreLargo)).toThrow(
        "no puede exceder 100 caracteres"
      );
    });
  });
});
