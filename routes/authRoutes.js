const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../frontend/public/avatars'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
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
  upload.single('avatar'),
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
