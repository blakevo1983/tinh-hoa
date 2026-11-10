# 00 — Game Design Document (GDD)

**Tên tạm:** Tinh Hoa · **Phiên bản:** 0.1 (nháp) · **Trạng thái:** mọi số trong tài liệu này là *giá trị khởi điểm*, sẽ nằm ở `packages/shared/src/config/` và chỉnh bằng `/balance-check`.

## 1. Tầm nhìn
Người chơi gieo một hành tinh nhỏ mang một nguyên tố, nuôi nó lớn dần: sinh vật xuất hiện và tiến hóa, nguyên liệu được thu thập rồi chế tác, hành tinh mở rộng, cuối cùng thăm dò các hành tinh khác để hợp tác hoặc tranh giành tài nguyên. Cảm giác: **nhẹ nhàng, khám phá, không phạt nặng**.

## 2. Trụ cột thiết kế
1. **Khám phá hơn cày cuốc.** Thử tổ hợp mới luôn có thưởng (codex).
2. **Nhẹ nhàng.** Không có thất bại cứng; sự kiện xấu chỉ làm chậm. Chơi 3–5 phút mỗi lần vẫn tiến bộ.
3. **Nguyên tố có tính cách.** Mỗi nguyên tố chơi khác nhau, mạnh và yếu rõ ràng.
4. **Một bộ gen chung** cho sinh vật và nguyên liệu → một cơ chế lai tạo, dễ mở rộng.
5. **Công bằng.** Không pay-to-win. Server quyết định mọi thứ (xem `04-SECURITY.md`).

## 3. Hệ nguyên tố

### 3.1. Tám nguyên tố
| Khóa | Tên | Màu pastel | Biểu tượng | Tính cách |
|---|---|---|---|---|
| `metal` | Kim | `#C9CED6` | ◆ | Bền, chắc, chậm thích nghi |
| `wood` | Mộc | `#8FD694` | ❦ | Sinh trưởng, cộng sinh tốt |
| `water` | Thủy | `#7EC8F0` | ◖ | Linh hoạt, hợp tác |
| `fire` | Hỏa | `#F4A261` | ▲ | Mạnh nhưng bất ổn |
| `earth` | Thổ | `#D4B483` | ■ | Chậm, rất bền, ổn định |
| `light` | Quang | `#FFF3C4` | ✦ | Hòa hợp cao, hợp tác |
| `dark` | Ám | `#8E7CC3` | ● | Tấn công mạnh, khó kết giao |
| `thunder` | Lôi | `#E9D84A` | ϟ | Nhanh, "phá luật", rất bất ổn |

Mỗi nguyên tố **luôn** có biểu tượng hình dạng đi kèm màu (hỗ trợ người mù màu).

### 3.2. Năm chỉ số (thang 1–5 là *thiên hướng* gốc của nguyên tố)
`qi` Nguyên khí (sức mạnh gốc) · `guard` Hộ thể (phòng thủ) · `agility` Linh động (tốc độ phát triển/hành động) · `harmony` Hòa hợp (hợp tác, lai tạo) · `chaos` Bất ổn (ngẫu nhiên, đột biến, rủi ro).

| | qi | guard | agility | harmony | chaos |
|---|---|---|---|---|---|
| Kim | 3 | 5 | 2 | 3 | 1 |
| Mộc | 3 | 3 | 3 | 4 | 2 |
| Thủy | 3 | 3 | 4 | 4 | 2 |
| Hỏa | 5 | 2 | 4 | 2 | 5 |
| Thổ | 3 | 5 | 1 | 4 | 1 |
| Quang | 4 | 3 | 3 | 5 | 2 |
| Ám | 5 | 3 | 3 | 1 | 4 |
| Lôi | 4 | 1 | 5 | 2 | 5 |

### 3.3. Quan hệ (v1, nguồn sự thật là file config)
- **Tương sinh** (A sinh B): Mộc→Hỏa→Thổ→Kim→Thủy→Mộc; thêm Quang→Mộc, Ám→Thủy, Lôi→Hỏa.
- **Tương khắc** (A khắc B): Mộc→Thổ→Thủy→Hỏa→Kim→Mộc; Quang↔Ám khắc lẫn nhau; Lôi→Thủy, Lôi→Kim; Thổ→Lôi.
- **Hệ số:** khắc ×1,5 · bị khắc ×0,67 · còn lại ×1. Tương sinh: nguyên tố được sinh tăng tốc phát triển +20% khi kề ô nguyên tố sinh ra nó; ô nguyên tố sinh tiêu hao nhanh +10% (đánh đổi).
- **Nguyên tố lai** (ra khi lai xung đột/đối cực, xem 7): Thủy+Hỏa=Hơi Nước, Lôi+Thủy=Điện Giải, Quang+Ám=Hư Vô, Mộc+Kim=Gỗ Tinh (ví dụ khởi đầu; thêm dần).

## 4. Hành tinh
- **Lưới ô** vuông, mốc đầu 12×12; mở rộng theo giai đoạn (16 → 20 → 24).
- **Sinh địa hình** bằng seed: nguyên tố chủ đạo chiếm 60–70% ô, tạo thành mảng liền (noise); phần còn lại là ô **ngoại lai** nguyên tố ngẫu nhiên.
- Ô ngoại lai: tài nguyên hiếm, đồng thời tạo xung đột sinh thái với ô kề nhau (khắc → giảm sản lượng, sinh → tăng).
- Mỗi nguyên tố có 3–4 loại biome (ví dụ Mộc: rừng, đầm lầy, đồng cỏ; Hỏa: dung nham, sa mạc, núi lửa).
- **Sự kiện môi trường** theo nguyên tố (bão sét, hạn hán, thủy triều, nhật thực...). Chỉ làm chậm hoặc đổi tài nguyên, không phá hủy vĩnh viễn.
- Seed lưu ngay khi tạo; địa hình tạo lại được đúng từ seed (test bắt buộc).

## 5. Sinh vật
- **Genome:** `primary` (nguyên tố chính, ~70%), `secondary` (phụ, ~30%, có thể rỗng), 5 chỉ số, tối đa 3 `traits`, `generation`, `inbreeding`.
- **Giai đoạn:** vi sinh → thực vật/động vật nhỏ → loài có trí tuệ (biết xây dựng) → văn minh.
- **Hệ sinh thái cân bằng:** loài quá đông/mạnh làm ô suy thoái (giảm sản lượng, hồi phục dần), khuyến khích đa dạng.
- **Hình dáng tự tạo:** khối cơ bản + màu pha hai nguyên tố + họa tiết theo trait (không vẽ tay từng con).

## 6. Nguyên liệu và chế tác
- **Thô** (từ ô): Gỗ, Quặng, Nước, Than, Tinh thể, Khí...
- **Hợp chất:** ghép hai nguyên liệu theo quy tắc nguyên tố + vài công thức bí mật.
- **Huyền thoại:** từ nguyên liệu hiếm đối lập hoặc sản phẩm của sinh vật lai.
- **Codex** ghi mọi tổ hợp đã khám phá ("37/120").
- Nguyên liệu dùng chung `Genome` với sinh vật (kiểu "mini"): có nguyên tố, chỉ số, trait.

## 7. Lai tạo (giá trị khởi điểm)
Điều kiện: cùng giai đoạn, cả hai `harmony ≥ 3`, có công trình **Hồ Giao Hòa**, tốn tài nguyên và thời gian ấp.

| Quan hệ cha mẹ | Kết quả |
|---|---|
| Cùng nguyên tố | Thuần chủng: chỉ số +5%, đột biến ít |
| Tương sinh | Hài hòa: nguyên tố chính của cha/mẹ, chỉ số tốt, rủi ro thấp |
| Tương khắc | Xung đột: biên độ chỉ số ±30%, 15% ra nguyên tố lai |
| Đối cực (Quang+Ám) | Cực hiếm: 5% ra nguyên tố mới |

- Chỉ số con = trung bình cha mẹ ± biến thiên (biên độ tỉ lệ `chaos`), kẹp trong khoảng cho phép.
- Mỗi trait truyền 50%. Đột biến 5%: sinh trait mới.
- **Cận huyết:** mỗi thế hệ lai cùng dòng +`inbreeding`; vượt ngưỡng thì chỉ số giảm. Khuyến khích tìm giống mới từ ô ngoại lai/hành tinh khác.
- Thất bại không mất trắng: trả lại một phần nguyên liệu hoặc ra bản yếu.
- Xúc tác: "Tinh chất nguyên tố" ép hướng lai (muốn thiên Hỏa thì dùng Tinh chất Hỏa).

## 7b. Vòng lặp chính
`Thu thập → Chế tác/Xây dựng → Nâng cấp → Mở khóa tiến hóa → Thu thập hiệu quả hơn`

## 8. Kinh tế và công trình
- **Tài nguyên cơ bản:** Năng lượng, Vật chất, Sinh khí. Hiếm: từ ô ngoại lai/hành tinh khác.
- **Công trình khởi đầu:** Trạm Thu Thập, Kho (tăng trần), Hồ Giao Hòa (lai tạo), Lò Chế Tác, Đài Quan Sát (mở thăm dò), Thư Viện (bonus codex).
- **Idle:** tiến bộ cả khi offline, trần offline mặc định 8 giờ (nâng được bằng Kho). Offline *kém hiệu quả hơn* chơi chủ động một chút (khuyến khích vào chơi nhưng không ép).
- **Nguyên tắc nguồn/sink:** mọi nguồn tài nguyên phải có sink tương ứng; không có vòng chế → bán → chế sinh lời vô hạn.

## 9. Mốc tiến hóa
| # | Mốc | Mở khóa |
|---|---|---|
| 1 | Hạt giống | Chọn nguyên tố, hành tinh 12×12, thu thập, xây cơ bản |
| 2 | Sơ khai | Sinh vật đơn giản, codex, chế tác |
| 3 | Phồn thịnh | Lai tạo, sinh vật trí tuệ, công trình nâng cao, **chat hành tinh/bạn bè** |
| 4 | Vũ trụ | Đài Quan Sát, thăm dò, giao thương NPC, **liên minh/party** |
| 5 | Thiên hà | Liên tinh người chơi, ngoại giao, chiến tranh, **chat liên tinh** |

## 10. Thăm dò, ngoại giao, chiến tranh
- Hành tinh khác: NPC hoặc người chơi khác. NPC có tính cách theo nguyên tố (hiếu chiến, thương mại, ẩn dật).
- **Hợp tác:** đổi tài nguyên, liên minh nguyên tố tương sinh (bonus sản lượng).
- **Chiến tranh:** *bất đồng bộ, tự động theo lượt*, tính trên server từ chỉ số, hệ số khắc/sinh, đội hình người chơi chọn trước. Không điều khiển thời gian thực.
- **Giới hạn chống bóc lột:** lá chắn bảo vệ sau khi bị đánh (mặc định 12 giờ), hạn mức cướp tối đa 20% kho chưa được bảo vệ, không cướp người chơi mới (giai đoạn < 4), giảm lợi khi đánh người yếu hơn nhiều.
- Chiến lợi phẩm: tài nguyên, đồng hóa sinh vật (nhận gen).

## 11. Xã hội
Liên minh, party, chat riêng/chat liên tinh: xem `05-MULTIPLAYER-SOCIAL.md`.

## 12. Kiếm tiền (sau này, tùy chọn, đạo đức)
Không pay-to-win. Có thể: ủng hộ (donate), mỹ phẩm (giao diện hành tinh, khung avatar), gói tiện ích không ảnh hưởng sức mạnh. Quyết định sau khi có người chơi thật.

## 13. Giao diện và âm thanh
Flat/minimal, hành tinh là hình tròn chia mảng màu, hiệu ứng mềm, nhạc ambient nhẹ. Canvas 2D. i18n vi (mặc định) + en. Hỗ trợ bàn phím và màn hình nhỏ (mobile web).

## 14. Quyết định mặc định (đã chốt tạm để agent không bị kẹt)
Có thể đổi bất kỳ lúc nào bằng ADR.
1. **Nhịp chơi:** idle + hành động chủ động ngắn.
2. **Lai tạo:** quy tắc nguyên tố tự động + một số công thức bí mật.
3. **Cận huyết:** có phạt.
4. **Sinh vật lai chiến đấu:** có, từ phase chiến tranh (P6); trước đó chỉ sản xuất nguyên liệu.
5. **Ngôn ngữ:** vi mặc định, en song song.
6. **Nhiều người chơi:** có (từ P3), mỗi người một hành tinh chính; tương tác qua thăm dò/giao thương/liên minh.
