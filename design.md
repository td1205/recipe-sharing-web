# Design System: Editorial Magazine (Recipe Sharing Web)

Tài liệu này đóng vai trò là "Single Source of Truth" (Nguồn chân lý duy nhất) cho toàn bộ quy chuẩn thiết kế UI/UX của dự án. Giao diện được thiết kế để mang lại cảm giác của một cuốn tạp chí ẩm thực, một trang báo hoặc một cuốn sách dạy nấu ăn chuyên nghiệp (Sạch sẽ, Tương phản cao, Tông Trắng/Cam).

Mọi lập trình viên hoặc AI khi viết thêm Code đều **phải tuân thủ nghiêm ngặt** các quy chuẩn dưới đây. Bất kỳ sự chệch hướng nào so với bộ quy chuẩn này đều bị coi là lỗi hiển thị nghiêm trọng.

---

## 1. Visual Theme & Atmosphere (Chủ đề & Không gian)
Giao diện tuân theo phong cách **Editorial Light Mode** (Báo chí/Tạp chí Trắng Sáng). Bầu không khí được tạo ra phải cực kỳ sáng sủa, sạch sẽ, tối giản để tôn vinh hoàn toàn vẻ đẹp của hình ảnh món ăn và typography.
- **Density (Mật độ):** "White Space Heavy" (Rất nhiều khoảng trắng). Khoảng trắng đóng vai trò như một thành phần thiết kế cốt lõi giúp giao diện "thở".
- **Color Accent:** Trắng chủ đạo, đen cho chữ (như mực in), và Cam (Magazine Orange) là điểm nhấn duy nhất thu hút ánh nhìn.

---

## 2. Color Palette & Roles (Bảng màu & Chức năng)
Tuyệt đối không hardcode mã màu HEX vào component. Luôn sử dụng CSS Variables.

- **Paper White** (`var(--color-bg-body)` / `#F9F9F7`) — Nền trang tổng thể. Một màu trắng ngà nhẹ như giấy in tạp chí, giúp bảo vệ mắt tốt hơn trắng toát.
- **Pure Canvas** (`var(--color-bg-card)` / `#FFFFFF`) — Nền của các Khối (Card), Modal, hoặc Box nội dung nổi lên trên nền giấy.
- **Hover Ash** (`var(--color-bg-hover)` / `#F0EDE6`) — Dùng khi lướt chuột qua các menu hoặc bảng.
- **Editorial Orange** (`var(--color-primary)` / `#E85D04`) — Điểm nhấn duy nhất trên toàn bộ website. Dùng cho Nút hành động chính (CTAs), trạng thái Active, Tiêu đề nổi bật.
- **Deep Ink** (`var(--color-text-main)` / `#111111`) — Chữ chính. Đen tuyền sắc nét như mực in, tương phản tuyệt đối trên nền trắng.
- **Grey Ink** (`var(--color-text-muted)` / `#666666`) — Chữ phụ, mô tả, ngày tháng, tác giả.
- **Divider Line** (`var(--color-border)` / `#E5E5E5`) — Viền xám mỏng nhẹ đóng vai trò là các đường kẻ phân cách trong tạp chí.

---

## 3. Typography Rules & Type Scale (Quy chuẩn Phông chữ & Thang kích thước)

Hệ thống typography được thiết kế theo chuẩn tỷ lệ báo chí (Editorial/Magazine). Kích thước chữ (font-size) **bắt buộc** phải sử dụng đơn vị `rem` (với base root mặc định là `16px`) để đảm bảo khả năng mở rộng và co giãn hoàn hảo.

### Phông chữ (Font Families)
- **Tiêu đề (Display/Headlines):** BẮT BUỘC sử dụng Serif cổ điển (*Playfair Display* hoặc *Georgia*). Tiêu đề phải cực lớn, độ dày mỏng (Light/Regular) để tạo dáng vẻ thanh lịch của trang báo.
- **Văn bản thường (Body/UI):** Sử dụng Sans-serif hiện đại (*Outfit*, *Inter* hoặc *Helvetica*).

### Thang kích thước chuẩn (Standard Type Scale)
- **2.875rem (46px):** Tiêu đề trang, Tiêu đề bài viết chính (Hero Title).
- **1.125rem (18px):** Nội dung văn bản chính (Recipe instructions, Article body), Tiêu đề phân đoạn (Section titles - in hoa).
- **1.0625rem (17px):** Danh sách (Ingredients list), Tiêu đề các bước phụ (Step 1, Step 2).
- **1rem (16px):** Tên tác giả (Byline), Khẩu phần ăn (Yield).
- **0.875rem (14px):** Ngày tháng (Date), Đoạn chú thích/mô tả dưới ảnh (Intro/Description), Chữ trong Nút bấm nhỏ (Toolbar buttons), Tag/Badge.
- **0.75rem (12px):** Chú thích bản quyền ảnh (Image copyright), Vi văn bản (Microcopy).

### Quy định chung
- **Line-height (Khoảng cách dòng):** Đối với văn bản dài (Body), sử dụng `1.6` đến `1.8` để tạo sự thư thái giống như đang đọc sách. Đối với Tiêu đề cực lớn (Giant Serif), sử dụng `1.1` để chữ chặt chẽ.
- **BANNED (Cấm):** Cấm dùng phông chữ hệ thống khô khan. Cấm dùng các phông chữ dạng "Comic/Trẻ em". Cấm sử dụng đơn vị `px` cứng nhắc cho font chữ.

---

## 4. Component Stylings (Chuẩn hóa Thành phần)

* **Thẻ (Cards):** Bắt buộc viền vuông vức hoặc bo góc siêu nhỏ (`2px` đến `4px`). Loại bỏ hoàn toàn đổ bóng (shadow) gắt. Chỉ dùng viền mỏng (`1px solid var(--color-border)`) hoặc thậm chí không viền, chỉ dùng hình ảnh lớn.
* **Nút bấm (Buttons):** 
  - *Primary:* Nền Cam (`var(--color-primary)`), chữ Trắng, khối vuông vức (`border-radius: 2px`).
  - *Secondary:* Nền Trắng, viền Đen hoặc Cam mỏng.
* **Forms & Inputs:** Nền trắng, viền xám mỏng. Khi Focus, viền chuyển thành Đen hoặc Cam. Thiết kế tối giản tối đa, giống như điền vào một phiếu báo.
* **Hình ảnh (Images):** Hình ảnh món ăn đóng vai trò trái tim của cuốn tạp chí. Hình ảnh phải chiếm tỉ lệ lớn, viền sắc nét, không bo góc quá tròn.

---

## 5. Layout Principles (Nguyên tắc Bố cục)
- **Grid Architecture:** Bố cục dạng lưới (Grid) sắc sảo của báo chí. Khuyến khích sử dụng Asymmetric Splits (Bố cục bất đối xứng) với một cột chữ lớn và một cột ảnh rộng.
- **Borders & Lines:** Khuyến khích sử dụng các đường kẻ ngang hoặc dọc (`1px solid #E5E5E5`) để phân tách các khu vực nội dung, giống hệt cấu trúc dàn trang của một bài báo thực thụ.
- **Hero Section:** Tiêu đề cực lớn (Giant Serif) nằm đè nhẹ lên góc ảnh hoặc tách biệt rõ ràng ở một nửa màn hình.

---

## 6. Motion & Interaction (Chuyển động & Tương tác)
- **Minimal Motion:** Chuyển động phải cực kỳ tinh tế, nhanh và dứt khoát. 
- **Hover Image:** Khi hover vào bài viết, hình ảnh có thể zoom nhẹ (`scale(1.02)`) nhưng khung không đổi.
- **Tránh lòe loẹt:** Không đổ bóng sáng rực rỡ, không lạm dụng animation bay nhảy lộn xộn. Mọi thứ cần tĩnh lặng, tập trung vào nội dung.

---

## 7. Anti-Patterns (Những Lỗi Thiết Kế Bị Cấm Tuyệt Đối)
Nếu vi phạm các lỗi này, giao diện sẽ đánh mất chất "Tạp chí Ẩm thực":
- **CẤM** sử dụng Dark Mode (nền đen/xám tối). Giao diện PHẢI là nền trắng/giấy.
- **CẤM** bo góc tròn quá mức (`border-radius > 8px`) cho ảnh hoặc card. Bo góc làm mất đi vẻ sắc sảo của tạp chí.
- **CẤM** sử dụng bóng đổ (box-shadow) dơ và nặng nề. Mọi khối nổi phải dùng viền hoặc khoảng trắng.
- **CẤM** sử dụng Emojis rực rỡ lộn xộn.
- **CẤM** hiệu ứng Neon Glow (Viền phát sáng).
