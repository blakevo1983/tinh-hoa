# ADR-0003: Phân tầng logic "Edge Function tính toán, RPC commit_effects cam kết nguyên tử"

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-10
- **Người quyết định:** Đội ngũ Tinh Hoa

## Bối cảnh
Logic game (như công thức tiến hóa, lai tạo sinh vật, tính toán hiệu ứng nguyên tố) phức tạp và thường xuyên cần cập nhật, kiểm thử bằng unit test. Nếu viết toàn bộ logic bằng SQL / PL/pgSQL trong Postgres, code sẽ khó tái sử dụng giữa client (dự đoán giao diện) và server, khó viết unit test, và khó bảo trì. Ngược lại, nếu chỉ tính và ghi trực tiếp từ Edge Function bằng nhiều câu lệnh SQL rời rạc, hệ thống sẽ gặp rủi ro race condition (tranh chấp ghi song song) hoặc cập nhật dở dang khi có lỗi giữa chừng.

## Quyết định
Tách quy trình xử lý lệnh thành 2 bước rõ ràng:
1. **Edge Function `command` tính toán:**
   - Nhận intent từ client, xác thực JWT, xác thực dữ liệu qua Zod schema, kiểm tra rate limit.
   - Nạp trạng thái hiện tại từ DB và chuyển giao cho các **hàm thuần** viết bằng TypeScript trong `packages/shared`.
   - Hàm thuần nhận `(state, clock, rng)` và trả về danh sách các hiệu ứng cần thay đổi (`effects`) hoặc `GameError`.
2. **RPC `commit_effects` cam kết nguyên tử trong Database:**
   - Thực thi bên trong một database transaction duy nhất với khóa hàng `FOR UPDATE`.
   - Kiểm tra `expected_version` (khóa lạc quan phòng chống tranh chấp song song).
   - Áp dụng các hiệu ứng (trừ/cộng tài nguyên, tạo entity, lưu job), kiểm tra ràng buộc toàn vẹn `CHECK (amount >= 0)`.
   - Ghi nhật ký vào `resource_ledger` bất biến và lưu `idempotency_key` để chống phát lại lệnh trùng lặp.
   - Tăng `state_version` và commit.

## Phương án đã cân nhắc
1. **Viết toàn bộ logic trong PL/pgSQL:**
   - *Ưu:* Tất cả logic nằm sát DB, xử lý nguyên tử một chỗ.
   - *Nhược:* Không chia sẻ được code logic với client để làm optimistic prediction; cú pháp PL/pgSQL khó viết test phức tạp cho ma trận lai tạo và đột biến gen.
2. **Edge Function thực thi trực tiếp nhiều truy vấn UPDATE/INSERT riêng lẻ:**
   - *Ưu:* Dễ viết TypeScript toàn bộ.
   - *Nhược:* Rủi ro tranh chấp dữ liệu (race conditions), không đảm bảo ACID nếu mạng đứt giữa các truy vấn; dễ dẫn đến hiện tượng tài nguyên âm hoặc mất cân bằng.

## Hệ quả
- Logic nghiệp vụ được viết 100% bằng TypeScript thuần, có thể chạy và test dễ dàng ở cả server và client.
- Database chỉ đảm nhiệm vai trò xác thực tính nguyên tử, toàn vẹn dữ liệu và kiểm tra khóa phiên bản.
- Idempotency và phòng chống replay attack được bảo đảm tuyệt đối ở tầng cơ sở dữ liệu.

## Cách kiểm chứng
- Integration test mô phỏng gửi 2 lệnh cùng lúc với cùng `expected_version`: một lệnh thành công, lệnh kia nhận lỗi `409 Conflict`.
- Thử gửi lại lệnh cùng `idempotency_key`: server trả về kết quả đã cache (`X-Cache: HIT`) mà không thực hiện trừ tài nguyên 2 lần.
