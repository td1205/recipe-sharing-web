const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');

// Public routes
router.get('/api/articles', articleController.getAll);
router.get('/api/articles/:id', articleController.getById);

// Admin APIs (we should add middleware for admin check, but for now we trust session)
router.post('/api/articles', articleController.create);
router.put('/api/articles/:id', articleController.update);
router.delete('/api/articles/:id', articleController.remove);

module.exports = router;
