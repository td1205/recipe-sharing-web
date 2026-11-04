# Lỗi phát sinh và đã khắc phục

Tổng hợp theo thứ tự thời gian. Chi tiết đầy đủ xem các reply trong phiên làm việc.

## P0 (đã khắc phục)

1. **Lỗi 500 trang chủ khi đăng nhập** — `DB_NAME=recipe_recommendation_v2` (không tồn tại) trong `.env`, session store trỏ sai DB. Khắc phục: sửa `DB_NAME=recipe_db`.
2. **Lỗi 404 khi bấm nút camera (tìm kiếm bằng ảnh)** — frontend gọi `/api/ai/scan` nhưng backend route là `/api/ai/scan-image`; đồng thời đọc `response.data.foodName` nhưng controller trả `keyword`. Khắc phục: sửa path + field.
3. **Lỗi 500 "Gửi mã OTP"** — cột `otp` là `String? @db.Char(6)` nhưng `createOtp` trả Number. Khắc phục: `String(...)`.
4. **Trang đăng nhập/đăng ký/OTP dùng Steam UI dark mode** — convert sang editorial design (`auth.css` + `constants/auth.js`).
5. **Trang sửa công thức `/recipes/edit/22` dùng Steam inline styles** — tạo `recipeForm.css` shared, convert toàn bộ.
6. **Trang đăng công thức không đồng bộ với sửa công thức** — convert sang cùng `recipeForm.css`, chỉ cho upload file local.

## P1 (đã khắc phục)

7. **`/popular` dùng dữ liệu giả** (fake ratings, fake 5.0, always-5-stars, fake thời gian, mock collections, dead links) — thay bằng dữ liệu thật từ API.
8. **Font/card-size/pagination `/popular` không đồng bộ trang chủ** — dùng `.home-typography` + `repeat(auto-fill, minmax(10.5rem, 1fr))` + container chuẩn.
9. **Slider arrows không căn giữa ảnh** — dùng `--slider-card-w` / `--slider-btn`.
10. **Card image không đồng nhất kích thước** (card cuối 168×126 vs 151×113.3) — bỏ `padding-right: 0`.
11. **Nút bookmark không yêu cầu đăng nhập** — thêm `LoginRequiredModal` + `requireLogin` gate.
12. **"Đăng công thức" hard-redirect sang /login** — gate qua modal.
13. **Nút chia sẻ không flip icon ngay** — flip ngay lập tức (27ms), bỏ toast góc phải.
14. **Nút bookmark hiện toast góc phải** — bỏ toast, chỉ icon feedback.
15. **Nút bookmark trên card chỉ trang trí** — gọi `/api/recipes/:id/favorite` thật, đồng bộ với trang chi tiết.
16. **Nút chọn tệp là HTML thuần** — custom file picker, border rõ ràng, không hover.
17. **Media có dữ liệu vẫn hiện dòng chọn tệp** — ẩn picker khi đã có `media_url`, hiện nút "Thay".
18. **Các bước không đổi thứ tự được** — drag-and-drop + phím ↑↓.
19. **Alert box tìm kiếm bằng ảnh** — tạo `ImageSearchModal` với khung 8 đoạn thẳng rời rạc.
20. **Màu nền thứ 2 quá nhạt nhòa** — token: `--color-bg-body` #F9F9F7 → #EDE9E1, `--color-border` #E5E5E5 → #D0CCC2, thêm `--color-border-strong` #8A8A8A (3.45:1 WCAG), áp dụng cho input/button border.
21. **Hover button ở mọi trang** — xoá 28 rule `:hover` trên button; giữ hover của link và `:focus`/`:active`.
22. **Trang danh sách `/recipes`** — tạo mới `RecipeList.jsx` + `recipeList.css`, trình bày như popular, bookmark gated, pagination 12/trang, subtitle đã xoá theo yêu cầu.
23. **Navbar link** — đổi 12 link từ `/?...` sang `/recipes?...`.
24. **Mobile** — mega menu thêm `max-width: 100vw; overflow-x: auto`; hero image height 500px → 300px ở mobile; modal thêm `max-height: 90vh; overflow-y: auto`; `.mag-list-img` và `.mag-list-card-first .mag-list-img` đổi sang `min(px, vw)` + `aspect-ratio`; `.modern-search input` đổi sang `min(px, vw)`.

## Đã chẩn đoán, chưa sửa (user tự xử lý)

25. **"Xem gần đây" chứa entry mồ côi** (recipe 23 đã xoá) → clicking → 404 → "Không thể tải công thức". Fix đề xuất: validate tồn tại trước khi hiện, hoặc dọn localStorage.
26. **Ảnh đại diện cá kho gừng lệch giữa card và trang chi tiết** — `image_url` rỗng vì cover-fallback chỉ chạy khi media đầu tiên là ảnh. Fix đề xuất: lấy media ảnh đầu tiên bất kể vị trí; backfill `image_url` cho recipe đang rỗng.

## P1 (đã khắc phục) - bổ sung

31. **Scan ảnh AI chậm ~12s và modal đóng ngay khi chọn file** — backend thử 3 model không tồn tại (gemini-3.6/3.7/3.8-flash) trước khi đến `gemini-flash-latest`, và modal đóng ngay khi chọn file nên user không thấy tiến trình. Khắc phục:
   - `geminiService.js`: đặt `gemini-3.8-flash` và `gemini-flash-latest` (model thật) lên đầu, bỏ 3 model giả.
   - `ImageSearchModal.jsx`: giữ modal mở trong lúc quét, hiện preview ảnh + spinner + "Đang nhận diện món ăn, vui lòng chờ...", nút "Huỷ quét" (AbortController).
   - Thêm kiểm tra kích thước file (5MB) trước khi gửi.
   - Hiển thị lỗi trong modal (không chỉ toast), cho phép chọn lại ảnh.
   - `aiRoutes.js`: thêm rate limiter 5 lần/10 phút per IP.
   - `Navbar.jsx`: `handleImageUpload` chỉ còn navigate, scan logic chuyển vào modal.

27. **Initial state bookmark trên card vẫn lấy từ localStorage** — backend không có GET endpoint. Nếu đồng ý, thêm `GET /api/recipes/favorites/ids`.
28. **Mobile chưa test trên device thật** — chỉ phân tích CSS. Cần mở DevTools responsive 390px để xác nhận.
29. **PR + tag release + README** — thuộc Day 3, chưa làm.
30. **5 link navbar** ("Tất cả", "Công thức", "Nguyên liệu", "Dịp đặc biệt", "Video") không khớp danh mục thật → fallback về toàn bộ công thức. Cần quyết định xử lý.

## Kiểm tra mobile (CSS analysis, chưa render thực)

Không thể resize viewport trong công cụ browser hiện tại, nên kiểm tra bằng phân tích CSS.

### Đã sửa
- `.nyt-hero-img { height: 500px }` → thêm `@media (max-width: 768px) { height: 300px }`
- `.nyt-mega-menu { min-width: 500px }` → thêm `max-width: 100vw; overflow-x: auto`
- `.recipe-form-row` mobile: các field ingredient/step stack thành 1 cột (`flex: 1 1 100%`)
- `.recipe-form-media-row` mobile: chuyển thành column
- Modal `LoginRequiredModal` và `ImageSearchModal` thiếu `max-height` → thêm `max-height: 90vh; overflow-y: auto` (nội dung dài bị cắt dưới màn hình)
- `.mag-list-img` (100×100px) và `.mag-list-card-first .mag-list-img` (220×150px) cố định kích thước → đổi sang `min(px, vw)` + `aspect-ratio` để tự co
- `.modern-search input` (220px / 280px focus) → `min(220px, 60vw)` / `min(280px, 70vw)`

### Cần test thực trên device 390px (chưa verify)
- Filter drawer trên `/recipes` (`.nyt-mobile-filter-trigger`, `.nyt-filter-panel`)
- Mega menu: hover không hoạt động trên touch → menu không mở được; các link cấp 1 vẫn click được
- Card grid collapses xuống 1-2 cột (auto-fill) — cần kiểm tra ảnh không bị méo
- Auth form padding (`auth.css` 576px media query)
- Recipe detail hero + thumbnails scroll ngang
- Modal nội dung dài (đã thêm max-height, cần xác nhận)

### Kết luận
CSS responsive đầy đủ và hợp lý. Không phát hiện lỗi overflow ngang ở viewport hiện tại (1022px). Cần xác nhận trên device thật.