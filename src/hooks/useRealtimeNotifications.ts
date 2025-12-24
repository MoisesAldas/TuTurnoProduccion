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
  const isSubscribingRef = useRef(false); // Prevenir múltiples suscripciones simultáneas

  // Actualizar el callback ref cada vez que cambie (sin causar re-suscripción)
  useEffect(() => {
    if (debug)
      console.log("🔄 [useRealtimeNotifications] Actualizando callback ref");
    callbackRef.current = onNewNotification;
  }, [onNewNotification, debug]);

  // Suscripción (SOLO depende de userId y debug, NO del callback)
  useEffect(() => {
    console.log(
      "🔵 [useRealtimeNotifications] useEffect de suscripción ejecutado",
      {
        userId,
        debug,
        isSubscribing: isSubscribingRef.current,
        hasExistingChannel: !!channelRef.current,
      }
    );

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

    // ✅ FIX: Prevenir doble suscripción si ya estamos suscribiendo
    if (isSubscribingRef.current) {
      console.warn(
        "⚠️ [Realtime Notifications] Ya hay una suscripción en progreso, saltando..."
      );
      return;
    }

    // ✅ FIX: Si ya existe un canal, limpiarlo ANTES de crear uno nuevo
    if (channelRef.current) {
      console.log(
        "🧹 [Realtime Notifications] Limpiando canal existente antes de re-suscribir..."
      );
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // ✅ NUEVO: Debouncing para prevenir múltiples suscripciones durante F5
    const debounceTimer = setTimeout(() => {
      // Marcar que estamos suscribiendo
      isSubscribingRef.current = true;

      // Crear canal único por usuario (con timestamp para evitar colisiones en F5)
      const channelName = `notifications:${userId}:${Date.now()}`;
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
            if (debug) {
              console.log(
                "🔔 [Realtime Notifications] ✨ EVENTO INSERT RECIBIDO:",
                payload.new
              );
              console.log(
                "🔔 [Realtime Notifications] callbackRef.current existe?",
                !!callbackRef.current
              );
            }
            // Usar callbackRef.current para evitar stale closures
            callbackRef.current?.(payload.new as Notification);
            if (debug)
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
            isSubscribingRef.current = false; // ✅ Resetear flag en error
          } else if (status === "TIMED_OUT") {
            console.error(
              "❌ [Realtime Notifications] Subscription timed out. Check your internet connection"
            );
            isSubscribingRef.current = false; // ✅ Resetear flag en timeout
          } else if (status === "SUBSCRIBED") {
            console.log(
              "✅ [Realtime Notifications] Successfully subscribed to notifications channel"
            );
            isSubscribingRef.current = false; // ✅ Resetear flag cuando se completa
          } else if (status === "CLOSED") {
            console.log("🔴 [Realtime Notifications] Channel closed");
            isSubscribingRef.current = false; // ✅ Resetear flag cuando se cierra
          }
        });

      // Guardar referencia al canal
      channelRef.current = channel;
    }, 100); // ✅ Debounce de 100ms para prevenir múltiples suscripciones

    // Cleanup: desuscribirse al desmontar o cuando cambie userId
    return () => {
      // ✅ Cancelar el debounce si el componente se desmonta antes
      clearTimeout(debounceTimer);

      console.log(
        "🔴 [Realtime Notifications] Cleaning up channel (unmount o cambio de userId)"
      );
      if (channelRef.current) {
        // ✅ FIX: Asegurar cleanup completo
        const channelToRemove = channelRef.current;
        channelRef.current = null;
        isSubscribingRef.current = false;

        // Unsubscribe asíncronamente
        supabase
          .removeChannel(channelToRemove)
          .then(() => {
            console.log(
              "🔴 [Realtime Notifications] Channel removed successfully"
            );
          })
          .catch((err) => {
            console.error(
              "❌ [Realtime Notifications] Error removing channel:",
              err
            );
          });
      }
    };
  }, [userId, debug]); // NO incluir supabase (instancia estable)

  // No retornamos nada porque el hook maneja todo internamente
  // Los callbacks se ejecutan automáticamente cuando hay eventos
}
