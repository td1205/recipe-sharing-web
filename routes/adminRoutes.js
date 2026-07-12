const authMiddleware = require("../middlewares/authMiddleware");
const adminController = require("../controllers/adminController");
const express = require("express");
const router = express.Router();
router.get(
  "/dashboard",
  authMiddleware.isAdmin,
  adminController.renderDashboard,
);
router.get(
  "/users",
  authMiddleware.isAdmin,
  adminController.renderUserManagement,
);
router.post(
  "/users/delete/:id",
  authMiddleware.isAdmin,
  adminController.handleDeleteUser,
);
module.exports = router;
