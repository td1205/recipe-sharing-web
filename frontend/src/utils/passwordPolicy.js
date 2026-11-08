// BẢN ĐỒNG BỘ của utils/passwordPolicy.js (gốc dự án) — dùng cho frontend.
// Nếu thay đổi chính sách, sửa CẢ HAI file để đăng ký (backend) và form (frontend) nhất quán.
function validatePassword(password) {
  if (password.length < 8) {
    return 'Mật khẩu phải chứa ít nhất 8 ký tự!';
  }
  if (!/[0-9]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ số!';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ cái!';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #, $, %...)!';
  }
  return null;
}

export { validatePassword };
