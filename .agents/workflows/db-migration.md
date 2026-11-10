---
description: Tạo migration an toàn cho Supabase (bảng, RLS, RPC, test pgTAP)
---

# /db-migration

Dùng mỗi khi cần đổi schema hoặc thêm RPC. Tuân theo `.agents/rules/30-database.md`.

## Bước
1. **Mô tả thay đổi** bằng 3–5 dòng: bảng/cột/hàm nào, ai được đọc, ai được ghi, dữ liệu có nhạy cảm không. Đối chiếu `docs/03-DATA-MODEL.md`; nếu khác thiết kế thì cập nhật tài liệu cùng PR.
2. **Tạo file:** `supabase migration new <ten_mo_ta>`. Không sửa migration cũ.
3. **Viết SQL** theo thứ tự: tạo bảng → ràng buộc (`NOT NULL`, `CHECK`, `UNIQUE`, khóa ngoại) → chỉ mục → `enable row level security` → policy → hàm → `revoke`/`grant`.
4. **Với RPC `SECURITY DEFINER`:** `set search_path = ''`, kiểm `auth.uid()`, không nhận ID chủ sở hữu từ tham số, ghi `resource_ledger` nếu đổi tài nguyên, kiểm `state_version`.
5. **Viết test pgTAP** trong `supabase/tests/`: anon bị chặn, người dùng khác bị chặn, ghi trực tiếp bị chặn, RPC thành công/thất bại/lặp idempotency/tham số độc hại.
6. **Chạy:** `supabase db reset` (phải sạch) rồi `pnpm test:db`. Báo kết quả thật.
7. **Kiểm tra hồi quy quyền:** liệt kê toàn bộ bảng trong `public` mà **chưa** bật RLS (phải rỗng) bằng truy vấn `select tablename from pg_tables where schemaname='public' and not rowsecurity;`.
8. **Cập nhật** `docs/03-DATA-MODEL.md`, kiểu TS sinh ra (nếu dùng `supabase gen types`), tick task.
9. Ghi chú rủi ro khi áp lên production (khóa bảng, dữ liệu lớn, cần backfill) vào mô tả PR.
