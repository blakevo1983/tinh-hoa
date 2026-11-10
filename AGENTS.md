# AGENTS.md — Tinh Hoa (tên tạm)

Web game tiến hóa hành tinh: nguyên tố, sinh vật lai tạo, nguyên liệu, thăm dò, liên minh, chat. Nhiều người chơi, **server-authoritative**, ngân sách hạ tầng 0đ.

File này được Antigravity đọc tự động. Luật chi tiết nằm trong `.agents/rules/`, quy trình lặp lại nằm trong `.agents/workflows/` (gọi bằng `/ten-workflow`).

## 1. Cách làm việc (bắt buộc)

1. **Đọc trước khi code.** Luôn đọc phần liên quan của `docs/00-GDD.md` và `docs/02-ARCHITECTURE.md`. Nếu đụng tới server, DB, chat, liên minh, tiền tệ trong game: đọc thêm `docs/04-SECURITY.md`.
2. **Mỗi lần một task.** Lấy task từ `tasks/`. Không làm lan sang task khác. Task mơ hồ thì hỏi lại, không đoán.
3. **Quy trình mỗi task:** Plan ngắn → viết test trước hoặc cùng lúc → code → chạy `pnpm lint && pnpm typecheck && pnpm test` → tự review theo `/security-review` nếu đụng server → cập nhật tick checkbox trong `tasks/` và docs nếu hành vi đổi.
4. **Giải thích bằng tiếng Việt**, code và tên biến bằng tiếng Anh, comment giải thích *vì sao* (không giải thích *cái gì*).
5. **Không tự thêm thư viện** ngoài danh sách trong `docs/02-ARCHITECTURE.md` mà chưa hỏi. Khi cần thêm, nêu lý do, dung lượng, giấy phép, và phương án không cần thư viện.
6. **Không nói "xong" khi chưa chạy.** Báo kết quả lệnh thật (pass/fail). Nếu không chạy được, nói rõ.

## 2. Luật bất biến (vi phạm = dừng lại và báo)

- Client **không bao giờ** là nguồn sự thật. Mọi thay đổi trạng thái game đi qua Edge Function `command` → RPC trong DB. Client chỉ gửi *ý định* (intent), không gửi *kết quả*.
- Không bao giờ tin thời gian, số ngẫu nhiên, giá, số lượng, ID chủ sở hữu từ client.
- Mọi bảng bật RLS, mặc định từ chối. Client không có quyền INSERT/UPDATE/DELETE trực tiếp lên bảng game.
- Không commit secret. `service_role` key chỉ nằm ở Edge Function / CI secret.
- Mọi input qua zod (schema nằm ở `packages/shared`), từ chối thay vì "sửa cho hợp lệ".
- Mọi hành động thay đổi tài nguyên phải ghi `resource_ledger` (append-only) và có `idempotency_key`.
- Logic game là **hàm thuần** trong `packages/shared` (không `Date.now()`, không `Math.random()`; nhận `clock` và `rng` qua tham số).

## 3. Cấu trúc repo

```
apps/web/            Vite + TypeScript + Canvas 2D (client, chỉ hiển thị và gửi intent)
packages/shared/     Kiểu dữ liệu, zod schema, config cân bằng, công thức, lai tạo (hàm thuần)
supabase/
  migrations/        SQL, chỉ thêm mới, không sửa migration đã áp dụng
  functions/         Edge Functions (Deno): command, chat-send, ...
  tests/             pgTAP: RLS và ràng buộc
docs/                GDD, kiến trúc, data model, bảo mật, multiplayer, quy trình
tasks/               Danh sách việc theo giai đoạn (nguồn sự thật tiến độ)
.agents/             Rules + workflows cho Antigravity
```

## 4. Lệnh chuẩn (tạo ở task T0.1, không tự đổi tên)

| Lệnh | Việc |
|---|---|
| `pnpm dev` | Chạy client (Vite) |
| `pnpm lint` | ESLint + Prettier check |
| `pnpm typecheck` | `tsc --noEmit` toàn workspace |
| `pnpm test` | Vitest (unit + property) |
| `pnpm test:db` | pgTAP qua Supabase local |
| `pnpm sim:balance` | Mô phỏng cân bằng (từ giai đoạn P2) |
| `pnpm build` | Build production |

## 5. Definition of Done (một task chỉ xong khi đủ hết)

- [ ] Đạt đúng *acceptance criteria* của task.
- [ ] Có test; test lỗi/độc hại (exploit) cho mọi thứ chạm tới tài nguyên hoặc quyền.
- [ ] `lint`, `typecheck`, `test` xanh. Nếu đổi DB: `test:db` xanh.
- [ ] Không có secret, `console.log` thừa, `any`, `// @ts-ignore`, `TODO` không có task đi kèm.
- [ ] Docs/tasks cập nhật. Nếu có quyết định kiến trúc mới: thêm ADR trong `docs/adr/`.
- [ ] Mô tả PR theo `.github/PULL_REQUEST_TEMPLATE.md`.

## 6. Không được làm

- Không sửa file trong `supabase/migrations/` đã được merge. Tạo migration mới.
- Không tắt RLS, không dùng `service_role` ở client, không `SECURITY DEFINER` mà thiếu `set search_path = ''` và kiểm tra `auth.uid()`.
- Không "tạm thời" bỏ qua validate hoặc rate limit để cho chạy được.
- Không obfuscate code client rồi coi là bảo mật. Bảo mật nằm ở server.
- Không đưa dữ liệu cá nhân (email, IP thô) vào log hoặc chat.
