# Chính Sách Bảo Mật & Quyền Riêng Tư (Privacy Policy)

**Dự án:** Tinh Hoa (Web Game Tiến Hóa Hành Tinh)  
**Ngày hiệu lực:** 10/11/2026  
**Phiên bản:** 1.0.0  

Chính sách này mô tả cách Tinh Hoa ("chúng tôi", "trò chơi") thu thập, lưu trữ, sử dụng và bảo vệ thông tin của người chơi ("bạn"), tuân thủ quy định pháp luật Việt Nam (Nghị định 147/2024/NĐ-CP về quản lý, cung cấp, sử dụng dịch vụ Internet và thông tin trên mạng) và các nguyên tắc bảo vệ quyền riêng tư quốc tế (GDPR).

---

## 1. Nguyên Tắc Cốt Lõi: Tối Thiểu Hóa Dữ Liệu (Data Minimization)

Tinh Hoa vận hành theo nguyên tắc **ngân sách hạ tầng 0đ** và **tôn trọng quyền riêng tư tối đa**:
- **Không thu thập dữ liệu nhạy cảm:** Chúng tôi không yêu cầu và không bao giờ lưu trữ số thẻ tín dụng, căn cước công dân, địa chỉ nhà ở hay danh bạ của bạn.
- **Không bán dữ liệu:** Dữ liệu người chơi không bao giờ bị bán, chuyển giao thương mại hoặc dùng cho mục đích quảng cáo bên ngoài.
- **Không theo dõi hành vi ngoài phạm vi trò chơi:** Không sử dụng cookie theo dõi của bên thứ ba (third-party tracking cookies) hay mã theo dõi quảng cáo lén lút.

---

## 2. Dữ Liệu Chúng Tôi Thu Thập

Khi bạn đăng ký và chơi Tinh Hoa, các dữ liệu tối thiểu sau được ghi nhận:
1. **Thông tin xác thực (Auth):**
   - Địa chỉ Email (thông qua Supabase Auth để đăng nhập bằng magic link hoặc OAuth).
   - Mã định danh người dùng ẩn danh ngẫu nhiên (`UUID` tạo bởi hệ thống).
2. **Dữ liệu trong game (Game State):**
   - Tên hành tinh, tên hiển thị người chơi, danh hiệu.
   - Trạng thái hành tinh: số lượng nguyên tố, tài nguyên tích lũy, các sinh vật lai tạo.
   - Lịch sử tương tác: sổ cái tài nguyên (`resource_ledger`), lịch sử thám hiểm, trạng thái liên minh, dữ liệu đối kháng.
3. **Dữ liệu giao tiếp công khai:**
   - Nội dung tin nhắn chat gửi vào các kênh công khai (Kênh Thế Giới, Kênh Liên Minh, Kênh Đội Nhóm).
   - Báo cáo vi phạm nội dung (`chat_reports`) do người chơi gửi để hỗ trợ kiểm duyệt.

---

## 3. Mục Đích Sử Dụng Dữ Liệu

Dữ liệu được dùng duy nhất cho các mục đích kỹ thuật và vận hành:
- Duy trì tính nhất quán và công bằng của thế giới game (server-authoritative validation).
- Lưu giữ tiến trình chơi để bạn có thể tiếp tục trò chơi từ bất kỳ thiết bị nào.
- Ngăn chặn gian lận, tấn công phá hoại hạ tầng (anti-exploit, rate limiting).
- Xử lý các báo cáo vi phạm cộng đồng và bảo vệ môi trường chơi lành mạnh theo Nghị định 147/2024/NĐ-CP.

---

## 4. Bảo Vệ Dữ Liệu & Lưu Trữ An Toàn

- **Kiểm soát truy cập cấp hàng (Row Level Security - RLS):** Cơ sở dữ liệu Postgres kích hoạt RLS 100% trên tất cả các bảng. Người chơi khác không có quyền đọc thông tin tài nguyên nội bộ hoặc can thiệp dữ liệu hành tinh của bạn.
- **Mã hóa:** Toàn bộ lưu lượng truy cập giữa trình duyệt và máy chủ được mã hóa qua chuẩn TLS 1.3/HTTPS.
- **Lưu trữ:** Dữ liệu được lưu trữ trên hạ tầng bảo mật của Supabase & Cloudflare.

---

## 5. Quyền Của Người Chơi & Cơ Chế Xóa Tài Khoản (Right to be Forgotten - GDPR)

Bạn có toàn quyền kiểm soát dữ liệu cá nhân của mình:
1. **Quyền truy cập và kiểm tra:** Bạn có thể xem toàn bộ tài nguyên, sinh vật và thông tin hồ sơ trực tiếp trong giao diện game.
2. **Quyền chỉnh sửa:** Bạn có thể đổi tên hành tinh hoặc thông tin hiển thị bất kỳ lúc nào trong phạm vi quy tắc đặt tên.
3. **Quyền xóa vĩnh viễn (Right to Erasure / Xóa tài khoản):**
   - Bạn có quyền thực hiện xóa tài khoản hoàn toàn thông qua chức năng "Xóa tài khoản vĩnh viễn" (gọi RPC `delete_own_account()`).
   - **Quy trình xóa dữ liệu tức thì:**
     - Hồ sơ người chơi (`profiles`), hành tinh (`planets`), kho nguyên tố (`elements`), sinh vật (`creatures`), và kho lưu trữ cá nhân bị xóa hoàn toàn khỏi cơ sở dữ liệu.
     - Tài khoản xác thực Auth (`auth.users`) bị hủy kích hoạt và xóa vĩnh viễn.
     - Để bảo vệ tính liên tục và lịch sử của các kênh trò chuyện công khai mà không làm đứt đoạn ngữ cảnh của người chơi khác, các tin nhắn chat cũ của bạn sẽ được **ẩn danh hóa 100%**: người gửi được chuyển thành `"[Người chơi đã xóa tài khoản]"`, toàn bộ liên kết tới ID gốc bị xóa bỏ vĩnh viễn.

---

## 6. Liên Hệ Phụ Trách Bảo Mật & Khiếu Nại

Nếu bạn có bất kỳ câu hỏi hoặc khiếu nại nào liên quan đến chính sách quyền riêng tư hoặc việc xử lý dữ liệu:
- Kênh tiếp nhận: Mở issue trên GitHub Repository chính thức của dự án hoặc liên hệ ban quản trị qua kênh cộng đồng Discord của Tinh Hoa.
