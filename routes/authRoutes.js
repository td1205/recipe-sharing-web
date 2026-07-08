const authController = require("../controllers/authController")
const express = require("express");
const router = express.Router();
router.get("/login", authController.getLoginPage);
router.post("/login", authController.handleLogin);
router.get("/register", authController.getRegisterPage);
router.post("/register", authController.handleRegister);
router.get("/logout", authController.logout);
module.exports = router;