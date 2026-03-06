import { useState, useEffect, useCallback } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "@/lib/firebase";
import { createClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

export function usePushNotifications(userId: string | undefined) {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const { toast } = useToast();
  const supabase = createClient();

  const saveTokenToSupabase = useCallback(
    async (fcmToken: string) => {
      if (!userId) return;

      try {
        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            fcm_token: fcmToken,
            device_info: {
              ua: navigator.userAgent,
              platform: navigator.platform,
            },
          },
          { onConflict: "user_id,fcm_token" },
        );

        if (error) throw error;
        console.log("FCM Token saved to Supabase");
      } catch (err) {
        console.error("Error saving FCM token:", err);
      }
    },
    [userId, supabase],
  );

  const requestPermission = useCallback(async () => {
    if (!messaging) return;

    try {
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === "granted") {
        // Registrar el service worker con la configuración como parámetros de consulta
        if ("serviceWorker" in navigator) {
          const config = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId:
              process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
          };
          const params = new URLSearchParams(config as any).toString();
          await navigator.serviceWorker.register(
            `/firebase-messaging-sw.js?${params}`,
          );
        }

        const currentToken = await getToken(messaging, {
          vapidKey:
            "BAV6-eX_5JkeziNoo55crpo4utMeg1v1WqdvhdmorHC8Wuavn0yEd3FkQAGjG1tPW2nWQBiCKK9NRRFkV54hdIg",
        });

        if (currentToken) {
          setToken(currentToken);
          await saveTokenToSupabase(currentToken);
        } else {
          console.warn(
            "No registration token available. Request permission to generate one.",
          );
        }
      }
    } catch (err) {
      console.error("An error occurred while retrieving token. ", err);
    }
  }, [saveTokenToSupabase]);

  useEffect(() => {
    if (userId && permission === "granted" && messaging) {
      // Refresh token if needed or listen for messages
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("Message received. ", payload);
        toast({
          title: payload.notification?.title || "Notificación",
          description: payload.notification?.body || "",
        });
      });

      return () => unsubscribe();
    }
  }, [userId, permission, toast]);

  return {
    token,
    permission,
    requestPermission,
  };
}
