const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Route API
router.post('/scan-image', aiController.handleScanImage);

module.exports = router;
