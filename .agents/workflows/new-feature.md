---
description: Làm một task/tính năng mới theo quy trình chuẩn (plan → test → code → review → cập nhật docs)
---

# /new-feature

Dùng khi bắt đầu một task trong `tasks/`. Truyền vào mã task, ví dụ `T1.3`.

## Bước
1. **Đọc bối cảnh.** Mở task trong `tasks/`, đọc mục GDD liên quan (`docs/00-GDD.md`), `docs/02-ARCHITECTURE.md`. Nếu đụng server/DB/chat/liên minh: đọc `docs/04-SECURITY.md` và `docs/05-MULTIPLAYER-SOCIAL.md`.
2. **Viết plan ngắn** (tối đa 15 dòng): file sẽ tạo/sửa, schema/DB đổi gì, luồng dữ liệu, rủi ro bảo mật, cách kiểm thử. Dừng và chờ người dùng đồng ý nếu task chạm DB, tiền tệ trong game, hoặc quyền.
3. **Kiểm tra ràng buộc.** Liệt kê: dữ liệu nào từ client (không tin được), bảng nào sẽ ghi, RLS ra sao, rate limit và idempotency ở đâu.
4. **Viết test trước** (hoặc cùng lúc): ca bình thường, ca biên, ca độc hại (âm, NaN, vượt trần, replay, gọi song song, sai chủ sở hữu).
5. **Cài đặt** theo thứ tự: `packages/shared` (logic thuần + schema) → migration/RPC → Edge Function → client.
6. **Chạy kiểm tra:** `pnpm lint && pnpm typecheck && pnpm test`; nếu đổi DB thêm `pnpm test:db`. Báo kết quả thật. Lỗi thì sửa, không tắt test.
7. **Tự review** bằng `/security-review` nếu đụng server. Với logic cân bằng dùng `/balance-check`.
8. **Cập nhật tài liệu:** tick `[x]` trong `tasks/`, sửa `docs/` nếu hành vi đổi, thêm ADR nếu có quyết định kiến trúc.
9. **Tổng kết** cho người dùng: đã làm gì, file nào đổi, kết quả test, việc còn lại hoặc rủi ro. Soạn mô tả PR theo `.github/PULL_REQUEST_TEMPLATE.md`.

## Không được
- Làm thêm tính năng ngoài task. Ghi ý tưởng thêm vào `tasks/BACKLOG.md`.
- Báo hoàn thành khi test chưa chạy hoặc chưa xanh.
