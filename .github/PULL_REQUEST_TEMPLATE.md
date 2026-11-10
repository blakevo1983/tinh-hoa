## Mục đích
<!-- Task nào (ví dụ T1.3)? Giải quyết vấn đề gì? 2–3 dòng. -->

## Thay đổi chính
-

## Cách kiểm thử
- [ ] `pnpm lint` · `pnpm typecheck` · `pnpm test`
- [ ] `pnpm test:db` (nếu đổi `supabase/`)
- [ ] Đã thử thủ công: <!-- mô tả ngắn -->

## Bảo mật & chống gian lận
- [ ] Không tin dữ liệu từ client (thời gian, ngẫu nhiên, số lượng, owner)
- [ ] Bảng mới đã bật RLS, không có policy ghi cho `authenticated`
- [ ] Có `idempotency_key`, rate limit, kiểm `expected_version` cho lệnh mới
- [ ] Có test ca độc hại (replay, song song, biên, sai chủ sở hữu)
- [ ] Không secret, không PII trong log
- [ ] Đã chạy `/security-review` (nếu đụng server)

## Cân bằng / UX
- [ ] Đã chạy `/balance-check` (nếu đổi công thức/config)
- [ ] Chuỗi giao diện qua i18n (vi + en)

## Rủi ro & kế hoạch lùi
<!-- Migration phá hủy? Cần backfill? Tắt bằng feature flag nào? -->

## Tài liệu
- [ ] Đã cập nhật `tasks/`, `docs/`, ADR (nếu có quyết định kiến trúc)
