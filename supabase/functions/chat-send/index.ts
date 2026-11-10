import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ChatSendRequestSchema, filterProfanity, CHAT_LIMITS } from "@tinh-hoa/shared";

export const MAX_CHAT_BODY_BYTES = 10 * 1024; // 10 KB

export interface ChatSendHandlerOptions {
  supabaseClient?: SupabaseClient;
}

export function createErrorResponse(
  status: number,
  code: string,
  messageKey: string,
  requestId: string,
  details?: unknown,
): Response {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message_key: messageKey,
        ...(details !== undefined ? { details } : {}),
      },
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
    },
  );
}

export async function handleChatSend(
  req: Request,
  options: ChatSendHandlerOptions = {},
): Promise<Response> {
  const requestId = req.headers.get("X-Request-Id") || crypto.randomUUID();

  // 1. Method check
  if (req.method !== "POST") {
    return createErrorResponse(405, "METHOD_NOT_ALLOWED", "errors.method_not_allowed", requestId);
  }

  // 2. Authorization check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return createErrorResponse(401, "UNAUTHORIZED", "errors.missing_auth", requestId);
  }
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return createErrorResponse(401, "UNAUTHORIZED", "errors.invalid_auth_token", requestId);
  }

  // 3. Payload size check
  const contentLengthHeader = req.headers.get("Content-Length");
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(contentLength) && contentLength > MAX_CHAT_BODY_BYTES) {
      return createErrorResponse(413, "PAYLOAD_TOO_LARGE", "errors.payload_too_large", requestId);
    }
  }

  // Read and validate body text
  let bodyText: string;
  try {
    bodyText = await req.text();
    if (new TextEncoder().encode(bodyText).length > MAX_CHAT_BODY_BYTES) {
      return createErrorResponse(413, "PAYLOAD_TOO_LARGE", "errors.payload_too_large", requestId);
    }
  } catch {
    return createErrorResponse(400, "BAD_REQUEST", "errors.read_body_failed", requestId);
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(bodyText);
  } catch {
    return createErrorResponse(400, "INVALID_JSON", "errors.invalid_json", requestId);
  }

  // 4. Validate with Zod
  const parseResult = ChatSendRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return createErrorResponse(
      400,
      "VALIDATION_ERROR",
      "errors.validation_failed",
      requestId,
      parseResult.error.format(),
    );
  }
  const { channelId, clientMsgId, content } = parseResult.data;

  // 5. Initialize Supabase Client
  const supabaseUrl =
    (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_URL") : undefined) ??
    "http://127.0.0.1:54321";
  const supabaseAnonKey =
    (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_ANON_KEY") : undefined) ?? "anon-key";

  const supabase =
    options.supabaseClient ??
    createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

  // 6. Verify User Identity
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return createErrorResponse(401, "UNAUTHORIZED", "errors.invalid_auth_token", requestId);
  }

  // 7. Check Idempotency (prevent duplicate message insertion)
  const { data: existingMsg } = await supabase
    .from("chat_messages")
    .select("id, channel_id, sender_id, client_msg_id, content, filtered_content, created_at")
    .eq("channel_id", channelId)
    .eq("sender_id", user.id)
    .eq("client_msg_id", clientMsgId)
    .maybeSingle();

  if (existingMsg) {
    return new Response(
      JSON.stringify({
        success: true,
        idempotent: true,
        message: {
          id: existingMsg.id,
          channelId: existingMsg.channel_id,
          senderId: existingMsg.sender_id,
          clientMsgId: existingMsg.client_msg_id,
          content: existingMsg.content,
          filteredContent: existingMsg.filtered_content,
          createdAt: existingMsg.created_at,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
      },
    );
  }

  // 8. Rate Limiting Check
  const { data: rateLimitOk, error: rateLimitErr } = await supabase.rpc("check_rate_limit", {
    p_user_id: user.id,
    p_action: "chat",
    p_capacity: 10,
    p_refill_rate: 0.1667,
  });

  if (rateLimitErr || rateLimitOk === false) {
    return createErrorResponse(429, "RATE_LIMITED", "errors.chat_rate_limit_exceeded", requestId);
  }

  // Additional check for global channel cooldown (10 seconds)
  if (channelId === "global") {
    const { data: lastGlobalMsg } = await supabase
      .from("chat_messages")
      .select("created_at")
      .eq("channel_id", "global")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastGlobalMsg) {
      const elapsedSec = (Date.now() - new Date(lastGlobalMsg.created_at).getTime()) / 1000;
      if (elapsedSec < CHAT_LIMITS.globalMinIntervalSec) {
        return createErrorResponse(
          429,
          "GLOBAL_COOLDOWN",
          "errors.global_cooldown_active",
          requestId,
          { remainingSec: Math.ceil(CHAT_LIMITS.globalMinIntervalSec - elapsedSec) },
        );
      }
    }
  }

  // 9. Check Channel Membership & Mute status
  const { data: isMember, error: memberErr } = await supabase.rpc("is_channel_member", {
    p_channel_id: channelId,
    p_user_id: user.id,
  });

  if (memberErr || !isMember) {
    return createErrorResponse(
      403,
      "NOT_A_CHANNEL_MEMBER",
      "errors.cannot_access_channel",
      requestId,
    );
  }

  const { data: memberRecord } = await supabase
    .from("chat_members")
    .select("muted_until")
    .eq("channel_id", channelId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberRecord?.muted_until && new Date(memberRecord.muted_until).getTime() > Date.now()) {
    return createErrorResponse(403, "MUTED", "errors.user_is_muted_in_channel", requestId);
  }

  // 10. Filter profanity
  const { filteredText } = filterProfanity(content);

  // 11. Fetch sender display name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const senderName = profile?.display_name || "Unknown Voyager";

  // 12. Insert message into chat_messages
  const msgId = crypto.randomUUID();
  const createdAtIso = new Date().toISOString();

  const { error: insertErr } = await supabase.from("chat_messages").insert({
    id: msgId,
    channel_id: channelId,
    sender_id: user.id,
    client_msg_id: clientMsgId,
    content,
    filtered_content: filteredText,
    created_at: createdAtIso,
  });

  if (insertErr) {
    return createErrorResponse(
      500,
      "INSERT_FAILED",
      "errors.failed_to_save_message",
      requestId,
      insertErr.message,
    );
  }

  // 13. Broadcast via Realtime channel
  try {
    const realtimeChannel = supabase.channel(`chat:${channelId}`);
    await realtimeChannel.send({
      type: "broadcast",
      event: "new_message",
      payload: {
        id: msgId,
        channelId,
        senderId: user.id,
        senderName,
        content,
        filteredContent: filteredText,
        createdAt: createdAtIso,
        clientMsgId,
      },
    });
  } catch {
    // Non-fatal if broadcast fails; database persistence guarantees delivery on poll/reconnect
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: {
        id: msgId,
        channelId,
        senderId: user.id,
        senderName,
        content,
        filteredContent: filteredText,
        createdAt: createdAtIso,
        clientMsgId,
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
    },
  );
}

// Default Deno serve entrypoint
if (typeof Deno !== "undefined") {
  Deno.serve(async (req: Request) => {
    return handleChatSend(req);
  });
}
