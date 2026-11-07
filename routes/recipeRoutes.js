const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const interactionController = require('../controllers/interactionController');
const recommendationController = require('../controllers/recommendationController');
const userController = require('../controllers/userController');
const { interactionLimiter, recipeWriteLimiter } = require('../middlewares/rateLimit');
router.get('/', recipeController.getHomePage);
router.get('/recipe-cards', recipeController.getRecipeCards);

// Hệ gợi ý
router.get('/recommendations/by-ingredients', recommendationController.getByIngredients);
router.get('/recommendations/for-me', recommendationController.getForMe);
router.get('/recommendations/popular', recommendationController.getPopular);

// Hồ sơ công khai của tác giả
router.get('/users/:id/profile', userController.getPublicProfile);
router.get('/recommendations/explain', recommendationController.getExplanation);

router.get('/recipes', recipeController.getAllRecipes);
router.get('/recipes/suggest', recipeController.getSearchSuggestions);
router.get('/recipes/titles', recipeController.getRecipeTitles);
router.get('/recipes/create', recipeController.getCreatePage);
router.get('/recipes/popular', recipeController.getPopularRecipes);
router.get('/recipes/edit/:id', recipeController.getEditPage);
router.get('/recipes/:id', recipeController.getRecipeDetail);
router.post('/recipes/create', recipeWriteLimiter, recipeController.handleCreateRecipe);
router.post('/recipes/edit/:id', recipeWriteLimiter, recipeController.handleUpdateRecipe);
router.post('/recipes/delete/:id', recipeWriteLimiter, recipeController.handleDeleteRecipe);
router.delete('/recipes/:id', recipeWriteLimiter, recipeController.handleDeleteRecipe);
router.post('/recipes/:id/tags', interactionLimiter, interactionController.addTag);
module.exports = router;
