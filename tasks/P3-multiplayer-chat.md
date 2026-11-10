# P3 — Nhiều người chơi cơ bản và chat

**Điều kiện bắt đầu:** P2 xong. **Đọc trước:** `docs/05-MULTIPLAYER-SOCIAL.md`, `docs/04-SECURITY.md` mục 7, 8.

---

### T3.1 — Hồ sơ công khai, Bạn bè và Chặn
- [x] Bảng / View `public_profiles` (chỉ hiển thị `id`, `display_name`, `avatar_url`, `created_at`, `stage`, không lộ email).
- [x] Bảng `friendships` (trạng thái: pending, accepted, rejected) và `user_blocks` (chặn hai chiều).
- [x] Migration SQL, RLS deny-by-default, pgTAP test bảo vệ quyền riêng tư.

### T3.2 — Cơ sở dữ liệu Chat & Thông báo
- [x] Bảng `chat_channels`, `chat_members`, `chat_messages`, `chat_reports`, `notifications`.
- [x] Hàm PostgreSQL `is_channel_member(channel_id, user_id)` an toàn (`SECURITY DEFINER set search_path = ''`).
- [x] RLS: Chỉ thành viên kênh mới được `SELECT` tin nhắn; client không có quyền `INSERT/UPDATE/DELETE` trực tiếp vào `chat_messages`.
- [x] Migration SQL, pgTAP test RLS kênh kín, kênh toàn cục và DM.

### T3.3 — Zod Schemas & Bộ lọc từ cấm tiếng Việt thuần túy
- [x] Zod schema cho gửi tin chat (`ChatMessageSchema`, `ChatSendRequestSchema`, `ChatReportSchema`).
- [x] Hàm thuần `filterProfanity(text)` chuẩn hóa unicode dấu tiếng Việt và ký tự thay thế (leetspeak: vkl, dmm, cmn, ...).
- [x] Giới hạn cấu hình trong `packages/shared/src/config/limits.ts`: độ dài tin $\le 300$, rate limit, hạn mức theo tuổi tài khoản.
- [x] Unit test và property test cho bộ lọc từ cấm.

### T3.4 — Edge Function `chat-send`
- [x] Deno function tiếp nhận yêu cầu gửi tin: JWT → zod validate → rate limiter → kiểm tra quyền kênh → kiểm tra bị chặn/mute → lọc từ ngữ → `INSERT chat_messages` (kèm `client_msg_id` chống trùng tin) → broadcast Realtime.
- [x] Client không bao giờ phát trực tiếp vào kênh realtime (kênh server-only broadcast).
- [x] Unit tests cho Edge function với kịch bản kiểm tra quyền, flood và từ cấm.

### T3.5 — Client ChatTransport & Giao diện Chat
- [x] Giao diện `ChatTransport` (`send`, `subscribe`, `getHistory`).
- [x] Component UI Chat Panel (`chat-panel.ts`): chuyển kênh `planet`, `dm`, `global` (Liên Tinh), phân trang cursor `before_id`.
- [x] Tuân thủ Rule 25: min touch target 44px, tương phản cao $\ge 4.5:1$, aria attributes, không dùng emoji làm icon điều khiển.
- [x] Unit test UI Chat.

### T3.6 — Báo cáo vi phạm & Thông báo offline (Notifications)
- [x] Lệnh gửi báo cáo vi phạm lưu vào `chat_reports` kèm ảnh chụp 20 tin xung quanh.
- [x] Bảng `notifications`: lưu thông báo sự kiện (lời mời kết bạn, tin nhắn DM mới khi offline).
- [x] RPC đánh dấu đã đọc `mark_notification_read`.

### T3.7 — Kiểm thử đối kháng an ninh (Security Exploits)
- [x] Test chống XSS injection trong nội dung chat.
- [x] Test chống flood / spam lặp tin liên tiếp.
- [x] Test đọc lén kênh riêng tư hoặc DM người khác khi không phải thành viên.
- [x] Test gửi tin khi bị đối phương chặn (blocked).

### T3.8 — Security Review & Đóng Phase P3
- [x] Báo cáo đánh giá an ninh tại `docs/security-reviews/P3.md`.
- [x] Chạy `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm secret-scan`.
- [x] Cập nhật `tasks/BACKLOG.md` và đóng Phase P3.
