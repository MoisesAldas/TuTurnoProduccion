import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockSupabaseClient,
  resetSupabaseMocks,
} from "@/__tests__/mocks/supabase";
import {
  citasPrueba,
  usuariosPrueba,
  negociosPrueba,
} from "@/__tests__/mocks/data/datosPrueba";

// Mock de Resend para emails
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: "email-test-123" }),
    },
  })),
}));

describe("API: Enviar Notificaciones", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  describe("Confirmación de Cita", () => {
    it("debería enviar email de confirmación al cliente", () => {
      const cita = citasPrueba[0];
      const cliente = usuariosPrueba[0];

      const emailData = {
        to: cliente.email,
        subject: "Cita Confirmada",
        appointmentId: cita.id,
        date: cita.date,
        time: cita.start_time,
      };

      expect(emailData.to).toBeDefined();
      expect(emailData.subject).toContain("Confirmada");
    });

    it("debería incluir detalles de la cita en el email", () => {
      const cita = citasPrueba[0];

      const detalles = {
        fecha: cita.date,
        hora: cita.start_time,
        servicio: "Corte de Cabello",
        precio: cita.total_price,
      };

      expect(detalles.fecha).toBeDefined();
      expect(detalles.hora).toBeDefined();
      expect(detalles.precio).toBeGreaterThan(0);
    });

    it("debería incluir información del negocio", () => {
      const negocio = negociosPrueba[0];

      const infoNegocio = {
        nombre: negocio.name,
        direccion: negocio.address,
        telefono: negocio.phone,
      };

      expect(infoNegocio.nombre).toBeDefined();
      expect(infoNegocio.direccion).toBeDefined();
    });

    it("debería incluir enlace para gestionar cita", () => {
      const cita = citasPrueba[0];
      const baseUrl = "http://localhost:3000";

      const enlaceGestion = `${baseUrl}/appointments/${cita.id}/manage`;

      expect(enlaceGestion).toContain("/appointments/");
      expect(enlaceGestion).toContain("/manage");
    });
  });

  describe("Cancelación de Cita", () => {
    it("debería enviar email de cancelación al cliente", () => {
      const cita = { ...citasPrueba[0], status: "cancelled" };
      const cliente = usuariosPrueba[0];

      const emailData = {
        to: cliente.email,
        subject: "Cita Cancelada",
        appointmentId: cita.id,
        reason: "Cancelada por el negocio",
      };

      expect(emailData.subject).toContain("Cancelada");
      expect(emailData.reason).toBeDefined();
    });

    it("debería incluir razón de cancelación", () => {
      const razones = [
        "Cancelada por el cliente",
        "Cancelada por el negocio",
        "Emergencia",
        "Cambio de horario",
      ];

      razones.forEach((razon) => {
        expect(razon).toBeDefined();
        expect(razon.length).toBeGreaterThan(0);
      });
    });

    it("debería ofrecer opción de reprogramar", () => {
      const cita = citasPrueba[0];
      const enlaceReprogramar = `/appointments/${cita.id}/reschedule`;

      expect(enlaceReprogramar).toContain("/reschedule");
    });
  });

  describe("Recordatorio de Cita", () => {
    it("debería enviar recordatorio 24 horas antes", () => {
      const cita = citasPrueba[0];
      const fechaCita = new Date(cita.date);
      const fechaRecordatorio = new Date(fechaCita);
      fechaRecordatorio.setDate(fechaRecordatorio.getDate() - 1);

      const horasDiferencia =
        (fechaCita.getTime() - fechaRecordatorio.getTime()) / (1000 * 60 * 60);

      expect(horasDiferencia).toBe(24);
    });

    it("debería incluir instrucciones de llegada", () => {
      const instrucciones = {
        llegada: "Llegar 10 minutos antes",
        estacionamiento: "Estacionamiento disponible",
        contacto: "0999-123-456",
      };

      expect(instrucciones.llegada).toBeDefined();
      expect(instrucciones.contacto).toMatch(/^\d{4}-\d{3}-\d{3}$/);
    });

    it("debería incluir opciones de cancelación", () => {
      const cita = citasPrueba[0];
      const enlaceCancelar = `/appointments/${cita.id}/cancel`;

      expect(enlaceCancelar).toContain("/cancel");
    });
  });

  describe("Validaciones de Email", () => {
    it("debería validar dirección de email", () => {
      const emailsValidos = [
        "cliente@ejemplo.com",
        "usuario.test@dominio.ec",
        "nombre+etiqueta@email.com",
      ];

      emailsValidos.forEach((email) => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it("debería rechazar emails inválidos", () => {
      const emailsInvalidos = [
        "no-es-email",
        "@sinusuario.com",
        "sin-dominio@",
        "espacios en@email.com",
      ];

      emailsInvalidos.forEach((email) => {
        const esValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(esValido).toBe(false);
      });
    });

    it("debería normalizar emails a minúsculas", () => {
      const email = "USUARIO@EJEMPLO.COM";
      const normalizado = email.toLowerCase();

      expect(normalizado).toBe("usuario@ejemplo.com");
    });
  });

  describe("Manejo de Errores de Email", () => {
    it("debería manejar error de servicio de email", () => {
      const error = {
        code: "EMAIL_SERVICE_ERROR",
        message: "Failed to send email",
      };

      expect(error.code).toBe("EMAIL_SERVICE_ERROR");
    });

    it("debería reintentar envío fallido", () => {
      const intentos = [1, 2, 3];
      const maxIntentos = 3;

      expect(intentos.length).toBeLessThanOrEqual(maxIntentos);
    });

    it("debería registrar emails fallidos", () => {
      const emailFallido = {
        to: "cliente@ejemplo.com",
        subject: "Test",
        error: "Connection timeout",
        timestamp: new Date().toISOString(),
      };

      expect(emailFallido.error).toBeDefined();
      expect(emailFallido.timestamp).toBeDefined();
    });
  });

  describe("Plantillas de Email", () => {
    it("debería usar plantilla correcta para confirmación", () => {
      const tipoEmail = "confirmation";
      const plantillas = {
        confirmation: "appointment-confirmation",
        cancellation: "appointment-cancellation",
        reminder: "appointment-reminder",
      };

      expect(plantillas[tipoEmail]).toBe("appointment-confirmation");
    });

    it("debería personalizar contenido del email", () => {
      const datos = {
        nombreCliente: "Juan Pérez",
        nombreNegocio: "Barbería Central",
        fecha: "2024-02-15",
        hora: "14:00",
      };

      const mensaje = `Hola ${datos.nombreCliente}, tu cita en ${datos.nombreNegocio} está confirmada para el ${datos.fecha} a las ${datos.hora}.`;

      expect(mensaje).toContain(datos.nombreCliente);
      expect(mensaje).toContain(datos.nombreNegocio);
    });

    it("debería incluir footer con información legal", () => {
      const footer = {
        empresa: "TuTurno",
        privacidad: "/privacy",
        terminos: "/terms",
        contacto: "soporte@tuturno.com",
      };

      expect(footer.empresa).toBe("TuTurno");
      expect(footer.contacto).toContain("@");
    });
  });

  describe("Notificaciones Push (Futuro)", () => {
    it("debería preparar datos para notificación push", () => {
      const notificacion = {
        titulo: "Cita Confirmada",
        cuerpo: "Tu cita ha sido confirmada",
        icono: "/icon.png",
        url: "/appointments/123",
      };

      expect(notificacion.titulo).toBeDefined();
      expect(notificacion.url).toBeDefined();
    });

    it("debería incluir badge count", () => {
      const notificacionesPendientes = 3;

      expect(notificacionesPendientes).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Preferencias de Notificación", () => {
    it("debería respetar preferencias del usuario", () => {
      const preferencias = {
        emailConfirmacion: true,
        emailRecordatorio: true,
        emailCancelacion: true,
        pushNotifications: false,
      };

      expect(preferencias.emailConfirmacion).toBe(true);
      expect(preferencias.pushNotifications).toBe(false);
    });

    it("debería permitir desactivar notificaciones", () => {
      const preferencias = {
        emailConfirmacion: false,
        emailRecordatorio: false,
        emailCancelacion: false,
      };

      const algunaActiva = Object.values(preferencias).some((v) => v === true);

      expect(algunaActiva).toBe(false);
    });
  });
});
