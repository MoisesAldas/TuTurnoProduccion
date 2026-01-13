import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 }
      );
    }

    // Usar service role para bypassear rate limits
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Reenviar email de confirmación directamente
    // No verificamos si el usuario existe por seguridad (no revelar emails registrados)
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (resendError) {
      console.error("Error resending confirmation email:", resendError);

      // Manejar rate limit
      if (
        resendError.message?.includes("rate limit") ||
        resendError.message?.includes("too many")
      ) {
        return NextResponse.json(
          {
            error:
              "Has solicitado demasiados emails. Por favor espera unos minutos e intenta de nuevo.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Error al enviar el email. Por favor intenta de nuevo más tarde.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Email de confirmación enviado. Por favor revisa tu bandeja de entrada.",
    });
  } catch (error) {
    console.error("Error in resend confirmation:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
