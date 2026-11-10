# P0 — Nền móng

**Mục tiêu:** repo sạch, CI, auth, cổng lệnh an toàn, RLS baseline. Không có tính năng game ở phase này.
**Đọc trước:** `AGENTS.md`, `docs/02-ARCHITECTURE.md`, `docs/04-SECURITY.md`, `docs/06-DEV-PROCESS.md`.
**Exit criteria:** xem `docs/01-ROADMAP.md` (P0).

Quy ước: `[ ]` chưa làm · `[x]` xong. Một task = một PR.

---

### T0.1 — Khởi tạo monorepo
- [x] pnpm workspaces: `apps/web`, `packages/shared`, `supabase/`.
- [x] TypeScript strict (`noUncheckedIndexedAccess`), ESLint, Prettier, Vitest.
- [x] Script gốc: `dev`, `lint`, `typecheck`, `test`, `build` đúng như `AGENTS.md` mục 4.
- [x] `.gitignore` chặn `.env*`, `dist`, `node_modules`, dump DB; `.env.example` chỉ có tên biến.

**Acceptance:** `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` chạy sạch trên máy mới.

### T0.2 — `packages/shared` khung
- [x] Interface `Clock` (`now(): number`) + `systemClock` + `fakeClock` cho test.
- [x] Interface `Rng` + cài đặt xác định theo seed (ví dụ mulberry32/xoshiro) + `seededRng(seed)`; **không** dùng `Math.random`.
- [x] `Result<T,E>`, `GameError` với mã lỗi cố định (`INSUFFICIENT_RESOURCES`, `COOLDOWN`, `VERSION_CONFLICT`, `NOT_OWNER`, `RATE_LIMITED`, `INVALID_INPUT`).
- [x] Config: `elements.ts` (8 nguyên tố, chỉ số, quan hệ sinh/khắc theo GDD mục 3), `limits.ts` (rate limit khởi điểm).
- [x] Kiểu + zod schema cho `ElementKey`, `StatKey`, `Genome`, `Command` (khung union).

**Acceptance:** test chứng minh RNG xác định theo seed; ma trận khắc/sinh khớp GDD; kiểu `Genome` từ chối chỉ số ngoài biên.

### T0.3 — Client khung
- [x] Vite + TS; màn hình trống vẽ một hành tinh tròn bằng Canvas.
- [x] i18n `vi.json` (mặc định) và `en.json`; mọi chuỗi qua khóa.
- [x] Biểu tượng hình dạng cho 8 nguyên tố (đủ để phân biệt không cần màu).
- [x] Không `innerHTML` với dữ liệu động.

**Acceptance:** `pnpm dev` hiển thị hành tinh; chuyển ngôn ngữ vi/en hoạt động.

### T0.4 — Supabase local và liên kết project
- [x] `supabase init`, chạy `supabase start` (Docker) thành công.
- [x] Hướng dẫn tạo 2 project (staging, production) trong `docs/setup.md`; **không** commit key.
- [x] `.env.example` có `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`.

**Acceptance:** `supabase start` + `supabase db reset` chạy sạch; client kết nối được local.

### T0.5 — Xác thực
- [x] Đăng ký/đăng nhập email (xác minh email bật), đăng xuất.
- [x] Cloudflare Turnstile ở form đăng ký/đăng nhập.
- [x] Trigger tạo `profiles` khi có user mới; `display_name` do người dùng chọn, validate.
- [x] Không lưu thông tin nhạy cảm ở `localStorage` ngoài phiên do SDK quản lý.

**Acceptance:** đăng ký → xác minh → đăng nhập → thấy hồ sơ; Turnstile thiếu/sai bị từ chối.

### T0.6 — Baseline DB và RLS (`/db-migration`)
- [x] Migration: `profiles`, `audit_log`, `rate_limits`, `feature_flags` (theo `docs/03-DATA-MODEL.md`).
- [x] RLS bật, **revoke all** từ `anon/authenticated` rồi grant chọn lọc.
- [x] pgTAP: (a) test **tự động liệt kê mọi bảng `public` thiếu RLS và yêu cầu rỗng**; (b) anon không đọc/ghi; (c) người dùng không đọc `profiles` người khác ngoài view công khai; (d) không ghi trực tiếp được `audit_log`.

**Acceptance:** `pnpm test:db` xanh; thêm bảng mới không RLS làm test đỏ.

### T0.7 — Cổng lệnh `command` (Edge Function)
- [x] Pipeline cố định: JWT → giới hạn kích thước body → zod → rate limit → kiểm quyền → logic → trả lời chuẩn.
- [x] Định dạng lỗi chuẩn `{ error: { code, message_key } }`, không lộ stack.
- [x] `request_id` sinh ở function, ghi log, trả về header.
- [x] Rate limit token-bucket bằng bảng `rate_limits` (hàm RPC nguyên tử).
- [x] Lệnh mẫu `system.ping` để kiểm pipeline.
- [x] Idempotency: khung lưu/kiểm `idempotency_key` (dùng thật ở P1).

**Acceptance:** test tích hợp: thiếu JWT → 401; sai schema → 400; vượt rate → 429; body quá cỡ → 413; `ping` OK.

### T0.8 — CI và kiểm tra tự động
- [x] Dùng `.github/workflows/ci.yml` (đã có sẵn): lint, typecheck, test, build, gitleaks, kiểm bundle không có `service_role`, job DB.
- [x] Job `database` chạy `supabase test db`, trong đó có pgTAP kiểm mọi bảng `public` đều bật RLS (T0.6).
- [x] Branch protection cho `main` (bắt buộc PR + CI xanh).

**Acceptance:** PR thử đỏ khi cố tình commit một secret giả/bảng thiếu RLS.

### T0.9 — Pre-commit và quét secret
- [x] Lefthook/Husky: `lint`, `typecheck` nhanh, `gitleaks protect --staged`.

**Acceptance:** commit có secret giả bị chặn.

### T0.10 — Triển khai staging và header bảo mật
- [x] Cloudflare Pages: preview cho PR, staging từ `main`.
- [x] `_headers`: CSP chặt, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`.
- [x] Biến môi trường đặt trên Cloudflare, không trong repo.

**Acceptance:** truy cập URL staging; công cụ kiểm header xác nhận CSP; không lỗi CSP ở console.

### T0.11 — Tài liệu vận hành
- [x] `docs/setup.md`: cài đặt từng bước (tài khoản, CLI, biến môi trường, chạy local).
- [x] `docs/adr/0000-template.md` (đã có) + ADR-001…005 (xem `02-ARCHITECTURE.md` mục 11).
- [x] Bật 2FA cho GitHub, Supabase, Cloudflare (tự làm, tick tại đây).

**Acceptance:** người mới (hoặc phiên agent mới) dựng được môi trường chỉ từ `docs/setup.md`.

### T0.12 — `/security-review` cho P0
- [x] Chạy workflow `/security-review` trên toàn P0 trong một phiên mới; xử lý hết mức Cao/Vừa.

**Acceptance:** báo cáo lưu ở `docs/security-reviews/P0.md`, không còn phát hiện Cao/Vừa mở.
