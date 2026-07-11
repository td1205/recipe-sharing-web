const express = require("express");
const router = express.Router();
const recipeController = require("../controllers/recipeController");

router.get("/", recipeController.getHomePage);
router.get("/recipes/create", recipeController.getCreatePage);
router.get("/recipes/edit/:id", recipeController.getEditPage);
router.get("/recipes/:id", recipeController.getRecipeDetail);
router.post("/recipes/create", recipeController.handleCreateRecipe);
router.post("/recipes/edit/:id", recipeController.handleUpdateRecipe);
router.post("/recipes/delete/:id", recipeController.handleDeleteRecipe);

module.exports = router;
