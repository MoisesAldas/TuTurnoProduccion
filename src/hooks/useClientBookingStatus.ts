import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";

interface BookingStatus {
  allowed: boolean;
  is_blocked: boolean;
  cancellations_this_month: number;
  max_allowed: number;
  reason: string | null;
}

/**
 * Hook para verificar si un cliente puede reservar en un negocio
 * @param clientId - ID del cliente
 * @param businessId - ID del negocio
 * @returns Estado de bloqueo, loading y error
 */
export function useClientBookingStatus(
  clientId: string | null,
  businessId: string | null,
) {
  const [status, setStatus] = useState<BookingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function checkStatus() {
      if (!clientId || !businessId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error: rpcError } = await supabase.rpc(
          "check_client_booking_allowed",
          {
            p_client_id: clientId,
            p_business_id: businessId,
          },
        );

        if (rpcError) throw rpcError;

        setStatus(data);
      } catch (err) {
        console.error("Error checking booking status:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [clientId, businessId]);

  return { status, loading, error };
}

/**
 * Función para refrescar el estado de bloqueo manualmente
 */
export async function checkClientBookingStatus(
  clientId: string,
  businessId: string,
): Promise<BookingStatus | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("check_client_booking_allowed", {
      p_client_id: clientId,
      p_business_id: businessId,
    });

    if (error) throw error;

    return data;
  } catch (err) {
    console.error("Error checking booking status:", err);
    return null;
  }
}
