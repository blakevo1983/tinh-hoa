# Rule 00 — Bối cảnh dự án (Always On)

## Stack đã chốt (đổi phải có ADR)

| Lớp | Công nghệ | Lý do |
|---|---|---|
| Client | Vite + TypeScript (strict) + Canvas 2D | Nhẹ, không cần engine, hợp đồ họa đơn giản |
| Logic chung | `packages/shared` (TS thuần) | Client dự đoán, server quyết định, cùng một công thức |
| Backend | Supabase: Postgres + Auth + Realtime + Edge Functions (Deno) | Gói miễn phí, có RLS, có realtime |
| Hosting client | Cloudflare Pages | Miễn phí, CDN, header bảo mật |
| Chống bot | Cloudflare Turnstile | Miễn phí |
| Lỗi/giám sát | Sentry (gói free) hoặc log Supabase | Phát hiện sự cố sớm |
| CI | GitHub Actions | Lint, test, build, quét secret |
| Test | Vitest, fast-check (property), pgTAP, Playwright (e2e) | Xem `docs/06-DEV-PROCESS.md` |

## Nguyên tắc thiết kế cốt lõi

1. **Server-authoritative + idle theo mốc thời gian.** Không có vòng lặp tick trên server. Tài nguyên tính "lười": `số_dư = số_dư_lưu + tốc_độ × (now_server − updated_at)`, có trần offline. Client chỉ *hiển thị ước lượng*.
2. **Một bộ gen chung** cho sinh vật và nguyên liệu (`Genome`: nguyên tố chính/phụ, 5 chỉ số, tối đa 3 đặc tính, thế hệ). Một hàm lai tạo dùng cho cả hai.
3. **Cân bằng nằm trong config** (`packages/shared/src/config/*.ts`), không hard-code số trong logic.
4. **Mọi thứ ngẫu nhiên có seed** và kết quả được lưu ngay lần đầu (chống reload để reroll).
5. **Tách `ChatTransport`** thành interface để đổi nhà cung cấp realtime khi vượt giới hạn gói miễn phí.

## Quy ước

- Tên: file `kebab-case.ts`, kiểu/class `PascalCase`, biến/hàm `camelCase`, DB `snake_case`, hằng `SCREAMING_SNAKE`.
- Khóa nguyên tố: `metal, wood, water, fire, earth, light, dark, thunder` (UI hiển thị tiếng Việt: Kim, Mộc, Thủy, Hỏa, Thổ, Quang, Ám, Lôi).
- Khóa chỉ số: `qi` (Nguyên khí), `guard` (Hộ thể), `agility` (Linh động), `harmony` (Hòa hợp), `chaos` (Bất ổn).
- Chuỗi giao diện: dùng khóa i18n, file `apps/web/src/i18n/vi.json` (mặc định) và `en.json`. Không hard-code chữ trong component.
- Thời gian: lưu UTC (`timestamptz`), tính bằng giây ở logic.
- Phiên bản schema dữ liệu có `schema_version` để migrate về sau.

## Nguồn sự thật tài liệu

Hành vi game: `docs/00-GDD.md`. Kiến trúc: `docs/02-ARCHITECTURE.md`. Bảng DB: `docs/03-DATA-MODEL.md`. Bảo mật: `docs/04-SECURITY.md`. Tiến độ: `tasks/`. Khi code và docs mâu thuẫn, **dừng lại hỏi** thay vì tự chọn.
