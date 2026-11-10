---
description: Tự review bảo mật và chống gian lận cho thay đổi hiện tại trước khi mở PR
---

# /security-review

Chạy với vai trò **người tấn công**, không phải người viết code. Mục tiêu: tìm cách phá trước khi người chơi tìm ra.

## Bước
1. Liệt kê file đã thay đổi (`git diff --name-only main`). Xác định các điểm vào: endpoint, RPC, kênh realtime, trường nhập của người dùng.
2. Với **mỗi điểm vào**, trả lời bằng bằng chứng (dòng code/test), không trả lời chung chung:
   - Ai gọi được? Có xác thực và kiểm quyền sở hữu không?
   - Input được validate bằng zod chưa? Giới hạn độ dài/số lượng/độ sâu?
   - Có tin dữ liệu nào từ client (thời gian, ngẫu nhiên, số lượng, giá, owner) không?
   - Gọi **lặp** cùng `idempotency_key` thì sao? Gọi **song song** hai lần thì sao? Gửi lại request cũ (replay) thì sao?
   - Giá trị biên: 0, âm, rất lớn, `NaN`, số thập phân, chuỗi Unicode lạ, mảng rỗng/khổng lồ?
   - Rate limit và hạn mức theo ngày đã có chưa?
3. **Kịch bản gian lận cần thử** (viết thành test nếu chưa có):
   - Tiêu hai lần cùng một tài nguyên bằng hai request đồng thời.
   - Sửa thời gian máy để nhận tài nguyên offline sớm.
   - Reload/lặp lệnh lai tạo để reroll kết quả.
   - Gửi `owner_id`/`planet_id` của người khác.
   - Dùng nhiều tài khoản để chuyển tài nguyên (tặng, chiến lợi phẩm, liên minh).
   - Spam chat/lời mời để làm đầy DB hoặc quấy rối.
   - Chèn HTML/script/ký tự điều khiển vào tên và chat.
4. **Kiểm RLS:** bảng mới đã `enable row level security` chưa? Có policy ghi cho `authenticated` không (không được có)? Có view/hàm nào vô tình lộ dữ liệu nhạy cảm không?
5. **Kiểm secret:** chạy `gitleaks detect`; grep bundle client không có `service_role`.
6. **Báo cáo** theo bảng: *Phát hiện / Mức độ (Cao-Vừa-Thấp) / Bằng chứng / Cách sửa / Đã sửa?*. Sửa hết mức Cao và Vừa trước khi mở PR; mức Thấp ghi vào `tasks/BACKLOG.md`.
7. Nếu phát hiện lỗ hổng đã có trên production: **dừng**, báo người dùng ngay, đề xuất cách giảm thiểu tạm thời (tắt tính năng bằng feature flag) trước khi vá.
