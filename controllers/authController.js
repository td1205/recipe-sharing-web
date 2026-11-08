const validation = require('../utils/apiValidation');
const { fingerprint, RESET_GRANT_TTL_MS, normaliseRemember } = require('../utils/sessionAuth');
const userModel = require('../repositories/userRepository');
const tokenService = require('../services/tokenService');
const bcrypt = require('bcrypt');
const { sendMail, isMailConfigured, MailError } = require('../utils/mailHelper');
const authService = require('../services/authService');

const OTP_TTL_MS = 5 * 60 * 1000; // OTP hết hạn sau 5 phút
const OTP_MAX_ATTEMPTS = 5; // tối đa 5 lần nhập sai
// Thông báo chung, không tiết lộ email/tài khoản có tồn tại hay không (chống enumeration)
const OTP_SENT_MESSAGE = 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi. Vui lòng kiểm tra hộp thư!';

const { validatePassword } = require('../utils/passwordPolicy');

function getLoginPage(req, res) {
  res.json({ success: true, message: 'Login page endpoint' });
}

function getRegisterPage(req, res) {
  res.json({ success: true, message: 'Register page endpoint' });
}

// Đọc + kiểm tra dữ liệu đăng nhập dùng chung cho session (web) và Bearer token (Flutter).
// Trả { username, password, remember } phát lỗi 400 nếu sai kiểu.
function parseCredentials(body) {
  const { username, password } = body || {};
  validation.text(username, 'Tài khoản', 100);
  if (typeof password !== 'string' || password.length > 200) throw Object.assign(new Error('Mật khẩu không hợp lệ'), { status: 400 });
  return { username, password, remember: normaliseRemember(body.remember) };
}

async function handleLogin(req, res) {
  try {
    const { username, password, remember } = parseCredentials(req.body);
    const result = await authService.login(username, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error,
      });
    }
    // Đăng nhập đúng -> xoá bộ đếm số lần sai
    if (req.rateLimit) req.rateLimit.reset();
    const user = result.user;
    // Tạo session mới (regenerate) để chống session fixation: id session cũ bị bỏ
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error('Lỗi tạo session mới:', regenErr);
        return res.status(500).json({ success: false, error: 'Lỗi hệ thống, vui lòng thử lại!' });
      }
      req.session.authFingerprint = fingerprint(user.password);
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };
      // "Ghi nhớ đăng nhập": tick -> cookie 30 ngày; không tick -> 1 ngày
      req.session.cookie.maxAge = remember
        ? 1000 * 60 * 60 * 24 * 30
        : 1000 * 60 * 60 * 24;
      req.session.save((err) => {
        if (err) {
          console.error('Lỗi lưu session:', err.code || err.name);
          return res.status(500).json({ success: false, error: 'Lỗi hệ thống!' });
        }
        return res.json({ success: true, user: req.session.user });
      });
    });
  } catch (error) {
    if (error.status === 400 || /^P\d{4}$/.test(error.code || '')) return validation.apiError(res, error);
    console.error('Lỗi handleLogin:', error.code || error.name);
    return res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

async function handleRegister(req, res) {
  try {
    const { password, confirm_password } = req.body || {};
    const username = validation.text(req.body?.username, 'Tài khoản', 100);
    if (!/^[\p{L}\p{N}_.-]+$/u.test(username)) throw Object.assign(new Error('Tài khoản chỉ gồm chữ, số, dấu gạch và dấu chấm'), { status: 400 });
    const email = validation.email(req.body?.email);
    const fullname = validation.text(req.body?.fullname, 'Họ tên', 255);

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu xác nhận không khớp!',
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, error: passwordError });
    }

    const [user] = await userModel.getUserByUsername(username);
    if (user !== undefined) {
      // Chống enumeration: không nói rõ tài khoản hay email nào đã tồn tại
      return res.status(400).json({ success: false, error: 'Đăng ký không thành công: tài khoản hoặc email đã tồn tại, hoặc thông tin không hợp lệ!' });
    }
    const [userByEmail] = await userModel.getUserByEmail(email);
    if (userByEmail !== undefined) {
      return res.status(400).json({ success: false, error: 'Đăng ký không thành công: tài khoản hoặc email đã tồn tại, hoặc thông tin không hợp lệ!' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await userModel.createUser(username, hashedPassword, email, fullname);
    return res.json({ success: true, message: 'Đăng ký thành công' });
  } catch (error) {
    if (error.status === 400 || ['P2002', 'P2003', 'P2025', 'P2034'].includes(error.code)) return validation.apiError(res, error);
    console.error('Lỗi handleRegister:', error.code || error.name);
    return res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

function logout(req, res) {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ success: false, error: 'Không thể đăng xuất, vui lòng thử lại' });
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out' });
  });
}

// POST /api/auth/token — phát hành Bearer token cho ứng dụng Flutter.
// Xác thực đúng một luồng như đăng nhập web (authService.login + rate limit yêu cầu cùng nhau),
// nhưng trả token dài hạn thay vì cookie. Token đóng cũng dùng bảng `sessions` nên
// bị khóa tài khoản / đổi mật khẩu sẽ tự hủy phiên như web.
async function issueToken(req, res) {
  try {
    const { username, password, remember } = parseCredentials(req.body);
    const result = await authService.login(username, password);
    if (!result.success) {
      return res.status(401).json({ success: false, error: result.error });
    }
    // Đăng nhập đúng -> xoá bộ đếm số lần sai (parity với handleLogin).
    if (req.rateLimit) req.rateLimit.reset();
    const tokenData = await tokenService.issueToken(result.user, remember);
    return res.json({ success: true, ...tokenData });
  } catch (error) {
    if (error.status === 400 || /^P\d{4}$/.test(error.code || '')) return validation.apiError(res, error);
    console.error('Lỗi issueToken:', error.code || error.name);
    return res.status(500).json({ success: false, error: 'Lỗi hệ thống, vui lòng thử lại!' });
  }
}

// GET /api/auth/me — thông tin tài khoản hiện tại (session hoặc Bearer token hợp lệ).
// Trả SAFE_USER_SELECT (có email/role cho chính chủ) nhưng không bao giờ bao gồm password/otp.
async function me(req, res) {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục!' });
    const [user] = await userModel.getUserById(req.session.user.id);
    if (!user || user.is_banned) {
      return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục!' });
    }
    return res.json({ success: true, user, tokenAuth: req.isTokenAuth === true });
  } catch (error) {
    if (error.status === 400 || ['P2002', 'P2003', 'P2025', 'P2034'].includes(error.code)) return validation.apiError(res, error);
    console.error('Lỗi me:', error.code || error.name);
    return res.status(500).json({ success: false, error: 'Lỗi hệ thống!' });
  }
}

async function renderProfile(req, res) {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = req.session.user.id;
    const [user] = await userModel.getUserById(userId);
    const favouriteRecipes = await userModel.getFavouriteRecipesByUser(userId);
    const myRecipes = await userModel.getRecipesByUser(userId);
    res.json({ success: true, user, favouriteRecipes, myRecipes });
  } catch (error) {
    if (error.status === 400 || ['P2002', 'P2003', 'P2025', 'P2034'].includes(error.code)) return validation.apiError(res, error);
    console.error('Lỗi renderProfile:', error.code || error.name);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống!' });
  }
}

function getForgotPasswordPage(req, res) {
  res.json({ success: true, message: 'Forgot password page endpoint' });
}

async function handleForgotPassword(req, res) {
  try {
    const email = validation.email(req.body?.email);
    delete req.session.resetGrantExpiresAt;
    delete req.session.resetGrantFingerprint;
    delete req.session.otp;
    delete req.session.resetEmail;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập email!' });
    }
    // Báo rõ khi server chưa cấu hình email, thay vì "Lỗi hệ thống"
    if (!isMailConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Chức năng gửi OTP chưa được cấu hình trên máy chủ (thiếu EMAIL_USER / EMAIL_APP_PASSWORD).',
      });
    }
    const [userByEmail] = await userModel.getUserByEmail(email);
    if (userByEmail) {
      req.session.resetEmail = email;
      req.session.otp = false;
      req.session.otpExpiresAt = Date.now() + OTP_TTL_MS;
      req.session.otpAttempts = 0;
      const otp = await authService.createOtp(email);
      await sendMail(email, otp);
    }
    // Luôn trả thông báo chung (kể cả khi email không tồn tại / gửi mail lỗi)
    // để không ai dò được email nào đã đăng ký
    req.session.save((err) => {
      if (err) {
        console.error('Lỗi lưu phiên:', err.code || err.name);
        return res.status(500).json({
          success: false,
          error: 'Lỗi khi lưu phiên!',
        });
      }
      return res.json({ success: true, message: OTP_SENT_MESSAGE });
    });
  } catch (error) {
    if (error.status === 400 || ['P2002', 'P2003', 'P2025', 'P2034'].includes(error.code)) return validation.apiError(res, error);
    if (error instanceof MailError) {
      // Lỗi hạ tầng email vẫn trả thông báo chung — nếu báo lỗi riêng,
      // kẻ dò sẽ biết email tồn tại (chỉ email tồn tại mới chạm tới bước gửi thư).
      // Vẫn lưu session đã thiết lập để người dùng có thể yêu cầu gửi lại từ trang OTP.
      return req.session.save((saveErr) => {
        if (saveErr) {
          return res.status(500).json({ success: false, error: 'Lỗi khi lưu phiên!' });
        }
        return res.json({ success: true, message: OTP_SENT_MESSAGE });
      });
    }
    console.error('Lỗi handleForgotPassword:', error.code || error.name);
    return res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

function getEditProfilePage(req, res) {
  res.json({
    success: true,
    editUser: req.session.user,
    isAdminEditing: false,
  });
}

async function handleEditProfile(req, res) {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const fullname = validation.text(req.body?.fullname, 'Họ tên', 100);
    const email = validation.email(req.body?.email);
    const bio = validation.text(req.body?.bio, 'Giới thiệu', 5000, false);
    let avatar_url = req.session.user.avatar_url || null;

    if (req.file) {
      avatar_url = '/avatars/' + req.file.filename;
    }

    const userId = req.session.user.id;
    const [userByEmail] = await userModel.getUserByEmail(email);
    if (userByEmail && userByEmail.id !== userId) {
      return res.status(400).json({
        success: false,
        error: 'Email đã được sử dụng bởi người khác!',
      });
    }
    await userModel.updateUserProfile(userId, fullname, email, avatar_url, bio);
    req.session.user.fullname = fullname;
    req.session.user.email = email;
    req.session.user.avatar_url = avatar_url;
    req.session.user.bio = bio;
    res.json({ success: true, user: req.session.user });
  } catch (error) {
    if (error.status === 400 || ['P2002', 'P2003', 'P2025', 'P2034'].includes(error.code)) return validation.apiError(res, error);
    console.error('Lỗi handleEditProfile:', error.code || error.name);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống!' });
  }
}

async function getChangePasswordPage(req, res) {
  res.json({ success: true, message: 'Change password page' });
}

async function handleChangePassword(req, res) {
  try {
    const email = req.session.resetEmail;
    if (!email) return res.status(400).json({ success: false, error: 'No reset email in session' });
    const { password, confirm_password } = req.body || {};
    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu xác nhận không khớp!',
      });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, error: passwordError });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    if (req.session.otp !== true || !(req.session.resetGrantExpiresAt > Date.now())) return res.status(403).json({ success: false, error: 'Quyền đổi mật khẩu đã hết hạn' });
    const [current] = await userModel.getUserByEmail(email);
    if (!current || fingerprint(current.password) !== req.session.resetGrantFingerprint) return res.status(403).json({ success: false, error: 'Quyền đổi mật khẩu không còn hợp lệ' });
    const changed = await userModel.consumePasswordReset(email, current.password, hashedPassword);
    if (!changed.count) return res.status(409).json({ success: false, error: 'Yêu cầu đổi mật khẩu đã được sử dụng' });
    await new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()));
    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.',
    });
  } catch (error) {
    if (error.status === 400 || ['P2002', 'P2003', 'P2025', 'P2034'].includes(error.code)) return validation.apiError(res, error);
    console.error('Lỗi handleChangePassword:', error.code || error.name);
    return res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

async function getOTPPage(req, res) {
  res.json({ success: true, message: 'OTP page' });
}

async function handleOTP(req, res) {
  try {
    const email = req.session.resetEmail;
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';

    if (!req.session.otpExpiresAt || Date.now() > req.session.otpExpiresAt) {
      await userModel.updateOTP(email, null);
      return res.status(400).json({
        success: false,
        error: 'Mã OTP đã hết hạn, vui lòng yêu cầu mã mới!',
      });
    }

    if ((req.session.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      await userModel.updateOTP(email, null);
      return res.status(429).json({
        success: false,
        error: 'Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã mới!',
      });
    }

    const trueOtp = await userModel.getOTPbyEmail(email);
    if (!/^\d{6}$/.test(otp) || !trueOtp || otp !== String(trueOtp)) {
      req.session.otpAttempts = (req.session.otpAttempts || 0) + 1;
      const remaining = OTP_MAX_ATTEMPTS - req.session.otpAttempts;
      return res.status(400).json({
        success: false,
        error:
          remaining > 0
            ? `Sai mã OTP! Bạn còn ${remaining} lần thử.`
            : 'Sai mã OTP! Bạn đã hết lượt thử, vui lòng yêu cầu mã mới.',
      });
    }

    const [resetUser] = await userModel.getUserByEmail(email);
    if (!resetUser) return res.status(400).json({ success: false, error: 'Yêu cầu không hợp lệ' });
    const consumed = await userModel.consumeOTP(email, otp);
    if (!consumed.count) return res.status(400).json({ success: false, error: 'OTP đã hết hạn hoặc được sử dụng' });
    req.session.otp = true;
    req.session.resetGrantExpiresAt = Date.now() + RESET_GRANT_TTL_MS;
    req.session.resetGrantFingerprint = fingerprint(resetUser.password);
    delete req.session.otpExpiresAt;
    delete req.session.otpAttempts;
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    return res.json({ success: true, message: 'OTP correct' });
  } catch (error) {
    if (error.status === 400 || ['P2002', 'P2003', 'P2025', 'P2034'].includes(error.code)) return validation.apiError(res, error);
    console.error('Lỗi handleOTP:', error.code || error.name);
    return res.status(500).json({ success: false, error: 'Lỗi hệ thống, vui lòng thử lại!' });
  }
}

module.exports = {
  getOTPPage,
  handleOTP,
  getEditProfilePage,
  handleEditProfile,
  getLoginPage,
  getRegisterPage,
  handleLogin,
  handleRegister,
  issueToken,
  me,
  logout,
  renderProfile,
  getForgotPasswordPage,
  handleForgotPassword,
  getChangePasswordPage,
  handleChangePassword,
};
