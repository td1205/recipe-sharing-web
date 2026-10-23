const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
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

// Bọc multer để lỗi upload trả về JSON 400 thay vì trang lỗi HTML
function uploadAvatar(req, res, next) {
  multerUpload(req, res, (err) => {
    if (!err) return next();
    let message = 'Lỗi tải ảnh lên!';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Ảnh đại diện tối đa 2MB!';
    else if (err.message === 'INVALID_FILE_TYPE')
      message = 'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF!';
    return res.status(400).json({ success: false, error: message });
  });
}
router.get('/login', authController.getLoginPage);
router.post('/login', authController.handleLogin);
router.get('/register', authController.getRegisterPage);
router.post('/register', authController.handleRegister);
router.get('/logout', authController.logout);
router.get(
  '/profile',
  authMiddleware.isAuthenticated,
  authController.renderProfile,
);
router.get('/forgot-password', authController.getForgotPasswordPage);
router.post('/forgot-password', authController.handleForgotPassword);
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
