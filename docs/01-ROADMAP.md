# 01 — Lộ trình

**Nguyên tắc xếp thứ tự:** nền tảng an ninh và server-authoritative đi **trước** nội dung game, vì vá bảo mật vào game đã chạy khó và đắt hơn nhiều. Ngay cả bản chơi đơn (P1) cũng chạy qua server để mọi thứ về sau không phải viết lại.

Cỡ việc: S (vài giờ) · M (1–2 ngày) · L (vài ngày) — tính theo nhịp vibe code, mang tính ước lượng.

| Phase | Tên | Cỡ | Mục tiêu | Tiêu chí hoàn thành (exit criteria) |
|---|---|---|---|---|
| **P0** | Nền móng | M | Repo, CI, auth, cổng lệnh, RLS baseline | Đăng ký/đăng nhập được; `command` trả lỗi chuẩn; CI xanh; pgTAP chứng minh anon/người khác không đọc/ghi được dữ liệu |
| **P1** | Vòng lặp lõi (1 hành tinh) | L | Sinh hành tinh, thu thập, xây, nâng cấp, offline, lưu server | Chơi được 15 phút liên tục; tài nguyên đúng sau offline; bộ test exploit (double-spend, replay, đổi giờ) xanh |
| **P2** | Sinh vật, lai tạo, codex | L | Genome chung, lai tạo, chế tác, codex, sprite tự tạo | Property test lai tạo xanh; `sim:balance` không có chiến thuật thống trị rõ rệt; codex hoạt động |
| **P3** | Nhiều người chơi cơ bản | L | Hồ sơ, presence, **chat hành tinh/DM/liên tinh**, chặn/báo cáo, kiểm duyệt | 2 trình duyệt chat realtime; rate limit và chặn hoạt động; không đọc được kênh người khác; không XSS qua chat |
| **P4** | Liên minh và Party | L | Liên minh, vai trò, kho chung, party thăm dò, chat nhóm | Tạo/mời/rời/kick đúng quyền; chống chuyển tài nguyên lậu; test quyền theo vai trò xanh |
| **P5** | Thăm dò và giao thương | L | Hành tinh NPC, thăm dò, giao thương, ngoại giao | Thăm dò có kết quả xác định/lưu; giao thương có hạn mức; không vòng lợi nhuận vô hạn |
| **P6** | Chiến tranh | L | Chiến đấu tự động theo lượt, lá chắn, chiến lợi phẩm, chiến tranh liên minh | Server tính 100%; chống snowball (lá chắn, hạn mức cướp); mô phỏng cân bằng đạt |
| **P7** | Củng cố và ra mắt | M | Pentest nội bộ, tải, backup/khôi phục, pháp lý, tài liệu, vận hành | Checklist phát hành bảo mật xanh; thử tải đạt mục tiêu; thử khôi phục DB thành công; đã xem xét pháp lý |

## Cột mốc phát hành
- **Alpha riêng tư (sau P2):** bạn và bạn bè thử, dữ liệu có thể reset.
- **Beta kín (sau P4):** mời giới hạn, bật chat và liên minh bằng feature flag.
- **Beta mở (sau P6 + P7 checklist):** công khai, có điều khoản/chính sách riêng tư.

## Quy tắc đổi phạm vi
- Ý tưởng mới → `tasks/BACKLOG.md`, không chèn vào phase đang chạy.
- Chỉ chuyển sang phase tiếp theo khi **exit criteria** của phase trước đạt và đã chạy `/security-review` cho phase đó.
- Mỗi phase kết thúc bằng bản phát hành nhỏ lên staging (`/release`).

## Phụ thuộc chính
`P0 → P1 → P2` (chơi đơn đầy đủ) → `P3` (cần auth + rate limit từ P0) → `P4` (cần chat từ P3) → `P5` → `P6` (cần liên minh P4 và sinh vật P2) → `P7`.
Chat (P3) có thể làm song song với P2 nếu bạn muốn thấy tính xã hội sớm, nhưng không bắt đầu trước khi P0 xong.
