---
description: Mô phỏng và kiểm tra cân bằng khi đổi chỉ số nguyên tố, lai tạo, kinh tế
---

# /balance-check

Dùng khi sửa `packages/shared/src/config/*` hoặc công thức lai tạo, sát thương, tài nguyên.

## Bước
1. Nêu rõ **giả thuyết**: thay đổi này nhằm làm gì (ví dụ "Hỏa quá mạnh ở đầu game").
2. Chạy `pnpm sim:balance` với seed cố định (ví dụ 20 seed × 1.000 lượt). Lưu kết quả ở `docs/balance/<ngay>-<ten>.md`.
3. Kiểm tra các chỉ báo, so sánh **trước và sau**:
   - Tỉ lệ thắng giữa mọi cặp nguyên tố (không cặp nào ngoài 35–65% nếu cùng cấp, trừ khi cố ý khắc chế).
   - Phân phối chỉ số sinh vật lai sau 10 thế hệ: không tăng vô hạn, không rơi về 0 (kiểm cơ chế cận huyết).
   - Thời gian đạt từng mốc tiến hóa (so với mục tiêu trong GDD).
   - Tốc độ tạo tài nguyên theo giờ cho người chơi chủ động và người chơi offline (không vượt trần).
   - Có "chiến thuật thống trị" (một lựa chọn luôn tốt nhất) không?
4. Kiểm **khai thác kinh tế:** vòng lặp tạo ra lợi nhuận dương vô hạn (chế → bán → chế) phải bằng 0 hoặc âm nhờ sink.
5. Nếu số liệu lệch: đề xuất chỉnh tham số, chạy lại, tối đa 3 vòng. Sau đó báo người dùng bảng so sánh và đề xuất cuối cùng.
6. Cập nhật GDD (mục liên quan) và `CHANGELOG` cân bằng. Không đổi số trong code mà không đổi config.
