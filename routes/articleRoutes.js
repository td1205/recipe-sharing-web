const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/authMiddleware');
const articleController = require('../controllers/articleController');

// Public routes
router.get('/api/articles', articleController.getAll);
router.get('/api/articles/:id', articleController.getById);

// Admin routes
router.post('/api/articles', isAdmin, articleController.create);
router.put('/api/articles/:id', isAdmin, articleController.update);
router.delete('/api/articles/:id', isAdmin, articleController.remove);

module.exports = router;
