// Giới hạn số lần gọi API theo khoá (IP + tài khoản/email), lưu trong RAM.
// Đủ dùng cho một tiến trình Node; nếu chạy nhiều tiến trình thì cần chuyển sang Redis/MySQL.
//
// Dùng:
//   const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, key: (req) => ... });
//   router.post('/login', loginLimiter, handler);
//   // trong handler, khi đăng nhập đúng: req.rateLimit.reset();

function createRateLimiter({ windowMs, max, key, message, now = () => Date.now() }) {
  const hits = new Map(); // key -> { count, resetAt }

  // Dọn các khoá đã hết hạn để Map không phình mãi
  const sweep = setInterval(() => {
    const t = now();
    for (const [k, entry] of hits) if (entry.resetAt <= t) hits.delete(k);
  }, Math.min(windowMs, 60 * 1000));
  if (sweep.unref) sweep.unref();

  function middleware(req, res, next) {
    const k = `${req.ip}|${key ? key(req) : ''}`;
    const t = now();
    let entry = hits.get(k);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;

    req.rateLimit = {
      remaining: Math.max(0, max - entry.count),
      reset: () => hits.delete(k),
    };

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - t) / 1000);
      res.set('Retry-After', String(retryAfter));
      const minutes = Math.max(1, Math.ceil(retryAfter / 60));
      return res.status(429).json({
        success: false,
        error: (message || 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau {minutes} phút.').replace(
          '{minutes}',
          minutes,
        ),
      });
    }
    return next();
  }

  middleware.store = hits;
  middleware.stop = () => clearInterval(sweep);
  return middleware;
}

const normalize = (value) => String(value || '').trim().toLowerCase();

// Đăng nhập: tối đa 5 lần sai liên tiếp / 15 phút cho mỗi tài khoản (đăng nhập đúng thì xoá đếm)
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  key: (req) => `login:${normalize(req.body?.username)}`,
  message: 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau {minutes} phút.',
});

// Đăng nhập theo IP: chặn password-spray (thử 1 mật khẩu trên hàng loạt tài khoản khác nhau)
const loginIpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  key: () => 'login-ip',
  message: 'Quá nhiều lần đăng nhập từ địa chỉ của bạn. Vui lòng thử lại sau {minutes} phút.',
});

// Tương tác (bình luận / đánh giá / yêu thích / tag): 30 lần / phút theo người dùng hoặc IP
const interactionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  key: (req) => `int:${req.session.user ? 'u' + req.session.user.id : req.ip}`,
  message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau {minutes} phút.',
});

// Đăng / sửa / xoá công thức: 20 lần / giờ theo người dùng
const recipeWriteLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  key: (req) => `rw:${req.session.user ? 'u' + req.session.user.id : req.ip}`,
  message: 'Bạn đã thực hiện quá nhiều thao tác với công thức. Vui lòng thử lại sau {minutes} phút.',
});

// Gửi OTP: tối đa 3 lần / 10 phút cho mỗi email
const otpSendLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 3,
  key: (req) => `otp:${normalize(req.body?.email)}`,
  message: 'Bạn đã yêu cầu mã OTP quá nhiều lần. Vui lòng thử lại sau {minutes} phút.',
});

// Đăng ký: tối đa 10 tài khoản / giờ cho mỗi IP
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  key: () => 'register',
  message: 'Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau {minutes} phút.',
});

module.exports = { createRateLimiter, loginLimiter, loginIpLimiter, otpSendLimiter, registerLimiter, interactionLimiter, recipeWriteLimiter };
