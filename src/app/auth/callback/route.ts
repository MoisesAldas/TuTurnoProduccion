import { createServerClient } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin, hash } = new URL(request.url);
  const code = searchParams.get("code");
  // Try to resolve user type from query param first, then from cookie fallback
  let type = searchParams.get("type") as "client" | "business_owner" | null; // 'client' o 'business_owner'
  const cookieType = request.cookies.get("auth_user_type")?.value as
    | "client"
    | "business_owner"
    | undefined;
  if (
    !type &&
    cookieType &&
    (cookieType === "client" || cookieType === "business_owner")
  ) {
    type = cookieType;
  }
  const action = searchParams.get("action"); // 'reset-password' o undefined

  // Verificar si hay errores en searchParams o hash (típico de enlaces expirados)
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (errorParam || (hash && hash.includes("error="))) {
    const finalError =
      errorDescription ||
      hash.match(/error_description=([^&]+)/)?.[1] ||
      "Enlace inválido o expirado";
    console.error("❌ Error in callback:", {
      error: errorParam || "hash_error",
      errorCode,
      errorDescription: finalError,
    });

    // Si es un error de reset password, redirigir a forgot-password
    if (action === "reset-password") {
      const forgotPath =
        type === "business_owner"
          ? "/auth/business/forgot-password"
          : "/auth/client/forgot-password";
      const res = NextResponse.redirect(
        `${origin}${forgotPath}?error=link_expired&message=${encodeURIComponent(
          decodeURIComponent(finalError),
        )}`,
      );
      res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
      return res;
    }

    // Si es un enlace de confirmación de email expirado
    if (errorCode === "otp_expired" || errorParam === "access_denied") {
      const loginPath =
        type === "business_owner"
          ? "/auth/business/login"
          : "/auth/client/login";
      const expiredMessage =
        "El enlace de confirmación ha expirado. Por favor, solicita un nuevo enlace de confirmación o intenta registrarte nuevamente.";
      const res = NextResponse.redirect(
        `${origin}${loginPath}?error=link_expired&message=${encodeURIComponent(
          expiredMessage,
        )}`,
      );
      res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
      return res;
    }

    // Para otros errores, redirigir al login
    const loginPath =
      type === "business_owner" ? "/auth/business/login" : "/auth/client/login";
    const res = NextResponse.redirect(
      `${origin}${loginPath}?error=auth_error&message=${encodeURIComponent(
        decodeURIComponent(finalError),
      )}`,
    );
    res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
    return res;
  }

  console.log("🔐 Auth callback received:", {
    hasCode: !!code,
    userType: type,
    action,
  });

  if (!code) {
    console.error("No authorization code received");
    // Si no hay tipo, ir al login general, si no, al específico
    const loginPath =
      type === "business_owner" ? "/auth/business/login" : "/auth/client/login";
    const res = NextResponse.redirect(`${origin}${loginPath}?error=no_code`);
    // Clean fallback cookie
    res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
    return res;
  }

  try {
    const supabase = createServerClient();

    // Intercambiar código por sesión
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error("Error exchanging code for session:", sessionError);
      console.error("Error message:", sessionError.message);
      console.error("Error status:", sessionError.status);

      // Detectar error de PKCE o código usado en diferente dispositivo
      const isPKCEError =
        sessionError.message?.includes("PKCE") ||
        sessionError.message?.includes("code_verifier") ||
        sessionError.message?.includes("invalid_grant") ||
        sessionError.message?.includes("Code exchange failed") ||
        sessionError.message?.includes("Invalid code") ||
        sessionError.status === 400 || // Bad request típico de PKCE
        sessionError.status === 401; // Unauthorized típico de código inválido

      if (isPKCEError) {
        const loginPath =
          type === "business_owner"
            ? "/auth/business/login"
            : "/auth/client/login";
        const errorMessage =
          "El enlace de confirmación debe abrirse en el mismo dispositivo y navegador donde iniciaste el registro. Por favor, vuelve a tu dispositivo original o solicita un nuevo enlace.";
        const res = NextResponse.redirect(
          `${origin}${loginPath}?error=device_mismatch&message=${encodeURIComponent(
            errorMessage,
          )}`,
        );
        res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
        return res;
      }

      const loginPath =
        type === "business_owner"
          ? "/auth/business/login"
          : "/auth/client/login";
      const res = NextResponse.redirect(
        `${origin}${loginPath}?error=session_error&message=${encodeURIComponent(
          sessionError.message || "Error al crear la sesión",
        )}`,
      );
      res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
      return res;
    }

    if (!session?.user) {
      console.error("No user in session after exchange");
      const loginPath =
        type === "business_owner"
          ? "/auth/business/login"
          : "/auth/client/login";
      const res = NextResponse.redirect(`${origin}${loginPath}?error=no_user`);
      res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
      return res;
    }

    console.log(
      "✅ Session created for user:",
      session.user.id,
      session.user.email,
    );

    // Si no hay tipo en URL/cookie, intentar recuperar desde metadatos del usuario
    if (!type || !["client", "business_owner"].includes(type)) {
      console.log("🔍 No user type in URL/cookie, checking user metadata...");
      const userMetadataType = session.user.user_metadata?.user_type as
        | "client"
        | "business_owner"
        | undefined;

      if (
        userMetadataType &&
        ["client", "business_owner"].includes(userMetadataType)
      ) {
        console.log("✅ Found user_type in metadata:", userMetadataType);
        type = userMetadataType;
      } else {
        console.error("❌ Invalid or missing user type in metadata");
        const res = NextResponse.redirect(
          `${origin}/auth/client/login?error=invalid_type`,
        );
        res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
        return res;
      }
    }

    // Si es una acción de reset password, redirigir a la página de reset
    if (action === "reset-password") {
      console.log(
        "🔄 Password reset action detected, redirecting to reset page",
      );
      const resetPath =
        type === "business_owner"
          ? "/auth/business/reset-password"
          : "/auth/client/reset-password";
      const res = NextResponse.redirect(`${origin}${resetPath}`);
      res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
      return res;
    }

    // Verificar si el usuario ya existe en nuestra base de datos
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (userCheckError && userCheckError.code !== "PGRST116") {
      // Error diferente a "no encontrado"
      console.error("Error checking existing user:", userCheckError);
      const loginPath =
        type === "business_owner"
          ? "/auth/business/login"
          : "/auth/client/login";
      const res = NextResponse.redirect(
        `${origin}${loginPath}?error=database_error`,
      );
      res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
      return res;
    }

    if (existingUser) {
      // Usuario ya existe, verificar compatibilidad de tipo
      const isCompatibleType =
        (type === "client" && existingUser.is_client) ||
        (type === "business_owner" && existingUser.is_business_owner);

      if (!isCompatibleType) {
        console.log("User exists but with different type");
        // El usuario ya existe pero con un tipo diferente
        await supabase.auth.signOut();
        // Redirigir al login opuesto para sugerir el tipo correcto
        const suggestionPath =
          type === "business_owner"
            ? "/auth/client/login"
            : "/auth/business/login";
        const res = NextResponse.redirect(
          `${origin}${suggestionPath}?error=email_different_type`,
        );
        res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
        return res;
      }

      // NUEVO: Verificar si el usuario está baneado
      if (existingUser.is_banned) {
        console.log("⛔ User is banned, signing out and redirecting to login");
        await supabase.auth.signOut();
        const loginPath =
          type === "business_owner"
            ? "/auth/business/login"
            : "/auth/client/login";
        const res = NextResponse.redirect(`${origin}${loginPath}?banned=true`);
        res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
        return res;
      }

      // Usuario existe y es compatible, determinar redirección correcta
      let redirectPath: string;

      if (existingUser.is_business_owner) {
        // Verificar si tiene negocio configurado
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", existingUser.id)
          .single();

        redirectPath = business ? "/dashboard/business" : "/business/setup";
      } else {
        redirectPath = "/dashboard/client";
      }

      console.log("✅ Existing user, redirecting to:", redirectPath);
      const res = NextResponse.redirect(`${origin}${redirectPath}`);
      res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
      return res;
    }

    // Verificar si el email ya está usado por otro usuario (diferente ID)
    const { data: emailUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", session.user.email)
      .neq("id", session.user.id)
      .single();

    if (emailUser) {
      console.log("Email already used by different user");
      await supabase.auth.signOut();
      const loginPath =
        type === "business_owner"
          ? "/auth/business/login"
          : "/auth/client/login";
      const res = NextResponse.redirect(
        `${origin}${loginPath}?error=email_exists`,
      );
      res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
      return res;
    }

    // Usuario nuevo, redirigir a setup de perfil
    console.log(
      "👤 New user detected, redirecting to profile setup with type:",
      type,
    );

    // Detectar si es una confirmación de email (no es OAuth)
    const isEmailConfirmation =
      !session.user.app_metadata.provider ||
      session.user.app_metadata.provider === "email";

    if (isEmailConfirmation) {
      // Si es confirmación de email, mostrar mensaje de éxito y redirigir a login
      console.log(
        "📧 Email confirmation detected, redirecting to login with success message",
      );
      const loginPath =
        type === "business_owner"
          ? "/auth/business/login"
          : "/auth/client/login";
      const successMessage =
        "¡Email confirmado exitosamente! Por favor inicia sesión para continuar.";
      const res = NextResponse.redirect(
        `${origin}${loginPath}?success=email_confirmed&message=${encodeURIComponent(
          successMessage,
        )}`,
      );
      res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
      return res;
    }

    // Para OAuth, ir directo al setup
    const setupPath =
      type === "business_owner" ? "/auth/business/setup" : "/auth/client/setup";
    const res = NextResponse.redirect(`${origin}${setupPath}`);
    res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
    return res;
  } catch (error) {
    console.error("Unexpected error in auth callback:", error);
    const loginPath =
      type === "business_owner" ? "/auth/business/login" : "/auth/client/login";
    const res = NextResponse.redirect(
      `${origin}${loginPath}?error=unexpected_error`,
    );
    res.cookies.set("auth_user_type", "", { maxAge: 0, path: "/" });
    return res;
  }
}
