# P6 — Chiến tranh (Warfare & Combat)

**Điều kiện bắt đầu:** P5 xong. **Đọc trước:** `docs/00-GDD.md` mục 10; `docs/01-ROADMAP.md` dòng P6; `docs/04-SECURITY.md` mục 7, 8; `docs/05-MULTIPLAYER-SOCIAL.md` mục 3.3.

---

### T6.1 — Động cơ Chiến đấu Tự động Theo Lượt (Turn-based Combat Engine)
- [x] Hàm thuần `simulateBattle(attackerTeam, defenderTeam, seed)` trong `packages/shared/src/combat/battle-engine.ts`.
- [x] Thứ tự hành động tính theo `agility`, sát thương tính theo `qi`, giảm trừ theo `guard`, bạo kích theo `chaos`.
- [x] Khắc hệ ngũ hành tăng $30\%$ sát thương, bị khắc giảm $25\%$ sát thương.
- [x] Giới hạn tối đa 50 lượt (chống infinite loop), xác định 100% từ seed.
- [x] Unit tests và property-based tests với `fast-check`.

### T6.2 — Cơ sở dữ liệu Chiến tranh, Lá chắn & RLS
- [x] Bảng `planet_shields` (planet_id, shield_until, reason).
- [x] Bảng `planet_defense_formations` (planet_id, creature_ids uuid[]).
- [x] Bảng `battle_logs` (id, attacker_planet_id, defender_planet_id, winner_side, loot, rounds_data, created_at).
- [x] RLS deny-by-default, bảo vệ thông tin trận đánh và lá chắn.

### T6.3 — RPC Tấn công & Giới hạn Chống Bóc lột
- [x] RPC `attack_planet(target_planet_id, attacker_creature_ids)`:
  - Kiểm tra bảo vệ tân binh (giai đoạn $\ge 4$).
  - Kiểm tra lá chắn hòa bình (`shield_until > now()`).
  - Cấm tự đánh chính mình (`CANNOT_ATTACK_OWN_PLANET`).
  - Chạy `simulateBattle` trên server.
  - Hạn mức cướp tối đa $20\%$ kho tài nguyên chưa bảo vệ của nạn nhân.
  - Tự động kích hoạt lá chắn 12 giờ cho bên bị đánh sau trận chiến.
  - Ghi nhật ký tài nguyên `resource_ledger` và `battle_logs`.

### T6.4 — Đồng Hóa Sinh Vật & Điểm Chiến Tranh Liên Minh
- [x] Xác suất nhận gen từ sinh vật bại trận để bổ sung vào Vạn Vật Chí hoặc lai tạo.
- [x] Tính điểm chiến dịch liên minh nếu 2 bên thuộc 2 liên minh thù địch (`status = 'hostile'`).

### T6.5 — Zod Schemas trong `packages/shared`
- [x] Zod schemas: `combat.ts`, `formation.ts`, `loot.ts`.
- [x] Export trong `packages/shared/src/index.ts`.

### T6.6 — Giao diện Chiến trận (War Room & Battle Viewer UI)
- [x] Component `apps/web/src/components/war-room-panel.ts`: cài đặt đội hình thủ, do thám mục tiêu, nút Tấn Công.
- [x] Component `apps/web/src/components/battle-viewer-modal.ts`: trình diễn diễn biến trận đấu từng hiệp, thanh HP, hiệu ứng ngũ hành sinh khắc.
- [x] Tuân thủ Rule 25: min touch target 44px, tương phản cao, aria attributes.
- [x] Unit tests cho giao diện.

### T6.7 — Kiểm thử đối kháng an ninh (Security Exploits)
- [x] Test tấn công mục tiêu đang có lá chắn hòa bình.
- [x] Test tấn công tân binh giai đoạn < 4.
- [x] Test tự đánh chính mình hoặc clone để farm tài nguyên (cướp vượt 20% bị chặn).
- [x] Test sử dụng sinh vật không thuộc sở hữu vào đội hình công/thủ.

### T6.8 — Security Review & Đóng Phase P6
- [ ] Báo cáo đánh giá an ninh tại `docs/security-reviews/P6.md`.
- [ ] Chạy `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm secret-scan`.
- [ ] Cập nhật `tasks/BACKLOG.md` và đóng Phase P6.
