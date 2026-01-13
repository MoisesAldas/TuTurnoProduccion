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

    console.log("🔄 Attempting to resend confirmation email for:", email);

    // Usar service role para acceder a admin API
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

    // Intentar reenviar email de confirmación
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (resendError) {
      console.error("❌ Error resending confirmation email:", resendError);
      console.error("Error message:", resendError.message);

      // Manejar rate limit
      if (
        resendError.message?.includes("rate limit") ||
        resendError.message?.includes("too many") ||
        resendError.message?.includes("Email rate limit exceeded")
      ) {
        return NextResponse.json(
          {
            error:
              "Has solicitado demasiados emails. Por favor espera unos minutos e intenta de nuevo.",
          },
          { status: 429 }
        );
      }

      // Para cualquier otro error, no revelar detalles
      console.log(
        "⚠️ Resend failed but not revealing to user:",
        resendError.message
      );
      return NextResponse.json({
        success: true,
        message:
          "Si el email existe y no está confirmado, recibirás un nuevo enlace.",
      });
    }

    console.log("✅ Confirmation email resent successfully to:", email);
    return NextResponse.json({
      success: true,
      message:
        "Email de confirmación enviado. Por favor revisa tu bandeja de entrada.",
    });
  } catch (error) {
    console.error("💥 Unexpected error in resend confirmation:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
