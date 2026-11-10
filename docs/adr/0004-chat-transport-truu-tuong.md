# ADR-0004: Trừu tượng hóa tầng truyền thông thời gian thực qua giao diện ChatTransport

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-10
- **Người quyết định:** Đội ngũ Tinh Hoa

## Bối cảnh
Game có tính năng chat nhiều kênh (hành tinh, liên minh, tổ đội, toàn cầu) và trạng thái trực tuyến (presence). Gói miễn phí của Supabase Realtime giới hạn 200 kết nối đồng thời. Nếu code client gắn chặt trực tiếp vào SDK của Supabase Realtime Channel, khi cộng đồng game phát triển vượt quá 200 người chơi đồng thời, việc chuyển đổi hạ tầng sang WebSocket server riêng hoặc Cloudflare Durable Objects sẽ đòi hỏi sửa đổi trên diện rộng ở client.

## Quyết định
Định nghĩa một giao diện trừu tượng `ChatTransport` ở client:
```typescript
export interface ChatTransport {
  send(channelId: string, message: OutgoingChatMessage): Promise<Result<ChatMessage, GameError>>;
  subscribe(channelId: string, onMessage: (msg: ChatMessage) => void): () => void;
  getHistory(channelId: string, limit?: number): Promise<Result<ChatMessage[], GameError>>;
}
```
1. **Triển khai ban đầu (P0–P3):** Cài đặt `SupabaseChatTransport` sử dụng Supabase Realtime Broadcast kết hợp với Edge Function `chat-send` để lọc từ ngữ xúc phạm, kiểm tra rate limit và lưu tin nhắn vào DB trước khi broadcast.
2. **Kênh dự phòng mở rộng (Khi vượt ngưỡng gói Free):** Triển khai `CloudflareDurableObjectsTransport` hoặc `WebSocketTransport` mà không làm thay đổi bất kỳ thành phần UI nào của game.

## Phương án đã cân nhắc
1. **Gọi trực tiếp Supabase Realtime Channel trong UI components:**
   - *Ưu:* Code nhanh trong giai đoạn đầu.
   - *Nhược:* Khóa chặt nhà cung cấp (vendor lock-in), khó mock khi viết unit test cho UI chat, chi phí refactor lớn khi scale.
2. **Tự dựng WebSocket server riêng ngay từ đầu:**
   - *Ưu:* Không phụ thuộc Supabase Realtime.
   - *Nhược:* Đòi hỏi máy chủ duy trì kết nối liên tục, tốn chi phí thuê VPS, vi phạm ràng buộc ngân sách 0đ của Phase P0.

## Hệ quả
- Dễ dàng viết Unit test và Mock cho toàn bộ luồng giao diện Chat.
- Client chỉ kết nối tới các kênh mà người chơi đang chủ động mở tab (tránh lãng phí kết nối đồng thời).
- Đảm bảo tính khả chuyển, dễ nâng cấp hạ tầng realtime bất kỳ lúc nào với chi phí kỹ thuật thấp nhất.

## Cách kiểm chứng
- Kiểm tra tính độc lập của module Chat UI bằng mock `ChatTransport` trong Vitest.
- Không có bất kỳ import trực tiếp nào từ `@supabase/supabase-js` bên trong các components chat UI.
