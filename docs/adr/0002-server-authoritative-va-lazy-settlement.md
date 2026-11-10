# ADR-0002: Kiến trúc Server-Authoritative và mô phỏng theo mốc thời gian (Lazy Settlement)

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-10
- **Người quyết định:** Đội ngũ Tinh Hoa

## Bối cảnh
Các game nhiều người chơi thường dùng game loop server (tick loop 20–60Hz) để cập nhật liên tục tài nguyên và trạng thái. Tuy nhiên, kiến trúc server loop liên tục đòi hỏi server chuyên dụng chạy 24/7, tốn tài nguyên CPU và không khả thi trên hạ tầng serverless ngân sách 0đ. Đồng thời, nếu giao quyền tính toán cho client thì sẽ dễ bị can thiệp bộ nhớ hoặc tua nhanh đồng hồ thiết bị để gian lận.

## Quyết định
1. Áp dụng triệt để mô hình **Server-Authoritative**: Client chỉ gửi ý định (intent/command), server là nguồn sự thật duy nhất xác thực và thay đổi trạng thái. Client chỉ đóng vai trò dự đoán giao diện (optimistic prediction) và hiển thị.
2. Áp dụng mô hình **Mô phỏng theo mốc thời gian (Lazy Settlement)**: Không dùng server tick. Tài nguyên được tính toán lười dựa trên công thức hàm:
   `amount_now = min(cap, amount + rate_per_sec * min(now - updated_at, offline_cap_sec))`
   Mọi hành động chạm tới tài nguyên sẽ thực hiện kết toán (settle) trước khi áp dụng thay đổi. Các công việc có thời gian hoàn thành (lai tạo, ấp nở, xây dựng) lưu mốc `finish_at`; khi người chơi gửi lệnh tiếp theo hoặc mở game, server sẽ hoàn tất các công việc đã kết thúc (`finish_at <= now`).

## Phương án đã cân nhắc
1. **Server Tick Loop (Worker liên tục 60Hz):**
   - *Ưu:* Đồng bộ tức thì từng khung hình.
   - *Nhược:* Rất tốn kém, không thể duy trì trên các gói serverless miễn phí; không cần thiết với thể loại chiến thuật/tiến hóa thời gian thực lai nhàn rỗi (idle/management).
2. **Client-Authoritative (Client tính rồi đồng bộ lên DB):**
   - *Ưu:* Server nhẹ, không tốn tài nguyên CPU.
   - *Nhược:* Rủi ro gian lận 100% (người chơi có thể chỉnh sửa đồng hồ máy, hack bộ nhớ, giả mạo sản lượng tài nguyên).

## Hệ quả
- Tiết kiệm 99% tài nguyên server, hoàn toàn tương thích với mô hình Edge Functions và Postgres serverless.
- Chống gian lận thời gian triệt để vì chỉ sử dụng đồng hồ server (`clock.now()`), mọi mốc thời gian từ client đều bị bỏ qua.
- Client cần triển khai bộ tính dự đoán hiển thị mượt mà trên canvas giữa các lần server phản hồi.

## Cách kiểm chứng
- Mô phỏng thay đổi giờ thiết bị local không làm ảnh hưởng đến số tài nguyên server cấp.
- Unit tests kiểm tra `fakeClock` và các ca settle tài nguyên ở các mốc thời gian khác nhau đạt độ chính xác số học tuyệt đối.
