# P1 — Vòng lặp lõi (một hành tinh, chơi qua server)

**Mục tiêu:** tạo hành tinh, thu thập, xây/nâng cấp, tiến độ offline, lưu server, chống gian lận cơ bản.
**Điều kiện bắt đầu:** P0 xong và đã `/security-review`.
**Đọc trước:** `docs/00-GDD.md` mục 3, 4, 8, 9; `docs/02-ARCHITECTURE.md` mục 3–5; `docs/03-DATA-MODEL.md`.

---

### T1.1 — Sinh hành tinh (hàm thuần)
- [x] `generatePlanet(seed, element, gridSize)` trong `packages/shared`: 60–70% ô nguyên tố chủ đạo thành mảng liền (noise), phần còn lại ngoại lai ngẫu nhiên; biome theo nguyên tố; `richness`.
- [x] Test snapshot theo seed cố định; **property test**: cùng seed → cùng kết quả, tỉ lệ ô chủ đạo trong [0,6; 0,7] ± dung sai, mọi ô hợp lệ.

**Acceptance:** 1.000 seed ngẫu nhiên đều thỏa bất biến; tạo lại đúng từ seed.

### T1.2 — Bảng game và RPC `commit_effects` (`/db-migration`)
- [x] Migration: `planets`, `planet_tiles`, `resource_balances`, `resource_ledger` (trigger bất biến), `buildings`, `jobs`.
- [x] `commit_effects` hoàn chỉnh: kiểm owner, `state_version`, idempotency, áp effect (số dư ± + ledger), tăng version.
- [x] pgTAP: không ghi trực tiếp; số dư không âm; lặp `idempotency_key` trả kết quả cũ; sai `expected_version` bị từ chối; hai giao dịch song song không làm âm số dư.

**Acceptance:** `pnpm test:db` xanh, gồm test song song.

### T1.3 — Lệnh `planet.create`
- [x] Người dùng chọn nguyên tố và tên; **server** sinh seed (không nhận từ client).
- [x] Mỗi người một hành tinh chính (ràng buộc DB `unique(owner_id)` cho hành tinh chính).
- [x] Hiển thị hành tinh bằng Canvas từ dữ liệu server.

**Acceptance:** tạo được một hành tinh; tạo lần hai bị từ chối; không thể ép seed từ client (test).

### T1.4 — Tài nguyên "lười" và offline
- [x] Hàm thuần `settleResources(balance, now, offlineCapSec)`.
- [x] Đọc trạng thái luôn kết toán theo giờ server; trần offline mặc định 8 giờ.
- [x] Client hiển thị ước lượng tăng dần, định kỳ đồng bộ với server.
- [x] Test: đổi giờ máy client **không** ảnh hưởng; offline vượt trần chỉ nhận đến trần.

**Acceptance:** thu thập đúng sau 1 phút/1 giờ/24 giờ giả lập (fakeClock).

### T1.5 — Thu thập và công trình cơ bản
- [x] Công trình: Trạm Thu Thập, Kho (theo GDD mục 8). Lệnh `building.place`, `building.upgrade` (tốn tài nguyên, có `finish_at`).
- [x] Hoàn tất job theo cơ chế *lazy settlement*.
- [x] Hệ số tương sinh/khắc giữa ô kề ảnh hưởng sản lượng theo GDD 3.3.

**Acceptance:** xây → chờ → nhận; thiếu tài nguyên bị từ chối với `INSUFFICIENT_RESOURCES`.

### T1.6 — Bộ test exploit P1
- [x] Double-spend: hai lệnh xây song song cùng số dư → chỉ một thành công.
- [x] Replay: gửi lại cùng `idempotency_key` → không áp hai lần.
- [x] Đặt công trình lên ô người khác/ô đã có công trình/ngoài lưới → từ chối.
- [x] Số lượng âm, `NaN`, quá lớn, kiểu sai → `INVALID_INPUT`.
- [x] Gửi `planet_id` của người khác → `NOT_OWNER`.

**Acceptance:** toàn bộ test exploit xanh.

### T1.7 — Giao diện chơi
- [x] HUD tài nguyên, bảng công trình, chọn ô, hộp xây dựng; hiệu ứng nhẹ; trạng thái chờ/lỗi thân thiện (không chữ đỏ gắt).
- [x] Optimistic UI thay bằng kết quả server khi trả về.
- [x] Hỗ trợ mobile web; kiểm tra bằng Playwright viewport nhỏ.

**Acceptance:** chơi liền 15 phút không lỗi; lỗi server hiển thị bằng chuỗi i18n.

### T1.8 — Mốc tiến hóa 1 → 2
- [ ] Điều kiện lên mốc theo GDD mục 9; lệnh `planet.evolve`; mở rộng lưới 12 → 16.
- [ ] Test: không lên mốc khi thiếu điều kiện; mở rộng lưới tạo ô mới **xác định theo seed**.

**Acceptance:** lên Sơ khai thành công; dữ liệu cũ không đổi.

### T1.9 — Giám sát và flag gian lận
- [ ] Ghi `audit_log` cho lệnh quan trọng; `cheat_flags` khi tăng tài nguyên vượt tối đa lý thuyết (từ ledger).
- [ ] Trang nội bộ (chỉ bạn) liệt kê cờ — có thể là truy vấn SQL ghi trong `docs/`.

**Acceptance:** giả lập tăng bất thường → sinh cờ.

### T1.10 — `/security-review` và `/release` staging
- [ ] Review đối kháng ở phiên mới (prompt mục 3 `docs/07-PROMPT-PLAYBOOK.md`).
- [ ] Phát hành staging; bạn tự chơi thử 15 phút và cố phá 3 cách.

**Acceptance:** báo cáo `docs/security-reviews/P1.md`; không còn phát hiện Cao/Vừa.
