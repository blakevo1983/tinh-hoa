# P5 — Thăm dò, Giao thương và Ngoại giao

**Điều kiện bắt đầu:** P4 xong. **Đọc trước:** `docs/00-GDD.md` mục 10; `docs/01-ROADMAP.md` dòng P5; `docs/04-SECURITY.md` mục 6, 7; `docs/05-MULTIPLAYER-SOCIAL.md` mục 3.3.

---

### T5.1 — Cơ sở dữ liệu Hành tinh NPC & Đài Quan Sát
- [x] Bảng `npc_planets` (id, name, element, personality, base_resources, coordinates, discovered_at).
- [x] Tích hợp công trình `observatory` (Đài Quan Sát) mở khóa thăm dò vũ trụ.
- [x] RLS deny-by-default, migration SQL cho NPC planets và tọa độ thiên hà.

### T5.2 — Lệnh Thăm Dò Viễn Chinh (`expedition.start` & Lazy Settlement)
- [x] Schema lệnh `expedition.start`: tiêu tốn năng lượng/tài nguyên, tạo job trong `active_jobs` loại `expedition` kèm `finish_at`.
- [x] RPC `settle_expedition(job_id)`: xác định phần thưởng ngẫu nhiên theo seed xác định và tính cách hành tinh đích.
- [x] Ngăn ngừa nhận thưởng 2 lần (idempotent claim) và kiểm tra thời gian hoàn tất trung thực ở server.

### T5.3 — Thị trường Giao Thương NPC & Chống Vòng Lợi Nhuận Vô Hạn
- [x] RPC `trade_with_npc(npc_planet_id, offer_resource, offer_amount, target_resource)`:
  - Tỷ giá tính toán server-authoritative dựa trên ma trận ngũ hành và tính cách NPC.
  - Có spread (phí giao dịch 15–20%) đảm bảo tích các tỷ giá nghịch đảo $Rate(A \to B) \times Rate(B \to A) < 1.0$.
  - Hạn mức giao thương ngày (`daily_trade_cap`) chống phá giá/bơm tài nguyên.
- [x] Bảng `trade_ledger` lưu vết giao dịch.

### T5.4 — Quan hệ Ngoại Giao Liên Minh (Alliance Diplomacy)
- [x] Bảng `alliance_diplomacy` (alliance_a, alliance_b, status: `neutral`, `allied`, `hostile`, proposed_by, updated_at).
- [x] RPC `propose_alliance_diplomacy`, `respond_alliance_diplomacy`: chỉ leader mới có quyền; đồng minh được giảm thuế giao thương và chia sẻ tầm nhìn thăm dò.

### T5.5 — Zod Schemas & Pure Economic Logic trong `packages/shared`
- [x] Schemas cho expedition, trade, diplomacy trong `packages/shared/src/schemas/`.
- [x] Hàm thuần `calculateNpcExchangeRate` và `generateNpcPlanet`.
- [x] Unit tests và property-based tests chứng minh không tồn tại bất kỳ chu trình arbitrage sinh lời vô hạn nào ($A \to B \to C \to A$).

### T5.6 — Giao diện Thăm dò, Thị trường & Ngoại giao UI
- [x] Component `apps/web/src/components/expedition-panel.ts`: danh sách hành tinh NPC, gửi tàu thăm dò, theo dõi tiến độ job.
- [x] Component `apps/web/src/components/trade-panel.ts`: giao diện trao đổi tài nguyên, máy tính tỷ giá, hạn mức giao dịch.
- [x] Component `apps/web/src/components/diplomacy-panel.ts`: danh sách liên minh và quản lý quan hệ ngoại giao.
- [x] Tuân thủ Rule 25: min touch target 44px, tương phản cao, aria attributes.
- [x] Unit tests cho các component giao diện.

### T5.7 — Kiểm thử đối kháng an ninh (Security Exploits)
- [x] Test arbitrage exploit: chu trình giao dịch liên hoàn nhiều bước $A \to B \to C \to A$ luôn luôn chịu hao hụt.
- [x] Test vượt hạn mức giao thương ngày.
- [x] Test gian lận thời gian nhận thưởng viễn chinh trước khi `finish_at`.
- [x] Test double-claim phần thưởng thăm dò.
- [x] Test thành viên thường/officer cố tình gửi đề xuất ngoại giao hoặc tuyên bố chiến tranh.

### T5.8 — Security Review & Đóng Phase P5
- [x] Báo cáo đánh giá an ninh tại `docs/security-reviews/P5.md`.
- [x] Chạy `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm secret-scan`.
- [x] Cập nhật `tasks/BACKLOG.md` và đóng Phase P5.
