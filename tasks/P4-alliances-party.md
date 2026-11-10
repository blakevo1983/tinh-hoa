# P4 — Liên minh và Party

**Điều kiện bắt đầu:** P3 xong. **Đọc trước:** `docs/05-MULTIPLAYER-SOCIAL.md` mục 3, 4; `docs/04-SECURITY.md` mục 6, 7.

---

### T4.1 — Cơ sở dữ liệu Liên minh & RLS
- [x] Bảng `alliances` (id, name, tag, leader_id, level, member_cap, created_at).
- [x] Bảng `alliance_members` (alliance_id, user_id, role, joined_at). Ràng buộc duy nhất: 1 người chỉ ở 1 liên minh.
- [x] Bảng `alliance_balances` và sổ cái append-only `alliance_ledger`.
- [x] RLS deny-by-default, migration SQL, pgTAP test khởi đầu.

### T4.2 — RPC Quản lý Thành viên & Quyền hạn
- [x] RPC `create_alliance(name, tag)`: tiêu tốn tài nguyên, kiểm tra tên/tag duy nhất, gán role `leader`.
- [x] RPC `invite_or_accept_member(alliance_id, user_id)`: chỉ leader/officer gọi được; kiểm tra cooldown 24h và member_cap.
- [x] RPC `kick_member(alliance_id, target_id)`: leader kick được mọi người; officer chỉ kick được member; cấm tự kick.
- [x] RPC `promote_or_demote_member(alliance_id, target_id, new_role)`: chỉ leader gọi được.
- [x] RPC `transfer_leadership(alliance_id, new_leader_id)`: chỉ leader gọi được.
- [x] RPC `leave_alliance(alliance_id)`: leader không thể rời nếu chưa chuyển quyền hoặc giải tán; kích hoạt cooldown 24h.

### T4.3 — Kho chung Liên minh & Sổ cái bất biến
- [x] RPC `alliance_deposit(alliance_id, resource_key, amount)`: thành viên góp tài nguyên, ghi `alliance_ledger`.
- [x] RPC `alliance_withdraw(alliance_id, resource_key, amount)`: chỉ leader/officer rút được; chặn thành viên mới gia nhập dưới 24h; có hạn mức ngày.
- [x] Test chống double-spend kho chung và kiểm tra số dư nguyên tử.

### T4.4 — Nhóm tạm thời (Party 2–5 người) & Chia thưởng
- [x] Bảng `parties` (id, leader_id, title, activity_type, max_members, status, reward_distribution, expires_at).
- [x] Bảng `party_members` (party_id, user_id, contribution_score, joined_at).
- [x] RPC `create_party`, `join_party`, `leave_party`, `distribute_party_rewards` (chia thưởng do server tính toán, yêu cầu đóng góp tối thiểu).
- [x] Tự động tạo kênh chat `party:<party_id>`.

### T4.5 — Zod Schemas & Tính toán Buff Ngũ Hành Liên Minh
- [x] Zod schemas cho liên minh và party trong `packages/shared/src/schemas/alliance.ts` và `party.ts`.
- [x] Hàm thuần `calculateAllianceElementalBuff(memberElements)`: tăng sản lượng dựa trên độ đa dạng nguyên tố tương sinh của các thành viên.
- [x] Unit tests và property tests cho buff ngũ hành.

### T4.6 — Giao diện Liên minh & Party UI
- [x] Component `apps/web/src/components/alliance-panel.ts`: danh sách thành viên, trạng thái kho chung, nút hành động theo vai trò.
- [x] Component `apps/web/src/components/party-panel.ts`: tạo/gia nhập nhóm, danh sách thành viên và điểm đóng góp.
- [x] Tuân thủ Rule 25: min touch target 44px, tương phản cao, aria attributes.
- [x] Unit tests cho giao diện.

### T4.7 — Kiểm thử đối kháng an ninh (Security Exploits)
- [x] Test race condition khi 2 người cùng rút kho chung hoặc rút quá số dư.
- [x] Test officer cố kick officer khác hoặc kick leader.
- [x] Test member cố rút kho chung hoặc cố thăng chức.
- [x] Test thành viên mới gia nhập dưới 24h cố rút kho chung.
- [x] Test cố tình gia nhập 2 liên minh cùng lúc.

### T4.8 — Security Review & Đóng Phase P4
- [ ] Báo cáo đánh giá an ninh tại `docs/security-reviews/P4.md`.
- [ ] Chạy `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm secret-scan`.
- [ ] Cập nhật `tasks/BACKLOG.md` và đóng Phase P4.
