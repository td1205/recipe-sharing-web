const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const express = require('express');
const router = express.Router();
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
