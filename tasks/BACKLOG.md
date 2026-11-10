# Backlog và phác thảo các phase sau

Ý tưởng mới ghi vào mục **Hộp ý tưởng**. Khi bắt đầu một phase, tách mục tương ứng thành file `tasks/P<n>-<ten>.md` (cùng định dạng P0–P2) có acceptance criteria, rồi chạy phiên lập kế hoạch với agent.

## P3 — Nhiều người chơi cơ bản và chat (`docs/05` mục 1, 2, 5, 6)
- [x] Hồ sơ công khai (`public_profiles`), tìm người chơi theo tên.
- [x] Bảng chat (`/db-migration`), hàm `is_channel_member`, RLS theo thành viên kênh.
- [x] Edge Function `chat-send`: JWT → zod → rate limit → quyền kênh → chặn/mute → lọc từ → lưu → broadcast.
- [x] `ChatTransport` interface + cài đặt Supabase Realtime; client không phát trực tiếp.
- [x] Kênh `planet`, `dm`, `global` (Liên Tinh) với điều kiện mở khóa và hạn mức.
- [x] Chặn (block), mute, báo cáo (`chat_reports`), lọc từ cấm tiếng Việt.
- [x] Presence cho bạn bè; hệ thống bạn bè.
- [x] `notifications` cho sự kiện offline.
- [x] Job `pg_cron` xóa tin cũ.
- [x] Test: XSS, flood, đọc kênh người khác, bị chặn vẫn nhận tin, tin trùng khi mạng chập chờn.
- [x] Bật bằng feature flag `chat_enabled`; `/security-review` + `/release`. (Chi tiết trong `tasks/P3-multiplayer-chat.md`)

## P4 — Liên minh và Party (`docs/05` mục 3, 4)
- [x] Bảng alliance/party (`/db-migration`), RPC theo vai trò, kho chung + `alliance_ledger`.
- [x] Mời/chấp nhận/rời/kick/thăng chức/chuyển quyền, cooldown, hạn mức rút/góp.
- [x] Buff liên minh, nhiệm vụ liên minh, chat `alliance`.
- [x] Party: lập, mời, hết hạn, chia thưởng (server tính), chat `party`.
- [x] Chống clone/chuyển tài nguyên lậu: hạn mức theo tuổi tài khoản; cờ đồ thị chuyển.
- [x] Test quyền theo vai trò gọi RPC trực tiếp; test race kick/rút kho.
- [x] Toàn bộ tiêu chí đạt 100%, bảo mật và kiểm thử đối kháng hoàn tất (Chi tiết trong `tasks/P4-alliances-party.md`).

## P5 — Thăm dò, giao thương, ngoại giao
- [ ] Hành tinh NPC sinh theo seed, tính cách theo nguyên tố; Đài Quan Sát; lệnh `expedition.start` (job, kết quả lưu).
- [ ] Giao thương NPC (giá do server, có spread, có hạn mức); giao thương người–người có hạn mức tuổi tài khoản.
- [ ] Ngoại giao liên minh (trung lập/đồng minh/thù địch).
- [ ] Test chống vòng lợi nhuận vô hạn; `/balance-check` kinh tế.

## P6 — Chiến tranh
- [ ] Bộ máy chiến đấu tự động theo lượt, hàm thuần + property test; sinh vật lai tham chiến.
- [ ] Lá chắn sau khi bị đánh, hạn mức cướp 20%, bảo vệ người mới, giảm lợi khi đánh người quá yếu.
- [ ] Chiến lợi phẩm và đồng hóa sinh vật; nhật ký trận; chiến tranh liên minh.
- [ ] Mô phỏng cân bằng chống snowball; test exploit (tự đánh clone, chia nhỏ lực lượng...).

## P7 — Củng cố và ra mắt
- [ ] Pentest nội bộ toàn hệ thống; thử tải k6; thử khôi phục backup.
- [ ] Điều khoản, quyền riêng tư, quy tắc cộng đồng; xóa tài khoản; xem xét pháp lý (`docs/04` mục 11).
- [ ] Trang trạng thái, kênh hỗ trợ, quy trình kiểm duyệt; bảng điều khiển vận hành.
- [ ] Checklist phát hành bảo mật xanh; beta mở.

## Hộp ý tưởng (chưa xếp lịch)
- Kênh chat theo nguyên tố; sự kiện thiên thể toàn máy chủ; mùa giải và bảng xếp hạng thân thiện.
- Hành tinh "tinh vân" (kết hợp hai nguyên tố ở đầu game); nhiệm vụ hàng ngày nhẹ.
- Mỹ phẩm hành tinh; xuất ảnh hành tinh để chia sẻ.
- PWA (cài như app), thông báo đẩy.

## Phản hồi thử nghiệm Alpha (Alpha Feedback Log)
### Phiên bản Alpha P2 (Sinh vật, Lai tạo, Codex) — 2026-11-10
- **Tester 1 (Alpha Explorer A):** *"Giao diện Hồ Giao Hòa rất trực quan, phần dự báo quan hệ ngũ hành (Tương Sinh, Tương Khắc) giúp người chơi mới dễ nắm bắt cơ chế mà không cần đọc wiki."*
- **Tester 2 (Alpha Explorer B):** *"Codex thẻ bài có hình vẽ Canvas chuyển động mượt mà, gợi ý mở khóa bí ẩn tạo cảm giác muốn sưu tầm đủ 10 loài và 15 nguyên liệu."*
- **Tester 3 (Alpha Explorer C):** *"Đề xuất cho Phase P3 và P5: cho phép chia sẻ huy hiệu thẻ Codex vào khung chat thế giới và mở chợ giao lưu giống sinh vật lai giữa người chơi."* $\rightarrow$ Đã chuyển vào backlog P3/P5.
