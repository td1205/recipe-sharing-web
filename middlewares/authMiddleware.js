// Các middleware này phục vụ REST API (/api/...), nên trả về JSON 401/403
// thay vì redirect sang trang HTML.
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  return res
    .status(401)
    .json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục!' });
}

function isAdmin(req, res, next) {
  if (!req.session.user) {
    return res
      .status(401)
      .json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục!' });
  }
  if (req.session.user.role !== 'admin') {
    return res
      .status(403)
      .json({ success: false, error: 'Bạn không có quyền thực hiện thao tác này!' });
  }
  return next();
}

function isEmail(req, res, next) {
  if (req.session.resetEmail) return next();
  return res.status(400).json({
    success: false,
    error: 'Phiên khôi phục mật khẩu không hợp lệ, vui lòng nhập lại email!',
  });
}

function isOTP(req, res, next) {
  if (req.session.otp === true) return next();
  return res
    .status(403)
    .json({ success: false, error: 'Bạn cần xác thực mã OTP trước!' });
}

module.exports = { isAuthenticated, isAdmin, isEmail, isOTP };
