# Backlog và phác thảo các phase sau

Ý tưởng mới ghi vào mục **Hộp ý tưởng**. Khi bắt đầu một phase, tách mục tương ứng thành file `tasks/P<n>-<ten>.md` (cùng định dạng P0–P2) có acceptance criteria, rồi chạy phiên lập kế hoạch với agent.

## P3 — Nhiều người chơi cơ bản và chat (`docs/05` mục 1, 2, 5, 6)
- [ ] Hồ sơ công khai (`public_profiles`), tìm người chơi theo tên.
- [ ] Bảng chat (`/db-migration`), hàm `is_channel_member`, RLS theo thành viên kênh.
- [ ] Edge Function `chat-send`: JWT → zod → rate limit → quyền kênh → chặn/mute → lọc từ → lưu → broadcast.
- [ ] `ChatTransport` interface + cài đặt Supabase Realtime; client không phát trực tiếp.
- [ ] Kênh `planet`, `dm`, `global` (Liên Tinh) với điều kiện mở khóa và hạn mức.
- [ ] Chặn (block), mute, báo cáo (`chat_reports`), lọc từ cấm tiếng Việt.
- [ ] Presence cho bạn bè; hệ thống bạn bè.
- [ ] `notifications` cho sự kiện offline.
- [ ] Job `pg_cron` xóa tin cũ.
- [ ] Test: XSS, flood, đọc kênh người khác, bị chặn vẫn nhận tin, tin trùng khi mạng chập chờn.
- [ ] Bật bằng feature flag `chat_enabled`; `/security-review` + `/release`.

## P4 — Liên minh và Party (`docs/05` mục 3, 4)
- [ ] Bảng alliance/party (`/db-migration`), RPC theo vai trò, kho chung + `alliance_ledger`.
- [ ] Mời/chấp nhận/rời/kick/thăng chức/chuyển quyền, cooldown, hạn mức rút/góp.
- [ ] Buff liên minh, nhiệm vụ liên minh, chat `alliance`.
- [ ] Party: lập, mời, hết hạn, chia thưởng (server tính), chat `party`.
- [ ] Chống clone/chuyển tài nguyên lậu: hạn mức theo tuổi tài khoản; cờ đồ thị chuyển.
- [ ] Test quyền theo vai trò gọi RPC trực tiếp; test race kick/rút kho.

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
