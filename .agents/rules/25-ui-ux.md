# Rule 25 — Quy chuẩn UI/UX & Thiết kế giao diện (Glob: `apps/web/**/*.{ts,tsx,html,css}`)

Quy tắc này tích hợp tiêu chuẩn từ `ui-ux-pro-max` và thiết kế GDD của Tinh Hoa. Áp dụng cho mọi task có đụng tới giao diện, canvas, layout, tương tác hoặc hiển thị.

## 1. Phong cách hình ảnh & Hệ thống màu (Style & Colors)
- **Phong cách:** Flat/minimal, đường nét mềm mại, tối giản, tập trung vào hành tinh và sinh vật (Canvas 2D).
- **8 nguyên tố chuẩn màu pastel & hình học (GDD mục 3.1):**
  - Kim (`#C9CED6`, `◆`), Mộc (`#8FD694`, `❦`), Thủy (`#7EC8F0`, `◖`), Hỏa (`#F4A261`, `▲`)
  - Thổ (`#D4B483`, `■`), Quang (`#FFF3C4`, `✦`), Ám (`#8E7CC3`, `●`), Lôi (`#E9D84A`, `ϟ`)
- **Tương phản & Accessibility (WCAG AA):**
  - Text với nền: tương phản tối thiểu **4.5:1** (text lớn $\ge 18\text{pt}$ hoặc in đậm $\ge 14\text{pt}$ tối thiểu 3:1).
  - Biên đồ họa, icon và viền điều khiển: tương phản tối thiểu **3:1**.
  - **Hỗ trợ khiếm thị màu:** Tuyệt đối không dựa vào màu sắc đơn thuần để biểu đạt nguyên tố hoặc trạng thái; **luôn kèm biểu tượng hình học hoặc nhãn chữ**.

## 2. Icon & Đồ họa (Icons & Assets)
- **Cấm dùng Emoji làm icon điều khiển/chức năng:** Không dùng emoji (như ⚙️, 🚀, 💬) cho thanh điều hướng, nút bấm, menu cài đặt vì emoji hiển thị lệch font/màu theo hệ điều hành.
- **Vector-first & Canvas:** Icon chức năng dùng SVG vector hoặc vẽ Canvas chuẩn xác; sắc nét trên màn hình High-DPI / Retina.
- **Kích thước nhất quán:** Dùng token kích thước chuẩn (sm: 16px, md: 24px, lg: 32px), stroke width đồng nhất (1.5px hoặc 2px).

## 3. Bố cục, Kích thước & Responsive (Layout & Rhythm)
- **Hệ thống khoảng cách 8px/4px:** Toàn bộ padding, margin, gap dùng bội số của 4/8px (4, 8, 12, 16, 24, 32, 48px).
- **Touch Target (Vùng chạm di động):** Nút bấm và các thành phần tương tác trên mobile web phải có vùng bấm tối thiểu **$44 \times 44\text{ px}$** (mở rộng hit area bằng padding nếu icon nhỏ).
- **Mobile-first & Safe Area:**
  - Giao diện phải hiển thị hoàn chỉnh trên cả điện thoại (màn hình nhỏ) và desktop.
  - Không để thanh cuộn ngang ngoài ý muốn (`overflow-x: hidden` ở container chính).
  - Tôn trọng safe area padding ở mép trên (notch) và mép dưới (gesture bar).

## 4. Tương tác & Trạng thái (Interactions & Feedback)
- **Đầy đủ 4 trạng thái:** Mọi nút/thành phần điều khiển phải có style trực quan cho: `default`, `hover`, `active` (pressed), `focus` (focus ring rõ ràng cho bàn phím), và `disabled` (giảm opacity, `cursor: not-allowed`).
- **Phản hồi tức thì:** Phản hồi trực quan khi bấm (pressed state) phải diễn ra trong vòng 80–150ms.
- **Chuyển động nhẹ nhàng (Transitions):** Thời gian chuyển trạng thái (hover, fade, open modal) từ 150ms–250ms với easing tự nhiên (`ease-out`); tôn trọng `prefers-reduced-motion`.

## 5. Hiệu năng & Bảo mật Giao diện
- **Tách biệt Canvas Loop:** Vòng `requestAnimationFrame` chỉ đảm nhiệm việc vẽ theo state, không chứa logic tính toán nghiệp vụ hay sinh ngẫu nhiên.
- **Bảo mật XSS:** Tuyệt đối không dùng `innerHTML` với dữ liệu động/người dùng; dùng `textContent`, DOM methods an toàn hoặc escape chuỗi đầy đủ.
- **i18n toàn diện:** 100% chuỗi chữ giao diện đi qua khóa dịch (`vi.json`, `en.json`); không hard-code text vào HTML/Canvas.

## 6. Pre-delivery UI Checklist (Kiểm tra trước khi hoàn thành task UI)
- [ ] Tương phản chữ $\ge 4.5:1$, viền/icon $\ge 3:1$.
- [ ] Các nguyên tố đều có biểu tượng hình học kèm theo (hỗ trợ mù màu).
- [ ] Nút bấm đạt tối thiểu $44 \times 44\text{ px}$ trên mobile.
- [ ] Không có emoji làm icon điều hướng/chức năng.
- [ ] Co giãn màn hình không bị vỡ layout, không tràn thanh cuộn ngang.
- [ ] Không có `innerHTML` với dữ liệu động.
- [ ] Chuyển đổi ngôn ngữ (vi/en) hoạt động đầy đủ trên mọi nhãn.
