# Design System & UI Guidelines

Tài liệu này đóng vai trò là "Single Source of Truth" (Nguồn chân lý duy nhất) cho toàn bộ quy chuẩn thiết kế UI/UX của dự án Web Chia Sẻ Công Thức Nấu Ăn. 
Dự án hiện tại đi theo phong cách **Steam Desktop Client Aesthetic** (Giao diện giả lập Steam).

Mọi lập trình viên hoặc AI khi viết thêm Code đều **phải tuân thủ nghiêm ngặt** các quy chuẩn dưới đây để đảm bảo tính đồng bộ trên toàn hệ thống.

---

## 1. Triết lý thiết kế (Design Philosophy)
- **Dark Mode Mặc định (Steam Clone):** Giao diện tập trung vào nền tối (Dark Blue/Grey), tạo cảm giác không gian mạng nội bộ hoặc hệ thống phân phối lớn.
- **Steam Navigation:** Hệ thống thanh điều hướng 2 tầng (Top Bar & Nav Bar) đặc trưng của Steam.
- **Tập trung vào nội dung (Content-First):** Nhường toàn bộ "sân khấu" về màu sắc cho hình ảnh món ăn và công thức. Các nút chức năng sử dụng màu xanh đặc trưng (Steam Blue).

---

## 2. Design Tokens (Biến thiết kế cốt lõi)

Mọi style tĩnh bắt buộc phải sử dụng CSS Variables (khai báo tại `frontend/src/index.css`).

### 2.1. Colors (Màu sắc)
- **Nền (Backgrounds):**
  - `--color-bg-body`: `#1b2838` (Xanh đen thẫm Steam) - Nền trang tổng thể.
  - `--color-bg-card`: `#171a21` (Đen thẫm) - Phân tách khu vực nội dung (Thẻ, Header).
  - `--color-bg-hover`: `#2a475e` (Xanh navy nhạt hơn) - Dùng khi hover bảng/thẻ.
- **Màu Thương hiệu (Brand Colors):**
  - `--color-primary`: `#66c0f4` (Steam Blue) - Nút hành động chính.
  - `--color-primary-hover`: `#417a9b` - Khi lướt chuột qua nút chính.
- **Màu Ngữ nghĩa & Chức năng (Semantic/Functional Colors):**
  - `--color-danger`: `#dc3545` (Đỏ mận) - Cảnh báo, xóa dữ liệu.
  - `--color-secondary`: `#2a475e` - Nút phụ, background phụ.
- **Màu Chữ (Text):**
  - `--color-text-main`: `#c7d5e0` - Chữ chính (Trắng xanh nhạt).
  - `--color-text-muted`: `#8f98a0` - Chữ phụ (Mô tả, ngày tháng).
  - `--color-border`: `#2a475e` - Viền phân cách.

### 2.2. Typography (Phông chữ & Thang kích thước)
- **Cả Tiêu đề và Body:** Khuyến khích sử dụng phông chữ không chân hiện đại (Sans-serif) như `'Inter', -apple-system, sans-serif` để khớp với Steam.
- **Tiêu đề (Headers):** `--font-serif: 'Inter', sans-serif;` (Chuyển sang sans-serif cho hợp Steam)
- **Văn bản thường (Body):** `--font-sans: 'Inter', -apple-system, sans-serif;`
- **Typography Scale (Đề xuất):**
  - H1: `32px`, line-height `1.2`
  - H2: `24px`, line-height `1.3`
  - H3: `20px`
  - Body: `14px`, line-height `1.5` (Steam thường dùng chữ 14px)
  - Small/Muted: `12px`

### 2.3. Spacing, Layout & Borders
- **Spacing Scale (Đề xuất):** Dùng các bội số của 4 hoặc 8 (`4px, 8px, 16px, 24px, 32px`).
- **Container Width (Đề xuất):** Tối đa `100%` hoặc `1200px` tùy layout. (Thường là `940px` hoặc `1200px` cho Steam store).
- **Borders & Radius:**
  - `--radius-sm`: `2px` (Vuông vức hơn, khớp với Steam)
  - `--radius-md`: `4px`
- **Shadows (Đề xuất):** 
  - Tối giản shadow, dùng flat colors (màu phẳng) theo style Steam.

---

## 3. Component Guidelines (Thành phần giao diện)

### 3.1. Buttons & Inputs
- **Buttons:** Màu xanh `#66c0f4` với chữ màu `#1b2838`, khi hover chuyển sang sáng hơn. Hoặc màu nền `#2a475e` (chữ trắng) và khi hover thành màu `#66c0f4`.
- **Inputs & Forms:** Nền tối `#111`, chữ trắng, viền mảnh. Khi focus chuyển viền thành màu xanh `#66c0f4`.

### 3.2. Cards (Thẻ nội dung)
- Tái sử dụng component `RecipeCard` (chuẩn bị tách) cho mọi lưới bài viết/công thức.
- Nền `#171a21`, chữ `#c7d5e0`, hover lên thẻ hiển thị background `#2a475e`.

### 3.3. Navbar & Header (Steam Clone)
- **Tầng 1 (Top Bar):** Logo Recipe Sharing, Icon Notifications, Profile Dropdown. Nền màu `#171a21`.
- **Tầng 2 (Nav Bar):** Menu Duyệt tìm (Browse), Khuyến nghị (Recommendations), Danh mục (Categories), Thủ thuật (Ways to Play), Bộ sưu tập (Special sections), Search Bar, Yêu thích (Wishlist).
- **Mega Menu (Duyệt tìm):** Khi nhấp chuột (Click), menu sẽ thả xuống bao trọn toàn bộ chiều ngang trang web (100vw width). Gồm 3 cột (Cột Trái: Các liên kết chính, Cột Giữa: Thẻ banner nổi bật, Cột Phải: Các liên kết gợi ý & tài khoản). Nền tối `#171d25`, box shadow rộng. Nội dung bên trong được căn giữa với chiều rộng 940px.

---

## 4. UI Elements & Components (Steam Desktop Style)

### 4.1. Buttons
- **Primary Buttons (Xác nhận, Thêm, Mua):**
  - Sử dụng dải gradient màu Xanh Lá Steam: `linear-gradient(to right, #75b022 5%, #588a1b 95%)`.
  - Chữ màu lục nhạt `#d2efa9`, có `text-shadow` nhẹ để tạo khối.
  - Hover: Chuyển sang dải gradient sáng hơn `#8ed629 -> #6aa621`, chữ chuyển thành `#ffffff`.
- **Secondary Buttons (Huỷ, Sửa, Gợi ý):**
  - Màu nền xanh dương nhạt trong suốt `rgba(103, 193, 245, 0.2)`.
  - Màu chữ xanh dương Steam `#67c1f5`.
  - Hover: Đổ gradient xanh biển đậm `linear-gradient(to right, #47bfff 5%, #1a44c2 95%)`, chữ trắng.

### 4.2. Recipe Cards (Thẻ Công Thức)
- **Background & Border:** Màu nền `#111923` hoặc `rgba(0,0,0,0.2)`. Hiệu ứng bo tròn hiện đại `border-radius: 4px` hoặc `8px` (Modern Steam UI).
- **Typography:** Tiêu đề chữ Trắng (`#ffffff`), font thường không bôi đậm. Mô tả chữ xám (`#8f98a0`).
- **Hiệu ứng Hover (Steam Focus Glow):** 
  - Nảy nhẹ lên trên `transform: translateY(-3px)`.
  - Bóng viền phát sáng màu xanh dương `box-shadow: 0 4px 8px rgba(0,0,0,0.6), 0 0 10px rgba(102, 192, 244, 0.6)`.
  - Ảnh mờ nhẹ (Opacity 0.8 hoặc Brightness 1.1) để tạo cảm giác bấm được.

### 4.3. Typography & Background
- **Font:** Ưu tiên `Arial, Helvetica, sans-serif` làm gốc (Mô phỏng Motiva Sans).
- **Background:** Màu `#1b2838` kết hợp với Pattern nền (hoặc gradient toả tròn từ tâm). Không bao giờ dùng màu đen tuyền `#000` làm nền chính.
- **Tiêu đề (Headers):** Viết Hoa (Uppercase), Letter-spacing rộng `1px`, màu trắng `#ffffff`.

### 4.4. Animations & Transitions
- Mọi hiệu ứng hover, chuyển màu, nảy thẻ (bounce) đều dùng tốc độ cực nhanh và dứt khoát: `transition: all 0.2s ease`. Steam hướng tới sự mượt mà nhưng phản hồi tức thì.

---

## 8. Exceptions và Anti-patterns
- Không sử dụng màu trắng `#FFF` làm màu nền chính, vì sẽ phá vỡ toàn bộ phong cách Steam Dark Mode.
