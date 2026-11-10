# 06 — Quy trình phát triển

Mục tiêu: người một mình + AI agent vẫn làm việc có kỷ luật như một đội nhỏ. Kỷ luật ở đây thay cho "review của đồng nghiệp": test, CI, checklist và tự review đối kháng.

## 1. Phương pháp
- **Lặp ngắn:** mỗi phase chia thành task nhỏ (vài giờ), mỗi task một nhánh, một PR, một lần merge.
- **Thiết kế trước khi code** cho phần đụng DB/bảo mật: plan ngắn được bạn duyệt (xem `/new-feature`).
- **Kiểm thử là một phần của task**, không phải bước sau.
- **Nhỏ, thường xuyên, an toàn:** merge sớm, bật tính năng bằng feature flag.

## 2. Git
- Nhánh `main` luôn triển khai được; bật *branch protection*: bắt buộc PR, CI xanh, không push trực tiếp.
- Nhánh làm việc: `feat/T1-3-resource-accrual`, `fix/...`, `chore/...`.
- Commit theo *Conventional Commits*: `feat(planet): add lazy resource accrual`, `fix(chat): escape display name`, `test:`, `docs:`, `chore:`. Một commit = một ý.
- Squash merge để lịch sử sạch. Tag phát hành `v0.1.0`...
- `.gitignore` chặn `.env*`, `node_modules`, `dist`, file dump DB.

## 3. Vòng đời một task
1. **Chọn task** trong `tasks/`, đánh dấu đang làm.
2. **Phiên Antigravity mới** (ngữ cảnh sạch) → `/new-feature T<x.y>`.
3. Agent plan → bạn duyệt (với task nhạy cảm) → test → code → chạy kiểm tra.
4. **Bạn tự kiểm** theo 3 câu: *Chạy thử có đúng không? Test có thật sự chặn lỗi không (thử phá)? Có thứ gì tin client không?*
5. `/security-review` (task server/DB/chat). Nếu muốn chắc hơn, mở **phiên khác** (agent khác ngữ cảnh) với vai "người tấn công" để review lại.
6. Mở PR (mẫu `.github/PULL_REQUEST_TEMPLATE.md`) → CI → merge.
7. Cập nhật `tasks/`.

## 4. Tháp kiểm thử
| Tầng | Công cụ | Phạm vi |
|---|---|---|
| Unit | Vitest | Công thức, lai tạo, sinh hành tinh, quan hệ nguyên tố |
| Property | fast-check | Bất biến: chỉ số trong biên, không âm/NaN, xác suất hợp lệ, xác định theo seed |
| DB | pgTAP | RLS, ràng buộc, RPC, idempotency |
| Tích hợp | Vitest + Supabase local | Edge Function ↔ DB, luồng lệnh |
| E2E | Playwright | Đăng ký → chơi → chat → liên minh (smoke) |
| Exploit | Vitest/Playwright | Replay, song song, đổi giờ, reroll, IDOR, XSS, flood |
| Cân bằng | `pnpm sim:balance` | Tỉ lệ thắng, tốc độ mốc, kinh tế |
| Tải | k6 (miễn phí) | Số người đồng thời, chat flood (P7) |

Mỗi bug sửa xong → thêm test hồi quy.

## 5. CI/CD (GitHub Actions)
- PR: `lint` → `typecheck` → `test` → `build` → kiểm bundle không chứa `service_role` → `gitleaks`; job DB: `supabase start` → `db reset` → `test db`.
- `main`: tự deploy client lên Cloudflare Pages (staging); **production deploy thủ công** qua `/release`.
- Dependabot hàng tuần; `pnpm audit` định kỳ.
- Giữ thời gian CI < 10 phút (gói miễn phí có giới hạn phút cho repo riêng tư; repo công khai thường dư dả — kiểm tra hạn mức hiện hành).

## 6. Môi trường và dữ liệu
local / staging / production tách biệt (xem `02-ARCHITECTURE.md`). Không dùng dữ liệu thật ở local/staging. Migration chạy local → staging → production theo thứ tự, qua `/release`.

## 7. Tài liệu
- `docs/` là nguồn sự thật; đổi hành vi thì đổi docs cùng PR.
- ADR cho mọi quyết định kiến trúc/đánh đổi lớn (`docs/adr/`).
- `CHANGELOG.md` cho người chơi/bạn đọc; `docs/balance/` lưu kết quả mô phỏng.
- `docs/incidents/` ghi sự cố và bài học.

## 8. Definition of Ready (task sẵn sàng làm)
- Có mục tiêu và acceptance criteria đo được.
- Biết file/bảng bị ảnh hưởng, biết có đụng bảo mật không.
- Phụ thuộc đã xong.

## 9. Definition of Done
Xem `AGENTS.md` mục 5. Với task nhạy cảm cộng thêm: đã `/security-review`, có test exploit, đã thử phá bằng tay ít nhất 3 kịch bản.

## 10. Làm việc với AI agent: kỷ luật cần giữ
- **Một task – một phiên.** Phiên dài làm agent "quên" luật và lệch hướng.
- **Không tin "xong rồi".** Yêu cầu xem kết quả lệnh test. Tự chạy lại ở terminal của bạn.
- **Đọc diff**, nhất là migration, RLS, RPC, Edge Function. Phần này không ủy quyền hoàn toàn.
- **Cẩn trọng với thư viện agent tự thêm** (kiểm tên đúng, phổ biến, giấy phép).
- **Giữ luật ngắn gọn** (mỗi file rule < 12.000 ký tự) và cập nhật khi thấy agent lặp lại một lỗi.
- **Xin phép trước các lệnh phá hủy** (xóa DB, reset production, force push). Không bật chế độ tự chạy lệnh terminal không giới hạn trên máy có dữ liệu quan trọng; dùng chế độ yêu cầu duyệt cho lệnh nguy hiểm.

## 11. Vận hành sau khi ra mắt
- Lịch hàng tuần: xem `cheat_flags`, báo cáo chat, dung lượng DB, lỗi Sentry; cập nhật phụ thuộc.
- Hàng tháng: thử khôi phục backup, xoay vòng khóa/muối, xem lại hạn mức gói miễn phí.
- Thay đổi cân bằng: luôn qua `/balance-check` và ghi `CHANGELOG`.
