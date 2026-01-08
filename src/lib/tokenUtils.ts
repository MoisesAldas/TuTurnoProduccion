import crypto from "crypto";

/**
 * Genera un token seguro para validar respuestas de citas
 * Usa HMAC-SHA256 para firmar el appointmentId
 */
export function generateAppointmentToken(appointmentId: string): string {
  const secret = process.env.APPOINTMENT_TOKEN_SECRET!;

  if (!secret) {
    throw new Error("APPOINTMENT_TOKEN_SECRET no está configurado");
  }

  const signature = crypto
    .createHmac("sha256", secret)
    .update(appointmentId)
    .digest("hex");

  return `${appointmentId}.${signature}`;
}

/**
 * Valida un token de respuesta de cita
 * Verifica que el appointmentId coincida y que la firma sea válida
 */
export function validateAppointmentToken(
  appointmentId: string,
  token: string
): boolean {
  try {
    if (!token || !appointmentId) {
      return false;
    }

    const [tokenId, signature] = token.split(".");

    // Verificar que el ID del token coincida con el appointmentId
    if (tokenId !== appointmentId) {
      return false;
    }

    // Generar el token esperado y comparar firmas
    const expectedToken = generateAppointmentToken(appointmentId);
    const [, expectedSignature] = expectedToken.split(".");

    // Comparación segura contra timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    console.error("Error validating appointment token:", error);
    return false;
  }
}
