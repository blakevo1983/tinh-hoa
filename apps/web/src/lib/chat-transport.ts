import type { ChatMessage } from "@tinh-hoa/shared";
import { getSupabase, supabaseUrl } from "./supabase.js";

export interface ChatTransport {
  send(channelId: string, content: string, clientMsgId: string): Promise<ChatMessage>;
  subscribe(channelId: string, onMessage: (msg: ChatMessage) => void): () => void;
  getHistory(channelId: string, beforeCreatedAt?: string, limit?: number): Promise<ChatMessage[]>;
}

export class SupabaseChatTransport implements ChatTransport {
  private functionUrl: string;

  constructor(functionUrl?: string) {
    this.functionUrl = functionUrl || `${supabaseUrl}/functions/v1/chat-send`;
  }

  async send(channelId: string, content: string, clientMsgId: string): Promise<ChatMessage> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("UNAUTHENTICATED");
    }

    const response = await fetch(this.functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        channelId,
        content,
        clientMsgId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.code || "CHAT_SEND_FAILED");
    }

    return data.message;
  }

  subscribe(channelId: string, onMessage: (msg: ChatMessage) => void): () => void {
    const supabase = getSupabase();
    if (!supabase) {
      return () => {};
    }
    const realtimeChannel = supabase
      .channel(`chat:${channelId}`)
      .on("broadcast", { event: "new_message" }, (payload: { payload: ChatMessage }) => {
        if (payload?.payload) {
          onMessage(payload.payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }

  async getHistory(
    channelId: string,
    beforeCreatedAt?: string,
    limit = 50,
  ): Promise<ChatMessage[]> {
    const supabase = getSupabase();
    if (!supabase) {
      return [];
    }
    const { data, error } = await supabase.rpc("get_channel_messages", {
      p_channel_id: channelId,
      p_before_created_at: beforeCreatedAt || null,
      p_limit: limit,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Map database snake_case row to ChatMessage camelCase
    return data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      channelId: String(row.channel_id),
      senderId: String(row.sender_id),
      senderName: row.sender_name ? String(row.sender_name) : undefined,
      clientMsgId: "",
      content: String(row.content),
      filteredContent: String(row.filtered_content || row.content),
      createdAt: String(row.created_at),
    }));
  }
}
