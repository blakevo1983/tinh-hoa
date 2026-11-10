# P7 — Củng cố và Ra mắt (Hardening, Audit & Launch Readiness)

**Điều kiện bắt đầu:** P6 xong. **Đọc trước:** `docs/00-GDD.md`; `docs/01-ROADMAP.md` dòng P7; `docs/04-SECURITY.md` mục 10, 11.

---

### T7.1 — Pentest Nội Bộ Toàn Diện (Comprehensive Security Pentest)
- [x] Kiểm tra 100% bảng trong database có `ENABLE ROW LEVEL SECURITY`.
- [x] Kiểm tra 100% hàm `SECURITY DEFINER` có `set search_path = ''`.
- [x] Kiểm thử đối kháng tổng hợp: SQL injection, IDOR, brute-force rate limits, giả mạo token.
- [x] Viết test suite kiểm tra an ninh toàn diện tại `tests/p7-pentest.test.ts`.

### T7.2 — Thử Tải Mô Phỏng Hiệu Năng k6 & Ngân Sách 0đ
- [x] Script thử tải `scripts/load-test-k6.js` (100 VU đồng thời, mô phỏng gửi lệnh game, chat, giao thương).
- [x] Đảm bảo p95 latency $\le 500$ms và tỷ lệ lỗi $< 0.1\%$, tuân thủ hạn ngạch gói miễn phí.
- [x] Unit test xác thực cấu hình thử tải tại `scripts/load-test-k6.test.ts`.

### T7.3 — Pháp Lý, Quyền Riêng Tư & Cơ Chế Xóa Tài Khoản
- [x] Soạn thảo Điều khoản Dịch vụ tại `docs/legal/TERMS-OF-SERVICE.md`.
- [x] Soạn thảo Chính sách Quyền Riêng Tư tại `docs/legal/PRIVACY-POLICY.md`.
- [x] Soạn thảo Quy tắc Cộng đồng tại `docs/legal/COMMUNITY-GUIDELINES.md`.
- [x] Migration SQL: RPC `delete_own_account()` xóa sạch dữ liệu cá nhân, ẩn danh hóa nội dung công cộng và tuân thủ quyền được lãng quên.

### T7.4 — Bảng Điều Khiển Vận Hành & Giám Sát (Operations & Status)
- [x] Component `apps/web/src/components/admin-moderation-panel.ts`: duyệt báo cáo vi phạm chat, thực thi mute người chơi.
- [x] Component `apps/web/src/components/status-indicator.ts`: hiển thị trạng thái kết nối máy chủ.
- [x] Unit tests cho giao diện vận hành và trạng thái.

### T7.5 — Đánh Giá An Ninh Cuối Cùng & Đóng Toàn Bộ Dự Án
- [x] Báo cáo an ninh toàn diện tại `docs/security-reviews/P7.md`.
- [x] Chạy `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm secret-scan`.
- [x] Cập nhật `tasks/BACKLOG.md` hoàn thành 100% tất cả các Phase P0 đến P7.
