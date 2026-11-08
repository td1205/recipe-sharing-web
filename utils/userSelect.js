// Các trường của bảng users được phép trả ra ngoài API.
// KHÔNG bao giờ dùng `include: { users: true }` cho dữ liệu trả về client,
// vì sẽ làm lộ password (hash), email, otp, OTPExpiredAt...

// Thông tin công khai của tác giả / người bình luận
const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  fullname: true,
  avatar_url: true,
};

// Thông tin cho chính chủ (trang hồ sơ) và admin (quản lý người dùng)
const SAFE_USER_SELECT = {
  ...PUBLIC_USER_SELECT,
  email: true,
  role: true,
  bio: true,
  is_banned: true,
  created_at: true,
};

module.exports = { PUBLIC_USER_SELECT, SAFE_USER_SELECT };
