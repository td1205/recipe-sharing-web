// Password rule shared by Register and ChangePassword so the `pattern`
// attribute and the hint text can never drift apart.
export const PASSWORD_PATTERN = '(?=.*\\d)(?=.*[a-zA-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}';

export const PASSWORD_REQUIREMENT =
  'Mật khẩu phải từ 8 ký tự trở lên, gồm chữ cái, chữ số và ký tự đặc biệt';

// The OTP column is `Char(6)`, so the code is always six digits.
export const OTP_LENGTH = 6;