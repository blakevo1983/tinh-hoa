# Rule 10 — Bảo mật & chống gian lận (Always On)

Đây là danh sách kiểm tra cứng. Mọi task chạm tới server, DB, chat, tài nguyên, liên minh, party phải tuân theo. Chi tiết: `docs/04-SECURITY.md`.

## A. Quyền và dữ liệu
1. RLS bật trên **mọi** bảng trong schema `public`. Không có policy = từ chối.
2. Authenticated chỉ có `SELECT` trên dữ liệu của chính mình hoặc dữ liệu công khai đã chọn. **Không** có INSERT/UPDATE/DELETE trực tiếp lên bảng game.
3. Thay đổi trạng thái chỉ qua RPC/Edge Function. RPC `SECURITY DEFINER` phải: `set search_path = ''`, tên bảng đầy đủ schema, kiểm `auth.uid()` ở dòng đầu, không nhận `user_id` từ tham số.
4. Ràng buộc DB là tuyến phòng thủ cuối: `CHECK (amount >= 0)`, khóa ngoại, `UNIQUE` cho idempotency, trigger chặn sửa/xóa `resource_ledger`.
5. Cột nhạy cảm (email, IP hash, trust score, cờ gian lận) không expose qua view công khai.

## B. Input và biên giới tin cậy
6. Mọi request vào Edge Function: xác thực JWT → validate zod → kiểm quyền sở hữu → rate limit → xử lý. Thứ tự này không đổi.
7. Từ chối input sai (HTTP 4xx, mã lỗi chuẩn), không tự sửa. Giới hạn độ dài, số lượng phần tử, độ sâu JSON.
8. Không bao giờ tin từ client: thời gian, số ngẫu nhiên, giá, số lượng nhận về, ID chủ sở hữu, thế hệ/chỉ số của sinh vật.
9. Không nối chuỗi SQL. Dùng tham số hóa hoặc RPC. Không `eval`, không `new Function`.
10. Tên hiển thị, tên liên minh, nội dung chat: lọc/escape khi hiển thị (dùng `textContent`, không `innerHTML`), chuẩn hóa Unicode, chặn ký tự điều khiển và ký tự đảo chiều chữ.

## C. Chống lạm dụng
11. Rate limit theo người dùng *và* theo hành động (chat, lai tạo, thu thập, tạo liên minh, gửi lời mời). Cấu hình ở `packages/shared/src/config/limits.ts`.
12. Mọi lệnh thay đổi trạng thái cần `idempotency_key` (UUID do client sinh, server lưu). Cùng key → trả lại kết quả cũ, không thực hiện lại.
13. Khóa lạc quan: lệnh gửi kèm `expected_version` của hành tinh; lệch → từ chối `409` để chống chạy song song/replay.
14. Giới hạn tốc độ tiến độ: nếu tài nguyên tăng vượt mức lý thuyết tối đa → ghi `cheat_flags`, không tự ban, chờ xem xét.
15. Giao dịch giữa người chơi (tặng, đổi, chiến lợi phẩm) có hạn mức theo tuổi tài khoản và theo ngày. Chống chuyển tài nguyên qua tài khoản clone.

## D. Bí mật và triển khai
16. Không commit secret, `.env`, key. `.env.example` chỉ chứa tên biến. Quét bằng gitleaks ở pre-commit và CI.
17. `anon key` là công khai theo thiết kế; `service_role` không bao giờ vào bundle client. Kiểm bằng test build (grep bundle).
18. Header bảo mật trên Cloudflare Pages: CSP chặt, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.
19. Log không chứa email, IP thô, token, nội dung chat đầy đủ. Dùng `request_id` để truy vết.

## E. Khi nghi ngờ
Nếu không chắc một thiết kế có an toàn không: **dừng, nêu rủi ro, đề xuất phương án an toàn hơn**, và chờ người dùng quyết. Chọn phương án khó bị lạm dụng hơn thay vì tiện hơn.
