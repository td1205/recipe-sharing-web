const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { createRateLimiter } = require('../middlewares/rateLimit');

// Giới hạn 5 lần quét / 10 phút cho mỗi IP để tránh spam Gemini API
const scanLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  key: (req) => `scan:${req.ip}`,
  message: 'Bạn đã quét quá nhiều lần. Vui lòng thử lại sau {minutes} phút.',
});

// Route API
router.post('/scan-image', scanLimiter, aiController.handleScanImage);

module.exports = router;