/**
 * useRealtimeNotifications Hook
 *
 * Hook personalizado para suscribirse a cambios en tiempo real de la tabla notifications.
 * Utiliza Supabase Realtime para escuchar eventos INSERT.
 *
 * Features:
 * - Filtrado server-side por user_id
 * - Respeta automáticamente RLS policies
 * - Auto-cleanup al desmontar
 * - Callback opcional para nuevas notificaciones
 *
 * @example
 * ```tsx
 * useRealtimeNotifications({
 *   userId: authState.user?.id,
 *   onNewNotification: (notification) => {
 *     console.log('Nueva notificación:', notification)
 *     // Actualizar UI, reproducir sonido, mostrar toast
 *   }
 * })
 * ```
 */

import { useEffect, useRef } from "react";
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabaseClient";

export interface Notification {
  id: string;
  user_id: string;
  appointment_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  sent_at: string | null;
  created_at: string;
}

interface UseRealtimeNotificationsProps {
  /**
   * ID del usuario para filtrar eventos
   * Solo se recibirán notificaciones de este usuario
   * Si es undefined, no se suscribirá
   */
  userId: string | undefined;

  /**
   * Callback cuando se inserta una nueva notificación
   * @param notification - La notificación recién creada
   */
  onNewNotification?: (notification: Notification) => void;

  /**
   * Opcional: habilitar logs para debugging
   * @default false
   */
  debug?: boolean;
}

export function useRealtimeNotifications({
  userId,
  onNewNotification,
  debug = false,
}: UseRealtimeNotificationsProps) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onNewNotification);

  // Actualizar el callback ref cada vez que cambie (sin causar re-suscripción)
  useEffect(() => {
    console.log("🔄 [useRealtimeNotifications] Actualizando callback ref");
    callbackRef.current = onNewNotification;
  }, [onNewNotification]);

  // Suscripción (SOLO depende de userId y debug, NO del callback)
  useEffect(() => {
    console.log("🔵 [useRealtimeNotifications] useEffect de suscripción ejecutado", {
      userId,
      debug,
    });

    // No suscribirse si no hay userId válido
    if (
      !userId ||
      userId.trim() === "" ||
      userId === "undefined" ||
      userId === "null"
    ) {
      console.warn(
        "⚠️ [Realtime Notifications] Invalid userId, skipping subscription:",
        userId
      );
      return;
    }

    // Crear canal único por usuario
    const channelName = `notifications:user_id=eq.${userId}`;
    console.log(
      `🟢 [Realtime Notifications] Subscribing to channel: ${channelName}`
    );

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          console.log(
            "🔔 [Realtime Notifications] ✨ EVENTO INSERT RECIBIDO:",
            payload.new
          );
          console.log(
            "🔔 [Realtime Notifications] callbackRef.current existe?",
            !!callbackRef.current
          );
          // Usar callbackRef.current para evitar stale closures
          callbackRef.current?.(payload.new as Notification);
          console.log("🔔 [Realtime Notifications] Callback ejecutado");
        }
      )
      .subscribe((status, err) => {
        console.log(
          `📡 [Realtime Notifications] Subscription Status: ${status}`
        );
        if (err) console.error("❌ [Realtime Notifications] Error:", err);

        if (status === "CHANNEL_ERROR") {
          console.error(
            "❌ [Realtime Notifications] Error subscribing to channel. Check Supabase configuration and RLS policies"
          );
        } else if (status === "TIMED_OUT") {
          console.error(
            "❌ [Realtime Notifications] Subscription timed out. Check your internet connection"
          );
        } else if (status === "SUBSCRIBED") {
          console.log(
            "✅ [Realtime Notifications] Successfully subscribed to notifications channel"
          );
        }
      });

    // Guardar referencia al canal
    channelRef.current = channel;

    // Cleanup: desuscribirse al desmontar o cuando cambie userId
    return () => {
      console.log("🔴 [Realtime Notifications] Cleaning up channel");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        console.log("🔴 [Realtime Notifications] Channel removed");
      }
    };
  }, [userId, debug]); // SOLO userId y debug - callback NO causa re-suscripción

  // No retornamos nada porque el hook maneja todo internamente
  // Los callbacks se ejecutan automáticamente cuando hay eventos
}
