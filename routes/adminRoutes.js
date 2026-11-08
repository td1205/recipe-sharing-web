const authMiddleware = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');
const express = require('express');
const router = express.Router();
router.get(
  '/dashboard',
  authMiddleware.isAdmin,
  adminController.renderDashboard,
);
router.get(
  '/users',
  authMiddleware.isAdmin,
  adminController.renderUserManagement,
);
router.post(
  '/users/delete/:id',
  authMiddleware.isAdmin,
  adminController.handleDeleteUser,
);
router.post(
  '/users/ban/:id',
  authMiddleware.isAdmin,
  adminController.handleBanUser,
);
router.post(
  '/users/password/:id',
  authMiddleware.isAdmin,
  adminController.handleAdminChangePassword,
);
router.get(
  '/users/edit/:id',
  authMiddleware.isAdmin,
  adminController.getEditUserPage,
);
router.post(
  '/users/edit/:id',
  authMiddleware.isAdmin,
  adminController.handleEditUser,
);
module.exports = router;
