# 04 — Bảo mật và chống gian lận

> **Thực tế cần nhớ:** không có hệ thống nào "không thể hack". Mục tiêu là (1) làm cho gian lận **không khả thi về mặt kỹ thuật** ở những chỗ quan trọng nhất, (2) làm cho phần còn lại **tốn kém hơn giá trị thu được**, và (3) **phát hiện và khắc phục nhanh** khi có sự cố. Code chạy trên máy người chơi luôn có thể bị đọc và sửa; vì vậy mọi thứ quan trọng nằm ở server.

## 1. Tài sản cần bảo vệ
Tài khoản và dữ liệu người chơi · tính công bằng (tài nguyên, sinh vật, xếp hạng) · dịch vụ (không bị làm sập) · không gian xã hội (chat không bị spam/quấy rối) · khóa bí mật (service key, salt) · uy tín dự án.

## 2. Mô hình đe dọa (kẻ tấn công điển hình)
| Kẻ tấn công | Mục tiêu | Chiêu thường gặp | Phòng thủ chính |
|---|---|---|---|
| Người chơi gian lận | Tài nguyên/sinh vật miễn phí | Sửa request, replay, chạy song song, đổi giờ máy, reroll ngẫu nhiên | Server-authoritative, idempotency, `expected_version`, giờ server, RNG server, ledger |
| Farmer đa tài khoản | Dồn tài nguyên về một tài khoản | Tặng/đổi/chiến lợi phẩm qua clone | Hạn mức theo tuổi tài khoản, giới hạn chuyển, giám sát đồ thị chuyển |
| Bot | Spam chat/đăng ký | Đăng ký hàng loạt, flood | Turnstile, xác minh email, rate limit, chặn chat khi tài khoản mới |
| Kẻ phá hoại | Làm sập/đầy DB | Request khổng lồ, spam, vòng lặp tốn kém | Giới hạn kích thước, rate limit, dọn dữ liệu, feature flag tắt khẩn cấp |
| Kẻ xâm nhập | Đọc dữ liệu người khác | IDOR, RLS thiếu, SQL injection, lộ key | RLS deny-by-default, RPC kiểm `auth.uid()`, tham số hóa, quét secret |
| Kẻ quấy rối | Làm hại người chơi khác | Chat lạm dụng, tên xúc phạm, doxxing | Chặn/báo cáo/mute, lọc từ, giới hạn, quy trình xử lý |
| XSS | Chiếm phiên | Mã độc trong chat/tên | Escape, `textContent`, CSP chặt, chuẩn hóa Unicode |

## 3. Các lớp phòng thủ
1. **Biên:** Cloudflare (DDoS cơ bản, CSP/header), Turnstile khi đăng ký/đăng nhập đáng ngờ.
2. **Xác thực:** Supabase Auth, xác minh email, JWT ngắn hạn, refresh token xoay vòng. Không tự viết hệ thống mật khẩu.
3. **Cổng lệnh duy nhất:** `command`/`chat-send`: JWT → zod → quyền sở hữu → rate limit → logic → RPC.
4. **Logic thuần ở server:** `packages/shared` chạy lại trên server; client chỉ dự đoán.
5. **DB:** RLS, `CHECK`, `UNIQUE`, trigger sổ cái bất biến, `SECURITY DEFINER` có kiểm soát.
6. **Giám sát:** `audit_log`, `cheat_flags`, cảnh báo bất thường.
7. **Khẩn cấp:** feature flag tắt tính năng, khóa tài khoản, khôi phục từ backup.

## 4. Chống gian lận cụ thể

### 4.1. Tài nguyên và thời gian
- Giờ do server cung cấp; bỏ qua mọi mốc thời gian từ client.
- Tài nguyên offline: `min(now − updated_at, offline_cap)`. Đổi giờ máy vô hiệu.
- `resource_balances` có `CHECK (amount >= 0)`; mọi thay đổi có dòng `resource_ledger` với `idempotency_key UNIQUE`.

### 4.2. Replay và chạy song song
- `idempotency_key` bắt buộc cho mọi lệnh đổi trạng thái: gửi lại → trả kết quả cũ.
- `expected_version`: hai lệnh song song cùng phiên bản → một cái thắng, một cái nhận `409`.
- Khóa hàng `FOR UPDATE` trong RPC.

### 4.3. Ngẫu nhiên và lai tạo
- RNG seed phía server, kết quả lưu ngay lần cam kết đầu. Không có đường để "xem trước rồi hủy".
- Chỉ số sinh vật do server tính; client không bao giờ gửi chỉ số.

### 4.4. Phát hiện bất thường (heuristic, không tự ban)
- Tốc độ tăng tài nguyên vượt tối đa lý thuyết từ ledger → `cheat_flags` (mức Cao).
- Số lệnh/giây bất thường (bot/macro); chuỗi lệnh đều tăm tắp theo mili-giây.
- Đồ thị chuyển tài nguyên: nhiều tài khoản mới cùng đổ về một đích.
- Nhiều tài khoản cùng `ip_hash`/mẫu đăng ký.
- Cờ chỉ để con người xem xét; ban tự động chỉ cho spam rõ ràng (flood chat).

### 4.5. Chống clone/đa tài khoản
Hạn mức tặng/đổi theo tuổi tài khoản và giai đoạn; chiến lợi phẩm không áp dụng giữa hai tài khoản cùng nhóm nghi vấn; cooldown khi rời/vào liên minh; hạn chế người mới (giai đoạn < 3) khỏi chat toàn cục.

## 5. Xác thực và phiên
- Email + mật khẩu hoặc magic link; cân nhắc OAuth (Google) giảm lạm dụng đăng ký.
- Bật xác minh email; giới hạn đăng ký theo `ip_hash`; Turnstile ở form.
- Không lưu token trong `localStorage` nếu có lựa chọn an toàn hơn do SDK cung cấp; luôn dùng CSP.

## 6. Bảo vệ đầu vào
- zod với giới hạn độ dài/số lượng/độ sâu ở **mọi** endpoint.
- Giới hạn kích thước body ở Edge Function; từ chối quá cỡ.
- Chat: ≤ 300 ký tự, chuẩn hóa NFC, loại ký tự điều khiển/đảo chiều, lọc từ khóa cấm, chặn lặp/spam.
- Tên hiển thị/tên liên minh: whitelist ký tự + lọc từ cấm + kiểm trùng gần giống (chống mạo danh).

## 7. Bảo vệ client
- CSP chặt: `default-src 'self'`; script chỉ từ nguồn cần thiết; `frame-ancestors 'none'`; `object-src 'none'`.
- Không có `innerHTML` với dữ liệu người dùng; dùng `textContent`.
- Phụ thuộc: khóa phiên bản, `pnpm audit`, Dependabot, tránh gói ít người dùng.
- Không coi obfuscation là bảo mật.

## 8. Bí mật và hạ tầng
- Secret chỉ ở `supabase secrets`, GitHub Actions secrets. `gitleaks` ở pre-commit và CI.
- Tách `service_role` hoàn toàn khỏi client; CI kiểm bundle.
- Staging và production dùng project/key riêng. Giới hạn ai có quyền production.
- 2FA cho tài khoản GitHub, Supabase, Cloudflare của bạn.
- Sao lưu DB định kỳ ngoài hệ thống, thử khôi phục.

## 9. Checklist phát hành bảo mật (chạy ở `/release`)
- [ ] Không bảng `public` nào thiếu RLS (pgTAP kiểm tự động)
- [ ] Authenticated không ghi trực tiếp được bảng game (pgTAP)
- [ ] Mọi RPC `SECURITY DEFINER` có `set search_path = ''` và kiểm `auth.uid()`
- [ ] Mọi endpoint có zod, giới hạn kích thước, rate limit
- [ ] Mọi lệnh đổi trạng thái có `idempotency_key` và `expected_version`
- [ ] Bộ test exploit xanh (double-spend, replay, song song, đổi giờ, reroll, IDOR)
- [ ] Bundle client không chứa `service_role`; gitleaks sạch; `pnpm audit` không lỗi nghiêm trọng
- [ ] CSP và header bảo mật bật; Turnstile bật
- [ ] Chat: XSS test, rate limit, chặn/báo cáo hoạt động
- [ ] Log không chứa PII; có `request_id`
- [ ] Feature flag tắt khẩn cấp đã thử
- [ ] Backup mới nhất + khôi phục thử thành công
- [ ] 2FA bật cho mọi tài khoản quản trị

## 10. Ứng phó sự cố
1. **Phát hiện:** cảnh báo Sentry/log, báo cáo người chơi, `cheat_flags` tăng.
2. **Giảm thiểu:** tắt tính năng bằng feature flag; khóa tài khoản liên quan; thu hồi key nếu nghi lộ.
3. **Điều tra:** dùng `audit_log` + `resource_ledger` để dựng lại sự việc.
4. **Khắc phục:** vá, thêm test hồi quy, triển khai.
5. **Khôi phục công bằng:** dùng ledger để hoàn tác tài nguyên gian lận có chọn lọc; cân nhắc bồi thường cho người bị ảnh hưởng.
6. **Rút kinh nghiệm:** viết ngắn trong `docs/incidents/`, cập nhật checklist.
Nếu lộ dữ liệu cá nhân: thông báo người dùng bị ảnh hưởng theo quy định hiện hành.

## 11. Pháp lý và tuân thủ (cần kiểm tra trước khi mở công khai)
Mình không phải luật sư. Nếu phát hành tại Việt Nam, game nhiều người chơi có tương tác (chat, đối kháng) và việc thu thập dữ liệu cá nhân có thể thuộc diện quy định về trò chơi điện tử trên mạng và bảo vệ dữ liệu cá nhân (ví dụ Nghị định 147/2024/NĐ-CP về quản lý dịch vụ Internet, và các quy định về dữ liệu cá nhân hiện hành). **Hãy kiểm tra quy định hiện hành hoặc hỏi tư vấn pháp lý** trước beta mở. Cần có: Điều khoản sử dụng, Chính sách quyền riêng tư, quy tắc cộng đồng, cơ chế xóa tài khoản, và xử lý người chơi dưới tuổi (không thu thập dữ liệu thừa, chat được kiểm duyệt).
