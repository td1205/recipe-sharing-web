const multer = require('multer');
const geminiService = require('../services/geminiService');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Lưu ảnh trong RAM, chỉ để gửi sang Gemini rồi bỏ
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // tối đa 5MB
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('INVALID_FILE_TYPE'));
  },
}).single('image');

const STATUS_BY_CODE = {
  NOT_CONFIGURED: 503,
  NOT_FOOD: 422,
  INVALID_KEY: 502,
  QUOTA_EXCEEDED: 429,
  OVERLOADED: 503,
  FAILED: 502,
};

function handleScanImage(req, res) {
  upload(req, res, async (err) => {
    if (err) {
      let error = 'Lỗi tải ảnh lên!';
      if (err.code === 'LIMIT_FILE_SIZE') error = 'Ảnh tối đa 5MB!';
      else if (err.message === 'INVALID_FILE_TYPE') error = 'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc HEIC!';
      return res.status(400).json({ success: false, error });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp hình ảnh!' });
    }

    try {
      const { keyword } = await geminiService.recognizeDish(req.file.buffer, req.file.mimetype);
      return res.json({ success: true, keyword });
    } catch (error) {
      const status = STATUS_BY_CODE[error.code] || 500;
      const retryAfterSeconds = Number.isSafeInteger(error.retryAfterSeconds)
        ? error.retryAfterSeconds
        : undefined;
      if (status === 500) console.error('Lỗi nhận diện ảnh:', error);
      if (retryAfterSeconds) res.set('Retry-After', String(retryAfterSeconds));
      return res.status(status).json({
        success: false,
        code: error.code || 'FAILED',
        error: error.code ? error.message : 'Lỗi hệ thống khi nhận diện ảnh.',
        ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      });
    }
  });
}

module.exports = { handleScanImage };
