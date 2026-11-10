# P2 — Sinh vật, lai tạo, nguyên liệu, codex

**Điều kiện bắt đầu:** P1 xong. **Đọc trước:** `docs/00-GDD.md` mục 5–7.

---

### T2.1 — Genome chung và định nghĩa loài
- [x] `Genome` dùng chung sinh vật/nguyên liệu (xem GDD 5, 6). Zod + kiểu; chỉ số kẹp trong biên.
- [x] Danh sách ~10 loài gốc và ~15 nguyên liệu trong config (dữ liệu, không code cứng).
- [x] Bảng `creatures`, `items`, `inventory`, `codex_entries` (`/db-migration`, RLS, pgTAP).

### T2.2 — Hàm lai tạo thuần `breed(a, b, catalyst?, rng, clock)`
- [x] Theo bảng GDD 7: cùng nguyên tố, tương sinh, tương khắc, đối cực; xác suất nguyên tố lai; truyền trait; đột biến; cận huyết.
- [x] **Property test (fast-check):** chỉ số con trong biên; không NaN/âm; tổng xác suất hợp lệ; cùng seed → cùng kết quả; chuỗi 20 thế hệ cùng dòng không tăng vô hạn và bị phạt cận huyết.
- [x] Hàm trả `Effect[]` (tạo sinh vật, trừ nguyên liệu, tạo job ấp).

### T2.3 — Lệnh `breed.start` / hoàn tất ấp
- [x] Điều kiện: cùng giai đoạn, `harmony ≥ 3`, có Hồ Giao Hòa, đủ tài nguyên.
- [x] RNG seed phía server theo `hash(secret, entity_id, counter)`; kết quả lưu ngay lần cam kết đầu.
- [x] Test exploit: lặp lệnh để reroll; lai sinh vật của người khác; truyền chỉ số từ client → đều bị chặn.

### T2.4 — Chế tác nguyên liệu
- [ ] Quy tắc nguyên tố + vài công thức bí mật; Lò Chế Tác; sink cân bằng nguồn.
- [ ] Codex ghi tổ hợp mới; hiển thị "đã tìm x/y".
- [ ] Test: không có vòng chế → lợi nhuận dương vô hạn.

### T2.5 — Sinh vật trên hành tinh
- [ ] Sinh vật xuất hiện theo mốc tiến hóa và biome; hệ sinh thái cân bằng (quá đông → suy thoái ô).
- [ ] Sản phẩm sinh vật → nguyên liệu (theo nguyên tố, sinh vật lai cho nguyên liệu lai).

### T2.6 — Hình dáng tự tạo
- [ ] Vẽ sinh vật bằng Canvas từ genome: khối cơ bản + màu pha + họa tiết trait; biểu tượng nguyên tố.
- [ ] Snapshot test hình theo genome cố định (so sánh dữ liệu vẽ, không so ảnh thật).

### T2.7 — Mô phỏng cân bằng `pnpm sim:balance`
- [ ] Script chạy N seed × M lượt: tỉ lệ thắng cặp nguyên tố, phân phối chỉ số qua thế hệ, thời gian tới mốc.
- [ ] Báo cáo ra `docs/balance/`. Chạy `/balance-check` và chỉnh config tới khi đạt tiêu chí trong workflow.

### T2.8 — Giao diện lai tạo
- [ ] Kéo hai sinh vật/nguyên liệu vào hai ô → "Kết hợp"; hiệu ứng nhẹ; gợi ý mờ khi tổ hợp khả dụng; không có thất bại cứng.
- [ ] Codex UI.

### T2.9 — Review và phát hành alpha riêng tư
- [ ] `/security-review` (phiên mới), `/balance-check`, `/release` staging.
- [ ] Mời 2–3 người bạn chơi thử (alpha), thu phản hồi vào `tasks/BACKLOG.md`.
