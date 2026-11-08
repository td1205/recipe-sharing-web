const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { loginLimiter, loginIpLimiter, otpSendLimiter, registerLimiter } = require('../middlewares/rateLimit');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Avatar được lưu ở uploads/avatars (ngoài thư mục frontend) và được app.js
// phục vụ tại /avatars, nên hoạt động cả khi chạy dev lẫn bản build production.
const AVATAR_DIR = path.join(__dirname, '../uploads/avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, AVATAR_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Lấy đuôi file theo MIME type thay vì tên file người dùng gửi lên
    cb(null, 'avatar-' + uniqueSuffix + ALLOWED_IMAGE_TYPES[file.mimetype]);
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // tối đa 2MB
  fileFilter: function (req, file, cb) {
    if (ALLOWED_IMAGE_TYPES[file.mimetype]) return cb(null, true);
    cb(new Error('INVALID_FILE_TYPE'));
  },
}).single('avatar');

// Kiểm tra "chữ ký" (magic bytes) của file: MIME type client tự khai báo có thể bị giả mạo.
async function verifyImageMagic(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const { buffer } = await handle.read(Buffer.alloc(12), 0, 12, 0);
    const startsWith = (bytes) => bytes.every((b, i) => buffer[i] === b);
    const ascii = buffer.toString('latin1');
    return (
      startsWith([0xff, 0xd8, 0xff]) || // JPEG
      startsWith([0x89, 0x50, 0x4e, 0x47]) || // PNG
      ascii.startsWith('GIF8') || // GIF87a / GIF89a
      (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') // WEBP
    );
  } finally {
    await handle.close();
  }
}

// Bọc multer để lỗi upload trả về JSON 400 thay vì trang lỗi HTML,
// đồng thời xác thực magic bytes trước khi cho đi tiếp
function uploadAvatar(req, res, next) {
  multerUpload(req, res, async (err) => {
    if (!err && req.file) {
      let isImage = false;
      try {
        isImage = await verifyImageMagic(req.file.path);
      } catch (readErr) {
        console.error('Lỗi đọc file ảnh tải lên:', readErr);
      }
      if (!isImage) {
        fs.promises.unlink(req.file.path).catch(() => {});
        return res
          .status(400)
          .json({ success: false, error: 'Tệp tải lên không phải ảnh hợp lệ!' });
      }
      return next();
    }
    if (!err) return next();
    let message = 'Lỗi tải ảnh lên!';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Ảnh đại diện tối đa 2MB!';
    else if (err.message === 'INVALID_FILE_TYPE')
      message = 'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF!';
    return res.status(400).json({ success: false, error: message });
  });
}
router.post('/auth/token', loginIpLimiter, loginLimiter, authController.issueToken);
router.get('/auth/me', authMiddleware.isAuthenticated, authController.me);

router.get('/login', authController.getLoginPage);
// Count every attempt by IP; keep the account limiter last so success resets only it.
router.post('/login', loginIpLimiter, loginLimiter, authController.handleLogin);
router.get('/register', authController.getRegisterPage);
router.post('/register', registerLimiter, authController.handleRegister);
router.get('/logout', (_req, res) => res.status(405).set('Allow', 'POST').json({ success: false, error: 'Vui lòng sử dụng POST để đăng xuất' }));
router.post('/logout', authController.logout); // POST: dùng ở frontend, tránh CSRF qua GET
router.get(
  '/profile',
  authMiddleware.isAuthenticated,
  authController.renderProfile,
);
router.get('/forgot-password', authController.getForgotPasswordPage);
router.post('/forgot-password', otpSendLimiter, authController.handleForgotPassword);
router.get(
  '/profile/edit',
  authMiddleware.isAuthenticated,
  authController.getEditProfilePage,
);
router.post(
  '/profile/edit',
  authMiddleware.isAuthenticated,
  uploadAvatar,
  authController.handleEditProfile,
);
router.get(
  '/change-password',
  authMiddleware.isOTP,
  authController.getChangePasswordPage,
);
router.post(
  '/change-password',
  authMiddleware.isOTP,
  authController.handleChangePassword,
);
router.get('/otp', authMiddleware.isEmail, authController.getOTPPage);
router.post('/otp', authMiddleware.isEmail, authController.handleOTP);
module.exports = router;
