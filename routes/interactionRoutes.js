const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');
const { interactionLimiter } = require('../middlewares/rateLimit');
router.post('/recipes/:id/comments', interactionLimiter, interactionController.addComment);
router.post('/recipes/:id/rate', interactionLimiter, interactionController.addRating);
router.post('/recipes/:id/view', interactionController.recordRecipeView);
router.post('/recipes/:id/favorite', interactionLimiter, interactionController.toggleFavorite);
module.exports = router;
