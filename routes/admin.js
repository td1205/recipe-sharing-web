const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/authMiddleware');
const interactionController = require('../controllers/interactionController');

router.get('/comments', isAdmin, interactionController.adminComments);
// Frontend (pages/admin/Comments.jsx) gọi DELETE /api/admin/comments/:id
router.delete('/comments/:id', isAdmin, interactionController.deleteComment);
// Giữ route cũ để tương thích
router.post('/comments/delete/:id', isAdmin, interactionController.deleteComment);

module.exports = router;
