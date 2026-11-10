# Hướng dẫn thiết lập môi trường (Setup Guide)

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường Supabase local và cấu hình liên kết 2 project Supabase (Staging & Production) cho dự án **Tinh Hoa**.

---

## 1. Yêu cầu công cụ (Prerequisites)

- **Node.js**: v22+ (Hệ thống hiện tại: v24.21.0)
- **pnpm**: v12+ (Đã cài đặt)
- **Git**: Đã khởi tạo repository
- **Supabase CLI**: Đã cài đặt cục bộ qua project devDependency (`pnpm supabase`)
- **Docker Desktop** (hoặc **Podman**): Bắt buộc để chạy Supabase local container (PostgreSQL, Auth, Storage, Studio)
  - Cài đặt trên Windows qua winget: `winget install Docker.DockerDesktop`
  - Hoặc tải trực tiếp từ [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
  - Sau khi cài đặt, khởi động Docker Desktop và đảm bảo trạng thái "Engine running".

---

## 2. Khởi chạy Supabase Local

Khi Docker Desktop đang chạy, thực hiện các lệnh sau tại thư mục gốc của dự án:

```bash
# Khởi động toàn bộ stack Supabase local
pnpm supabase start

# Kiểm tra trạng thái và lấy thông tin kết nối
pnpm supabase status

# Đặt lại cơ sở dữ liệu local (áp dụng toàn bộ migrations và seeds)
pnpm supabase db reset

# Dừng Supabase local khi không sử dụng
pnpm supabase stop
```

### Các cổng dịch vụ mặc định khi chạy Local:
- **API Gateway (Kong):** `http://localhost:54321` (Dùng cho `VITE_SUPABASE_URL`)
- **Supabase Studio (Giao diện quản trị Web):** `http://localhost:54323`
- **PostgreSQL Database:** `postgresql://postgres:postgres@localhost:54322/postgres`
- **Inbucket (Hộp thư kiểm tra email xác thực local):** `http://localhost:54324`

---

## 3. Cấu hình biến môi trường Client (`.env`)

Tạo file `.env` tại thư mục gốc (hoặc trong `apps/web/.env`) dựa trên `.env.example`:

```bash
cp .env.example .env
```

### Thông số cho môi trường Local:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (lấy từ output lệnh pnpm supabase status)
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA (Turnstile test dummy key)
```

> [!CAUTION]
> **Quy tắc bảo mật bất biến:**
> - Tuyệt đối **KHÔNG BAO GIỜ** commit file `.env` chứa khóa thật lên Git.
> - Client chỉ sử dụng `VITE_SUPABASE_ANON_KEY`.
> - **KHÔNG ĐƯỢC** đưa `service_role` key vào code client hay `.env` của client. Khóa `service_role` chỉ cấu hình trong Supabase Dashboard / Edge Function secrets / GitHub Actions secrets.

---

## 4. Hướng dẫn tạo và liên kết 2 Project trên Supabase Cloud

Theo kiến trúc dự án (`docs/02-ARCHITECTURE.md`), chúng ta duy trì 2 project độc lập:
1. `tinh-hoa-staging`: Dùng cho nhánh phát triển, preview deployment trên Cloudflare Pages.
2. `tinh-hoa-production`: Dùng cho sản phẩm chính thức với người chơi thật.

### Bước 4.1: Tạo Project trên Supabase Dashboard
1. Truy cập [database.new](https://database.new) và đăng nhập bằng tài khoản Supabase (bật xác thực 2FA).
2. Tạo organization mới (ví dụ: `tinh-hoa-org`).
3. Tạo project thứ nhất:
   - **Name:** `tinh-hoa-staging`
   - **Database Password:** Đặt mật khẩu mạnh (lưu vào trình quản lý mật khẩu).
   - **Region:** Chọn khu vực gần người chơi (ví dụ: `Singapore - ap-southeast-1`).
   - **Pricing Plan:** Free plan.
4. Lặp lại bước trên để tạo project thứ hai: `tinh-hoa-production`.

### Bước 4.2: Cấu hình Authentication trên Dashboard
Thực hiện trên cả 2 project:
- Vào **Authentication → Providers → Email**:
  - Bật **Enable Email provider**.
  - Bật **Confirm email** (Bắt buộc xác thực email người dùng).
- Vào **Authentication → URL Configuration**:
  - **Site URL**:
    - Staging: URL preview Cloudflare Pages (hoặc `http://localhost:3000` khi thử nghiệm).
    - Production: Domain chính thức của game.

### Bước 4.3: Liên kết Supabase CLI với Project từ máy dev
Để deploy migrations hoặc Edge Functions lên cloud:

```bash
# Đăng nhập Supabase CLI qua trình duyệt
pnpm supabase login

# Liên kết với project Staging
pnpm supabase link --project-ref <staging-project-ref>

# Đẩy schema migration lên Staging
pnpm supabase db push
```

---

## 5. Cấu hình CI/CD Secret trên GitHub Actions

Để GitHub Actions tự động kiểm tra pgTAP test và quét bảo mật:
- Vào **Repository Settings → Secrets and variables → Actions**.
- Cấu hình các secrets cần thiết (khi triển khai tự động ở Task T0.8 / T0.10).
