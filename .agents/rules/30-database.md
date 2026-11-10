# Rule 30 — Database & Supabase (Glob: `supabase/**`)

## Migration
- Mọi thay đổi schema = một file trong `supabase/migrations/` tạo bằng `supabase migration new <ten>`. Tên mô tả rõ (`add_alliances_tables`).
- **Không sửa** migration đã merge. Sai thì tạo migration mới để sửa.
- Mỗi migration: nhỏ, có thể chạy lại trên DB trống (`supabase db reset` phải chạy sạch), kèm test pgTAP tương ứng.
- Migration phá hủy (drop cột/bảng, đổi kiểu): chia 2 bước (thêm mới + chuyển dữ liệu → xóa cũ ở bản sau), và ghi rõ trong mô tả PR.
- `seed.sql` chỉ có dữ liệu dev/test, không có dữ liệu thật hay tài khoản mặc định có mật khẩu.

## RLS (mặc định từ chối)
- `alter table ... enable row level security;` ngay trong migration tạo bảng, **cùng một file**.
- Policy đặt tên theo mẫu: `<bang>_<select|insert|update|delete>_<doi_tuong>`. Ví dụ `planets_select_owner`.
- Bảng game (planets, tiles, balances, creatures, inventory, jobs...): chỉ policy `SELECT` cho chủ sở hữu. Không policy ghi cho `authenticated`/`anon`.
- Bảng chat/liên minh: `SELECT` chỉ khi là thành viên kênh/liên minh (kiểm bằng hàm `is_channel_member(channel_id)` dạng `SECURITY DEFINER` + `STABLE`).
- Thu hồi quyền mặc định: `revoke all on all tables in schema public from anon, authenticated;` rồi `grant` có chọn lọc.

## Hàm (RPC)
- Hàm thay đổi trạng thái: `SECURITY DEFINER`, `set search_path = ''`, dòng đầu `v_uid := auth.uid(); if v_uid is null then raise exception 'UNAUTHENTICATED';`.
- Không nhận `owner_id`/`user_id` từ tham số; luôn lấy từ `auth.uid()`.
- Khóa hàng cần ghi bằng `select ... for update` (hoặc kiểm `state_version`) để chống race.
- Chỉ cấp `execute` cho đúng vai trò: `revoke execute on function ... from public; grant execute ... to authenticated;` hoặc chỉ `service_role` cho hàm nội bộ.
- Hàm `commit_effects` là cửa duy nhất ghi số dư: nó cập nhật `resource_balances` **và** chèn `resource_ledger` trong cùng một giao dịch.

## Ràng buộc và chỉ mục
- `NOT NULL` mặc định. `CHECK` cho số lượng ≥ 0, enum bằng `CHECK (kind in (...))` hoặc kiểu enum.
- `resource_ledger`: trigger chặn `UPDATE`/`DELETE`; cột `idempotency_key` có `UNIQUE`.
- Chỉ mục cho mọi khóa ngoại và cột lọc thường dùng (`owner_id`, `channel_id, created_at desc`). Kiểm bằng `explain` khi bảng lớn.
- Bảng chat: phân vùng/xóa theo hạn lưu trữ (xem `docs/05-MULTIPLAYER-SOCIAL.md`) để không đầy dung lượng gói miễn phí.

## Test (pgTAP, `supabase/tests/`)
- Mỗi bảng: test rằng `anon` không đọc/ghi được; `authenticated` không đọc được dữ liệu người khác; không ghi trực tiếp được.
- Mỗi RPC: test thành công, test thiếu quyền, test tham số độc hại, test gọi lặp cùng `idempotency_key`, test chạy song song nếu có thể.
- `pnpm test:db` phải xanh trước khi merge bất kỳ PR nào đổi `supabase/`.
