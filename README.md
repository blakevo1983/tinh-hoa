# Tinh Hoa — Bộ tài liệu khởi động cho Antigravity

Web game tiến hóa hành tinh: nguyên tố tương sinh/khắc, sinh vật và nguyên liệu lai tạo, thăm dò, liên minh/party, chat riêng và chat liên tinh. Thiết kế **server-authoritative** để chống gian lận, chạy bằng công cụ **miễn phí**.

*(Tên "Tinh Hoa" là tên tạm, đổi thoải mái.)*

## Bộ file gồm gì

| File/thư mục | Dùng để |
|---|---|
| `AGENTS.md` | Luật chung, Antigravity tự đọc |
| `.agents/rules/` | Luật chi tiết: bối cảnh, bảo mật, code, database |
| `.agents/workflows/` | Quy trình gọi bằng `/…`: `new-feature`, `db-migration`, `security-review`, `balance-check`, `release` |
| `docs/00-GDD.md` | Thiết kế game: nguyên tố, hành tinh, sinh vật, lai tạo, kinh tế, chiến tranh |
| `docs/01-ROADMAP.md` | Lộ trình P0–P7 và tiêu chí hoàn thành |
| `docs/02-ARCHITECTURE.md` | Kiến trúc, luồng lệnh, mô phỏng theo mốc thời gian |
| `docs/03-DATA-MODEL.md` | Bảng DB, RLS, hàm cam kết |
| `docs/04-SECURITY.md` | Mô hình đe dọa, chống gian lận, checklist phát hành, ứng phó sự cố |
| `docs/05-MULTIPLAYER-SOCIAL.md` | Nhiều người chơi, chat, liên minh, party |
| `docs/06-DEV-PROCESS.md` | Quy trình git/CI/test/phát hành và cách làm việc với AI agent |
| `docs/07-PROMPT-PLAYBOOK.md` | Prompt dán sẵn cho Antigravity |
| `docs/adr/` | Mẫu ghi quyết định kiến trúc |
| `tasks/` | P0, P1, P2 chi tiết; `BACKLOG.md` phác thảo P3–P7 |
| `.github/` | CI, mẫu PR, Dependabot |

## Bắt đầu trong 6 bước

1. **Tạo tài khoản miễn phí** (bật 2FA): GitHub, Supabase, Cloudflare. Cài Node 22+, pnpm, Git, Docker Desktop, Supabase CLI.
2. **Giải nén** vào một thư mục, chạy `git init`, rồi **mở bằng Antigravity** (Open Folder).
3. **Kiểm tra Rules/Workflows** trong *Customizations* theo `docs/07-PROMPT-PLAYBOOK.md` mục 0.
4. **Dán prompt khởi động** (`docs/07`, mục 1) để agent đọc và tóm tắt lại. Sửa chỗ nào bạn không đồng ý ở GDD trước khi code.
5. **Làm lần lượt `tasks/P0-foundation.md`**, mỗi task một phiên mới với `/new-feature T0.x`.
6. **Hết P0 → `/security-review` → P1 → P2 → …** Chỉ qua phase khi đạt exit criteria.

## Những điều nên biết

- **Chống hack ≠ tuyệt đối.** Bộ tài liệu hướng tới: logic quan trọng chỉ ở server, DB từ chối mặc định, lệnh có idempotency + khóa phiên bản, phát hiện bất thường, tắt khẩn cấp. Xem `docs/04`.
- **Thứ tự quan trọng:** nền tảng an ninh (P0) và server-authoritative (P1) trước nội dung; chat/liên minh sau khi nền chắc.
- **Gói miễn phí có giới hạn** (kết nối realtime, DB, số lần gọi function). Kiểm tra trang giá hiện hành trước khi mở công khai; kiến trúc đã chừa đường thay thế (`ChatTransport`).
- **Antigravity** đọc `AGENTS.md` và `.agents/rules/` (vẫn hỗ trợ `.agent/rules` cũ); mỗi file rule/workflow giới hạn khoảng 12.000 ký tự nên các file ở đây giữ ngắn.
- **Pháp lý:** game nhiều người có chat tại Việt Nam có thể cần giấy phép/đăng ký theo quy định hiện hành; xem `docs/04` mục 11 và hỏi tư vấn trước beta mở.
- **Các quyết định mặc định** (nhịp idle, lai tạo theo quy tắc, có phạt cận huyết, sinh vật lai chiến đấu từ P6, vi + en) nằm ở `docs/00-GDD.md` mục 14. Đổi chỗ đó nếu bạn muốn khác.
- **Con số cân bằng chỉ là điểm xuất phát.** Chỉnh qua config và `/balance-check`, đừng sửa tay trong logic.
