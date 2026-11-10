# 05 — Nhiều người chơi, chat, liên minh, party

## 1. Mô hình nhiều người chơi
- **Bất đồng bộ là chính.** Mỗi người chơi có hành tinh riêng; tương tác qua thăm dò, giao thương, liên minh, chiến tranh đều là *lệnh* xử lý ở server, không cần đồng bộ thời gian thực.
- **Realtime chỉ cho:** chat, presence (đang online) của liên minh/party/bạn bè, thông báo sự kiện (lệnh hoàn tất, bị tấn công).
- **Hàng đợi sự kiện:** thông báo lưu trong `notifications` (người nhận, loại, payload, đã đọc) để offline vẫn nhận khi vào lại.
- Một server logic cho mọi người; mở rộng bằng cách giữ lệnh nhỏ, không tick, không giữ trạng thái trong RAM.

## 2. Chat

### 2.1. Loại kênh
| Kênh | Ai thấy | Mở khóa | Lưu trữ |
|---|---|---|---|
| `planet` (Hành tinh) | Chủ + người được mời ghé thăm | Giai đoạn 3 | 14 ngày |
| `dm` (Chat riêng) | Hai người (không bị chặn nhau) | Giai đoạn 3, tài khoản ≥ 24 giờ | 30 ngày |
| `alliance` (Liên minh) | Thành viên liên minh | Gia nhập liên minh | 30 ngày |
| `party` (Nhóm) | Thành viên party | Có party | Hết hạn cùng party |
| `global` (**Liên Tinh**) | Mọi người chơi đủ điều kiện | Giai đoạn 4+, tài khoản ≥ 24 giờ | 7 ngày |
| `system` | Hệ thống → một người | Luôn | 30 ngày |

"Chat liên hành tinh" = kênh `global` (Liên Tinh) + kênh `alliance` giữa các hành tinh của liên minh. Có thể thêm kênh theo nguyên tố (`element:fire`) về sau.

### 2.2. Luồng gửi tin
`Client → Edge Function chat-send → (JWT, zod, rate limit, quyền kênh, chặn/mute, lọc từ, chuẩn hóa) → INSERT chat_messages → Realtime broadcast → các client`.
Client **không** được phát trực tiếp vào kênh realtime (cấu hình channel chỉ nhận từ server) và **không** ghi bảng `chat_messages`.

### 2.3. Giới hạn (khởi điểm, nằm ở `limits.ts`)
- Độ dài ≤ 300 ký tự; tối đa 1 tin/2 giây; 20 tin/phút; `global` 1 tin/10 giây.
- Chặn tin lặp lại giống nhau liên tiếp; chặn ≥ 3 liên kết; không cho gửi liên kết ở `global` khi tài khoản mới.
- Tài khoản mới và người có `trust_score` thấp: giới hạn chặt hơn.

### 2.4. An toàn và kiểm duyệt
- **Chặn (block):** tin của người bị chặn không hiện, DM bị từ chối.
- **Mute:** quản trị/thủ lĩnh liên minh mute trong phạm vi quyền; hệ thống tự mute khi flood.
- **Báo cáo:** nút báo cáo → `chat_reports`; lưu bản chụp 20 tin xung quanh; xử lý thủ công trong giai đoạn đầu.
- **Lọc từ cấm** (danh sách cấu hình được, có chuẩn hóa dấu tiếng Việt và ký tự thay thế). Lọc không thay thế kiểm duyệt con người.
- **Người dưới tuổi:** chat toàn cục mặc định tắt cho tài khoản chưa xác nhận đủ điều kiện, nếu có thông tin tuổi; không thu thập thông tin tuổi thừa mức cần thiết.
- Không hiển thị email/ID thật; chỉ `display_name`.
- Không cho gửi tệp/ảnh ở giai đoạn đầu (tránh nội dung độc hại và tốn dung lượng).

### 2.5. Presence
Chỉ cho liên minh/party/bạn bè. Cập nhật mỗi 30–60 giây và khi đổi trạng thái; ngắt khi tab ẩn lâu. Mục đích: tiết kiệm kết nối/ghi.

### 2.6. Kỹ thuật
- `ChatTransport` interface (`send`, `subscribe`, `history(channel, beforeId, limit)`).
- Phân trang lịch sử theo `id` (cursor), tối đa 50 tin/lần.
- Chỉ subscribe kênh đang mở; hủy khi đóng panel.
- Idempotency cho `chat-send` bằng `client_msg_id` để không hiện tin trùng khi mạng chập chờn.

## 3. Liên minh (Alliance)

### 3.1. Cấu trúc
- Một người chỉ ở **một** liên minh. Tên + tag duy nhất, lọc từ cấm.
- Vai trò: `leader` (1), `officer` (nhiều), `member`.
- Giới hạn thành viên (`member_cap`) tăng theo cấp liên minh.
- Điều kiện lập liên minh: giai đoạn ≥ 4, tốn tài nguyên (sink).

### 3.2. Quyền hạn
| Hành động | Leader | Officer | Member |
|---|---|---|---|
| Mời/chấp nhận thành viên | ✔ | ✔ | ✘ |
| Kick member | ✔ | ✔ (không kick officer) | ✘ |
| Thăng/giáng chức | ✔ | ✘ | ✘ |
| Rút kho chung | ✔ | Hạn mức | ✘ |
| Góp vào kho chung | ✔ | ✔ | ✔ (có hạn mức/ngày) |
| Tuyên bố ngoại giao/chiến tranh | ✔ | Đề xuất | ✘ |
| Giải tán / chuyển quyền | ✔ | ✘ | ✘ |
Mọi kiểm tra quyền thực hiện **trong RPC** theo vai trò lưu DB, không tin client.

### 3.3. Tính năng
- **Kho chung:** góp và rút có hạn mức/ngày theo vai trò, mọi giao dịch ghi `alliance_ledger`.
- **Buff liên minh:** cấp liên minh tăng sản lượng nhỏ; buff theo nguyên tố đa dạng của thành viên (khuyến khích mix nguyên tố tương sinh).
- **Nhiệm vụ liên minh:** mục tiêu chung hàng tuần (thu thập, thăm dò), thưởng chia theo đóng góp.
- **Ngoại giao:** liên minh–liên minh: trung lập / đồng minh / thù địch; đồng minh chia sẻ tầm nhìn bản đồ, giao thương ưu đãi.
- **Chiến tranh liên minh** (P6): chiến dịch kéo dài, điểm theo đóng góp, có lá chắn và hạn mức.
- **Chống lạm dụng:** cooldown 24 giờ sau khi rời/bị kick trước khi vào liên minh khác; không nhận tài nguyên từ liên minh trong 24 giờ đầu; giới hạn tổng rút/ngày; leader không hoạt động 14 ngày → tự chuyển cho officer; `audit_log` mọi thao tác nhạy cảm.

## 4. Party (nhóm tạm thời)

### 4.1. Khái niệm
Nhóm 2–5 người lập ra cho **một hoạt động**: thăm dò chung, sự kiện boss thiên thể, nhiệm vụ cặp đôi. Hết hạn tự giải tán (`expires_at`, mặc định 6 giờ).

### 4.2. Quy tắc
- Mời bằng tên hoặc từ danh sách bạn bè/liên minh; lời mời hết hạn sau 10 phút.
- Chia thưởng: *cá nhân* (mặc định, ai đóng góp nhiều nhận nhiều), *chia đều*, hoặc *thủ lĩnh chia* (có nhật ký). Chia thưởng do server tính.
- Đóng góp tối thiểu để nhận thưởng (chống "ăn theo" và chống bán dịch vụ cày thuê qua tài khoản clone).
- Hạn mức: một người không ở quá 1 party cùng lúc; tối đa N party/ngày.
- Chat `party` tự tạo, tự xóa khi hết hạn.
- Party khác liên minh được phép (khuyến khích giao lưu); thưởng liên minh vẫn tính riêng.

## 5. Bạn bè và chặn
Danh sách bạn bè (`friendships`: hai chiều, cần chấp nhận). Bạn bè: xem hành tinh công khai, presence, mời party, DM không giới hạn tuổi tài khoản. Chặn: loại khỏi chat, mời, giao thương, tìm kiếm.

## 6. Anti-abuse xã hội
- Rate limit mọi hành động xã hội (mời, tạo liên minh, báo cáo, đổi tên).
- Đổi tên hiển thị tối đa 1 lần/30 ngày; tên cấm lịch sử không được dùng lại cho người khác trong 90 ngày.
- Chống spam lời mời: tối đa N lời mời đang chờ; người nhận có thể tắt nhận lời mời.
- Phạt tăng dần: cảnh cáo → mute 1 giờ → 24 giờ → 7 ngày → ban. Có kháng cáo.

## 7. Ngân sách tải (gói miễn phí)
Ước lượng và đặt trần từ đầu: số người chơi đồng thời mục tiêu (ví dụ 100 trong beta kín), số kênh/người (≤ 3 mở cùng lúc), tin/phút toàn hệ thống. Khi tiến gần trần: giảm presence, tăng giãn cách tin, hoặc bật chế độ chỉ-đọc `global`. Đo trước khi tối ưu.

## 8. Kiểm thử bắt buộc cho phần xã hội
- Người ngoài kênh/liên minh/party không đọc được tin, không thấy danh sách thành viên.
- Member không thực hiện được hành động của officer/leader (kể cả gọi RPC trực tiếp).
- Rate limit chặn flood; chặn/mute có hiệu lực ở cả lịch sử và realtime.
- XSS/HTML/ký tự điều khiển trong tên và chat bị vô hiệu.
- Race: hai officer cùng kick/thăng chức; hai người cùng rút kho tới hạn mức.
- Chuyển tài nguyên giữa tài khoản mới bị giới hạn đúng.
