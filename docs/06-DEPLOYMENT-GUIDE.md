# Hướng Dẫn Triển Khai Sản Xuất (Production Deployment Guide)

**Dự án:** Tinh Hoa (Web Game Tiến Hóa Hành Tinh)  
**Mục tiêu chi phí:** Ngân sách hạ tầng **0đ** (Cloudflare Pages + Supabase Free Tier)

---

## 1. Tổng Quan Kiến Trúc Triển Khai

| Thành phần | Nền tảng | Chi phí | Chức năng |
|---|---|---|---|
| **Frontend** | Cloudflare Pages | 0đ (Unlimited bandwidth) | Phục vụ Single Page Application tĩnh (`apps/web/dist`) |
| **Database & Auth** | Supabase (PostgreSQL) | 0đ (Gói Free Tier) | Quản lý định danh, 100% RLS, RPC nguyên tử, Realtime Broadcast |
| **API Backend** | Supabase Edge Functions | 0đ (500k invocations/mo) | Cổng lệnh `command` & `chat-send` |

---

## 2. Bước 1: Triển Khai Cơ Sở Dữ Liệu & API (Supabase)

### Cách 1: Tự động qua Supabase CLI (Khuyến nghị)
1. Đăng nhập CLI trên máy trạm:
   ```bash
   pnpm exec supabase login
   ```
2. Liên kết với project của bạn (lấy Project Reference ID từ Supabase Dashboard):
   ```bash
   pnpm exec supabase link --project-ref <your-project-ref>
   ```
3. Đẩy toàn bộ 23 migrations lên database:
   ```bash
   pnpm exec supabase db push
   ```
4. Triển khai các Edge Functions:
   ```bash
   pnpm exec supabase functions deploy command
   pnpm exec supabase functions deploy chat-send
   ```

### Cách 2: Triển khai nhanh qua SQL Editor trên Dashboard
Nếu chưa cài đặt CLI hoặc muốn triển khai tức thì:
1. Mở Supabase Dashboard $\to$ Chọn project của bạn $\to$ Vào mục **SQL Editor**.
2. Mở file tổng hợp đã được biên soạn sẵn: [`supabase/deploy_schema.sql`](file:///d:/tinh-hoa/supabase/deploy_schema.sql).
3. Sao chép toàn bộ nội dung và bấm **Run** để khởi tạo 100% các bảng, RLS policies, views, triggers và các RPC function.

---

## 3. Bước 2: Cấu Hình Biến Môi Trường (Environment Variables)

Tạo file `.env.local` ở thư mục gốc (hoặc nhập vào mục Environment Variables của Cloudflare Pages):
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...<your-anon-key>
VITE_TURNSTILE_SITE_KEY=<optional-turnstile-key>
```

---

## 4. Bước 3: Triển Khai Frontend (Cloudflare Pages)

### Cách 1: Tự động qua Git Integration (Khuyến nghị)
1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com/) $\to$ **Compute (Workers & Pages)** $\to$ **Create application** $\to$ **Pages** $\to$ **Connect to Git**.
2. Chọn repository GitHub của dự án `tinh-hoa`.
3. Điền cấu hình bản dựng:
   - **Framework preset:** `None` (hoặc `Vite`)
   - **Build command:** `pnpm --filter @tinh-hoa/shared build && pnpm --filter @tinh-hoa/web build`
   - **Build output directory:** `apps/web/dist`
   - **Root directory:** để trống (hoặc `/`)
4. Khai báo Environment Variables ở mục Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Bấm **Save and Deploy**. Cloudflare sẽ tự động cấp phát domain HTTPS miễn phí: `https://<ten-du-an>.pages.dev`.

### Cách 2: Triển khai trực tiếp bằng CLI (Wrangler)
Build sẵn bundle và đẩy trực tiếp lên Cloudflare:
```bash
# 1. Build production bundle
pnpm build

# 2. Deploy thư mục dist lên Cloudflare Pages
pnpm dlx wrangler pages deploy apps/web/dist --project-name tinh-hoa
```

---

## 5. Bước 4: Kiểm Tra Sau Triển Khai (Post-Deployment Checklist)

- [ ] Mở URL `https://<ten-du-an>.pages.dev` trên trình duyệt.
- [ ] Widget **Status Indicator** hiển thị chấm xanh `Hoạt Động Bình Thường`, Ping $< 150$ms.
- [ ] Đăng ký/Đăng nhập tài khoản người chơi đầu tiên.
- [ ] Tạo hành tinh mới, kiểm tra canvas hiển thị đúng quả cầu và lưới 12x12.
- [ ] Gửi thử 1 tin nhắn vào kênh Liên Tinh (Global chat).
