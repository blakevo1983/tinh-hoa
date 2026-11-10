# ADR-0001: Chọn Supabase + Cloudflare Pages cho hạ tầng ngân sách 0đ

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-10
- **Người quyết định:** Đội ngũ Tinh Hoa

## Bối cảnh
Game tiến hóa hành tinh nhiều người chơi trực tuyến, yêu cầu cơ sở dữ liệu quan hệ mạnh mẽ, xác thực an toàn, realtime cho chat/presence, hosting client với CDN toàn cầu, và đặc biệt ràng buộc ngân sách hạ tầng ban đầu là **0đ**.

## Quyết định
Chọn kết hợp **Cloudflare Pages** (cho Web Client SPA) và **Supabase** (cho PostgreSQL DB, Auth, Edge Functions, và Realtime Broadcast) trên các gói miễn phí.

## Phương án đã cân nhắc
1. **Cloudflare Pages + Supabase (Được chọn):**
   - *Ưu điểm:* Cloudflare Pages không giới hạn băng thông trong gói miễn phí; Supabase cung cấp PostgreSQL đầy đủ (RLS, Triggers, RPC, pgTAP test), Auth sẵn sàng, Realtime Broadcast, và Edge Functions Deno.
   - *Nhược điểm:* Giới hạn kết nối Realtime đồng thời (200 kết nối) và dung lượng DB 500MB ở gói Free của Supabase.
2. **Cloudflare Workers + Durable Objects + Cloudflare D1:**
   - *Ưu điểm:* Chạy trên cùng một hệ sinh thái Cloudflare Edge, độ trễ cực thấp.
   - *Nhược điểm:* D1 là SQLite phân tán, thiếu các tính năng quan hệ nâng cao như RLS cấp DB (phải tự code RLS ở tầng worker), hệ thống Auth phải tự xây từ đầu; Durable Objects yêu cầu gói trả phí Workers Paid ($5/tháng), vi phạm ràng buộc ngân sách 0đ ban đầu.
3. **Tự dựng VPS (DigitalOcean / Hetzner):**
   - *Ưu điểm:* Toàn quyền kiểm soát server và container.
   - *Nhược điểm:* Tốn chi phí hàng tháng, phải tự vận hành bảo mật, sao lưu, chống DDoS; không đạt tiêu chí ngân sách 0đ.

## Hệ quả
- Khởi động nhanh với chi phí 0đ.
- Phải thiết kế kiến trúc DB tiết kiệm dung lượng và Realtime tiết kiệm kết nối (chỉ subscribe kênh đang hoạt động).
- Khi lượng người chơi vượt ngưỡng gói miễn phí, có lộ trình rõ ràng chuyển chat sang Cloudflare Durable Objects hoặc nâng gói Supabase Pro.

## Cách kiểm chứng
- Client build và host trên Cloudflare Pages tải dưới 1.5s toàn cầu.
- Supabase local và remote đáp ứng tốt các bài test pgTAP và kiểm tra tải.
