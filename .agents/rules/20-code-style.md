# Rule 20 — Phong cách code TypeScript (Glob: `**/*.ts`, `**/*.tsx`)

## Ngôn ngữ và kiểu
- `strict: true`, `noUncheckedIndexedAccess: true`. Cấm `any`, `as unknown as`, `@ts-ignore` (dùng `@ts-expect-error` kèm lý do nếu bắt buộc).
- Dữ liệu từ ngoài (request, DB jsonb, localStorage, realtime) là `unknown` cho tới khi qua zod `parse`.
- Kiểu suy ra từ zod: `type X = z.infer<typeof XSchema>`. Một nguồn cho cả kiểu và validate.
- Dùng *branded type* cho ID (`PlanetId`, `CreatureId`) để không nhầm.
- Union có `kind` (discriminated union) cho lệnh, sự kiện, hiệu ứng (effect). `switch` phải kiểm tra đầy đủ (`assertNever`).

## Hàm thuần trong `packages/shared`
- Không `Date.now()`, `new Date()`, `Math.random()`, `fetch`, truy cập DOM, đọc env. Nhận `clock: Clock` và `rng: Rng` qua tham số.
- Không biến đổi (mutate) tham số. Trả về giá trị mới hoặc danh sách `Effect`.
- Số học tài nguyên: dùng số nguyên (đơn vị nhỏ nhất) hoặc `bigint` khi có thể; nếu dùng số thực, làm tròn ở một chỗ duy nhất và có test.
- Mỗi hàm công khai có test, và hàm có tính ngẫu nhiên/công thức có **property test** (fast-check): ví dụ chỉ số con luôn trong [min, max], tổng xác suất = 1, không bao giờ ra giá trị âm hoặc NaN.

## Xử lý lỗi
- Lỗi nghiệp vụ trả về `Result<T, GameError>` với mã lỗi cố định (`INSUFFICIENT_RESOURCES`, `COOLDOWN`, `VERSION_CONFLICT`...). Chỉ `throw` cho lỗi lập trình.
- Edge Function chuyển `GameError` thành JSON `{ error: { code, message_key } }`; không lộ stack trace hay thông tin nội bộ.

## Client
- Client không tính kết quả cuối. Có thể *dự đoán* (optimistic) rồi **thay bằng kết quả server** khi trả về; sai lệch thì lấy server.
- Render Canvas tách khỏi logic: `render(state)` không sửa state. Vòng `requestAnimationFrame` chỉ vẽ.
- Không `innerHTML` với dữ liệu người dùng. Dùng `textContent` hoặc framework escape.
- Mọi chuỗi hiển thị qua i18n. Hỗ trợ người mù màu: nguyên tố luôn có **biểu tượng hình dạng** kèm màu.

## Tổ chức và đặt tên
- Hàm ≤ 40 dòng; file ≤ 300 dòng; tách khi vượt. Một file một trách nhiệm.
- Import theo thứ tự: thư viện ngoài → `@tinh-hoa/shared` → nội bộ. Không import vòng.
- `apps/web` không import từ `supabase/functions` và ngược lại; chỉ chia sẻ qua `packages/shared`.
- Comment giải thích *vì sao* và các giả định cân bằng. Công thức game có link tới mục GDD tương ứng.

## Test
- Tên: `describe('breed')` / `it('does X when Y')`. Mỗi bug sửa xong có test hồi quy.
- Test không phụ thuộc thời gian thật hoặc ngẫu nhiên thật: dùng `fakeClock`, `seededRng`.
- Mục tiêu độ phủ: `packages/shared` ≥ 90%; Edge Function: mọi nhánh lỗi quan trọng.
