// Chính sách mật khẩu dùng chung cho đăng ký và admin đặt lại mật khẩu.
// Đưa ra utils để cả authController và adminController dùng một chuẩn duy nhất.
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

module.exports = { validatePassword };
