---
description: Phát hành phiên bản (staging → production) với checklist an toàn và kế hoạch lùi
---

# /release

Dùng khi sẵn sàng đưa `main` lên production. Chỉ chạy khi CI xanh.

## Bước
1. **Kiểm tra điều kiện:** CI xanh trên `main`; không có PR bảo mật mở; `tasks/` của phase hiện tại đã tick đủ.
2. **Chốt phiên bản** theo SemVer (`0.x.y` trong giai đoạn trước khi mở công khai). Cập nhật `CHANGELOG.md` (Added/Changed/Fixed/Security) bằng tiếng Việt cho người đọc, không phải log commit.
3. **Staging:** áp migration lên project Supabase *staging* bằng `supabase db push`, deploy Edge Functions và client lên Cloudflare Pages preview. Không dùng dữ liệu thật.
4. **Smoke test trên staging** (Playwright hoặc thủ công): đăng ký → tạo hành tinh → thu thập → xây → lai tạo → chat → liên minh. Ghi kết quả.
5. **Checklist bảo mật phát hành** (`docs/04-SECURITY.md`, mục 9): RLS đủ, không secret trong bundle, rate limit bật, CSP bật, Turnstile bật, log không lộ PII.
6. **Sao lưu trước khi áp lên production:** xuất dump DB (`supabase db dump`), lưu ngoài repo. Ghi lại phiên bản hiện tại để lùi.
7. **Production:** áp migration → deploy functions → deploy client. Bật tính năng mới bằng *feature flag* ở trạng thái tắt, rồi bật dần (ví dụ 5% → 50% → 100%).
8. **Theo dõi 30 phút đầu:** lỗi Sentry, tỉ lệ lỗi Edge Function, số `cheat_flags` mới, dung lượng DB, số kết nối realtime.
9. **Kế hoạch lùi:** tắt feature flag; nếu cần, redeploy bản trước của client/functions; migration phá hủy không lùi bằng cách xóa mà bằng migration sửa tiếp. Ghi vào mô tả release.
10. Gắn tag `vX.Y.Z`, đóng milestone, tổng kết cho người dùng (3–5 dòng).
