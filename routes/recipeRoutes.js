const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const interactionController = require('../controllers/interactionController');
const recommendationController = require('../controllers/recommendationController');
const userController = require('../controllers/userController');
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
router.get('/recipes/create', recipeController.getCreatePage);
router.get('/recipes/popular', recipeController.getPopularRecipes);
router.get('/recipes/edit/:id', recipeController.getEditPage);
router.get('/recipes/:id', recipeController.getRecipeDetail);
router.post('/recipes/create', recipeController.handleCreateRecipe);
router.post('/recipes/edit/:id', recipeController.handleUpdateRecipe);
router.post('/recipes/delete/:id', recipeController.handleDeleteRecipe);
router.post('/recipes/:id/tags', interactionController.addTag);
router.post('/recipes/:id/comments', interactionController.addComment);
router.post('/recipes/:id/rate', interactionController.addRating);
module.exports = router;
