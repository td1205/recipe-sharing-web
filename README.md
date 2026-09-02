# Recipe Sharing Web

Đây là dự án website chia sẻ công thức nấu ăn được viết bằng Node.js (Express), cơ sở dữ liệu MySQL và giao diện EJS.

## Yêu cầu hệ thống
- **Node.js** (Khuyên dùng v18+)
- **MySQL** (Có thể dùng XAMPP, WAMP, hoặc MySQL Server)

## Hướng dẫn cài đặt và chạy dự án

### 1. Cài đặt các thư viện cần thiết
Mở terminal/cmd tại thư mục gốc của dự án và chạy lệnh sau:
```bash
npm install
```

### 2. Thiết lập Cơ sở dữ liệu (Database)
1. Mở hệ quản trị MySQL của bạn (VD: qua phpMyAdmin nếu dùng XAMPP).
2. Import nội dung của file `init_db.sql` vào để tự động tạo database có tên `recipe_db` cùng với các bảng cần thiết.

### 3. Cấu hình biến môi trường
Tạo một file mới tên là `.env` (chú ý có dấu chấm ở đầu) ở cùng thư mục chứa file `package.json`. 
Copy nội dung sau vào file `.env` và sửa lại `DB_PASSWORD` cho đúng với mật khẩu MySQL trên máy bạn:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=mật_khẩu_mysql_của_bạn
DB_NAME=recipe_db
```

### 4. Khởi chạy Server
Chạy lệnh sau để khởi động dự án:
```bash
npm run dev
```
> **Lưu ý:** Bạn gặp lỗi khi chạy `nodemon app.js` vì máy bạn chưa cài nodemon toàn cục. Lệnh `npm run dev` sẽ gọi tự động nodemon được cấu hình sẵn trong project.

Sau khi server báo kết nối CSDL thành công, hãy mở trình duyệt và truy cập: 
👉 **http://localhost:3000**