# 07 — Cẩm nang prompt cho Antigravity

Dán nguyên văn các prompt dưới đây vào Agent Manager / khung chat của Antigravity. Luôn mở **phiên mới** cho mỗi task.

## 0. Chuẩn bị một lần
1. Giải nén bộ tài liệu, `git init`, mở thư mục bằng Antigravity (**Open Folder**).
2. Mở *Customizations → Rules*: kiểm tra thấy `00-project-context`, `10-security`, `20-code-style`, `30-database` (Antigravity ưu tiên thư mục `.agents/rules`, vẫn đọc được `.agent/rules` cũ). Đặt `00` và `10` ở chế độ **Always On**; `20` kích hoạt theo glob `**/*.ts, **/*.tsx`; `30` theo glob `supabase/**` (nếu giao diện của bạn có tùy chọn này).
3. Mở *Customizations → Workflows*: kiểm tra có `/new-feature`, `/db-migration`, `/security-review`, `/balance-check`, `/release`.
4. Cài sẵn: Node 22+, pnpm, Git, Docker Desktop (cho Supabase local), Supabase CLI.

## 1. Prompt khởi động dự án (chạy một lần)
```
Đọc AGENTS.md, docs/00-GDD.md, docs/01-ROADMAP.md, docs/02-ARCHITECTURE.md, docs/04-SECURITY.md và tasks/P0-foundation.md.
Sau đó:
1) Tóm tắt lại bằng tiếng Việt, tối đa 15 dòng: game là gì, stack là gì, 5 luật bảo mật quan trọng nhất.
2) Chỉ ra bất kỳ mâu thuẫn hoặc điểm mơ hồ nào giữa các tài liệu (nếu có) và hỏi tôi.
3) KHÔNG viết code trong bước này.
```

## 2. Prompt làm một task
```
/new-feature T0.1
Ràng buộc: tuân thủ AGENTS.md và .agents/rules. Làm đúng phạm vi task, không thêm tính năng.
Trước khi code hãy đưa plan ngắn và chờ tôi đồng ý.
Cuối cùng báo kết quả thật của pnpm lint, typecheck, test.
```

## 3. Prompt review đối kháng (phiên MỚI, ngữ cảnh sạch)
```
Bạn là một người chơi gian lận lành nghề và một chuyên gia bảo mật. Đọc docs/04-SECURITY.md và .agents/rules/10-security.md.
Xem toàn bộ thay đổi của nhánh hiện tại so với main (git diff main).
Hãy tìm cách phá hệ thống: nhân đôi tài nguyên, truy cập dữ liệu người khác, reroll ngẫu nhiên, vượt rate limit, chèn mã vào chat/tên.
Với mỗi phát hiện: mức độ (Cao/Vừa/Thấp), bằng chứng (file:dòng), cách tái hiện, cách sửa.
Viết các test exploit tương ứng nhưng CHƯA sửa code; báo cáo cho tôi trước.
```

## 4. Prompt khi agent lệch hướng
```
Dừng lại. Đọc lại AGENTS.md mục 2 (Luật bất biến) và .agents/rules/10-security.md.
Liệt kê những chỗ trong thay đổi vừa rồi vi phạm các luật đó, rồi sửa. Không tiếp tục làm việc mới.
```

## 5. Prompt khi test đỏ
```
Chạy lại pnpm test và dán nguyên văn phần lỗi. Tìm nguyên nhân gốc, nêu giả thuyết, rồi sửa.
Cấm: xóa test, nới lỏng assertion, thêm skip, hoặc mock lách logic để cho xanh. Nếu test sai, giải thích vì sao trước khi sửa test.
```

## 6. Prompt viết ADR
```
Soạn docs/adr/NNNN-<tieu-de>.md theo mẫu docs/adr/0000-template.md cho quyết định: <mô tả>.
Nêu ít nhất 2 phương án đã cân nhắc, đánh đổi, và hệ quả với bảo mật/chi phí.
```

## 7. Prompt mô phỏng cân bằng (từ P2)
```
/balance-check
Giả thuyết: <ví dụ: Hỏa đang quá mạnh ở đầu game>. Chạy mô phỏng trước/sau, trình bày bảng so sánh, đề xuất chỉnh tham số tối thiểu.
```

## 8. Mẹo vận hành
- **Chia nhỏ:** nếu task có hơn ~5 file lớn, yêu cầu agent tách thành task con trong `tasks/`.
- **Yêu cầu bằng chứng:** "dán kết quả lệnh", "chỉ ra file:dòng".
- **Cho agent biết điều không được làm** (đã nằm trong rules) và nhắc lại khi lệch.
- **Dùng hai phiên đối trọng:** một phiên viết, một phiên phá (prompt mục 3).
- **Lưu quyết định** vào docs/ADR; đừng để chúng chỉ nằm trong lịch sử chat.
- **Ngân sách 0đ:** Antigravity có giới hạn dùng theo gói; chia task nhỏ để tiết kiệm lượt, và khi hết lượt thì chuyển sang việc không cần AI (đọc diff, tự chạy test, viết tài liệu).
