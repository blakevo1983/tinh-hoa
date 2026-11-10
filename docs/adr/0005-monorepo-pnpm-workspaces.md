# ADR-0005: Sử dụng kiến trúc Monorepo với pnpm Workspaces

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-10
- **Người quyết định:** Đội ngũ Tinh Hoa

## Bối cảnh
Dự án bao gồm nhiều thành phần:
- Client Web SPA (`apps/web`)
- Thư viện logic lõi, công thức, types, Zod schemas (`packages/shared`)
- Serverless Edge Functions (`supabase/functions`)
- Database migrations, seeds và pgTAP test (`supabase/migrations`, `supabase/tests`)

Dự án cần chia sẻ type-safe schema và logic thuần giữa Client và Server (Edge Function), đồng thời đảm bảo thời gian cài đặt nhanh, tiết kiệm dung lượng ổ đĩa và kiểm soát chặt chẽ các phụ thuộc.

## Quyết định
Chọn kiến trúc **Monorepo** quản lý bằng **pnpm Workspaces**:
- `apps/web`: Ứng dụng web Vite + TypeScript.
- `packages/shared`: Module logic thuần, ma trận nguyên tố, Zod schemas, PRNG, Clock.
- `supabase/`: Migrations, pgTAP tests, và Edge Functions.

## Phương án đã cân nhắc
1. **pnpm Workspaces (Được chọn):**
   - *Ưu:* Quản lý dependency bằng content-addressable storage (rất nhanh và tiết kiệm dung lượng), hỗ trợ workspace linking tự nhiên (`workspace:*`), kiểm soát supply-chain an toàn qua lockfile nghiêm ngặt.
   - *Nhược:* Cần cấu hình cho pnpm v12 với `allowBuilds` và TypeScript composite project references.
2. **Nhiều repository riêng biệt (Polyrepo):**
   - *Ưu:* Mỗi repository nhỏ gọn và cô lập.
   - *Nhược:* Khi thay đổi Zod schema hoặc type game, phải build và publish package lên npm registry rồi pull về ở repo khác; làm chậm tốc độ phát triển và dễ dẫn đến lệch phiên bản giữa client và server.
3. **Turborepo / Nx kết hợp npm/yarn:**
   - *Ưu:* Hỗ trợ caching build nâng cao.
   - *Nhược:* Thêm độ phức tạp về công cụ và file cấu hình không cần thiết trong giai đoạn đầu dự án.

## Hệ quả
- Mọi thay đổi schema hoặc logic nghiệp vụ ở `packages/shared` lập tức được phản ánh và kiểm tra typecheck đồng thời trên cả client và server tests.
- Một lệnh duy nhất `pnpm typecheck`, `pnpm test`, `pnpm lint` có thể kiểm tra toàn diện chất lượng của toàn bộ hệ thống.
- Cần chú ý cấu hình TypeScript project references (`composite: true`) và Vite aliases để tương thích đường dẫn phát triển local.

## Cách kiểm chứng
- Lệnh `pnpm -r exec tsc --noEmit` và `pnpm build` thực thi hoàn hảo toàn bộ workspace.
- Các bài test trong `apps/web` và `supabase/functions` đều import trực tiếp và kiểm tra tính nhất quán từ `@tinh-hoa/shared`.
