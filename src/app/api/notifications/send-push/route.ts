import { NextRequest, NextResponse } from "next/server";
import { messaging } from "@/lib/firebaseAdmin";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { userId, title, body, data } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Get user's push tokens
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("fcm_token")
      .eq("user_id", userId);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        message: "No push subscriptions found for user",
      });
    }

    const tokens = subscriptions.map((s) => s.fcm_token);

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error as any;
          if (
            error?.code === "messaging/invalid-registration-token" ||
            error?.code === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .in("fcm_token", tokensToRemove);
      }
    }

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error: any) {
    console.error("Push Notification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
