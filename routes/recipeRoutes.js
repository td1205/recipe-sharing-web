const express = require("express");
const router = express.Router();
const recipeController = require("../controllers/recipeController");

router.get("/", recipeController.getHomePage);
router.get("/recipes/create", recipeController.getCreatePage);
router.get("/recipes/:id", recipeController.getRecipeDetail);
router.post("/recipes/create", recipeController.handleCreateRecipe);

module.exports = router;
