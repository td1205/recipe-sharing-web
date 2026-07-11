const recipeModel = require("../models/recipeModel");
const categoryModel = require("../models/categoryModel");

async function getHomePage(req, res) {
  try {
    const [recipes, categories] = await Promise.all([
      recipeModel.getAllRecipes(),
      categoryModel.getAll()
    ]);
    res.render("home", { recipes, categories, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
}

async function getRecipeDetail(req, res) {
  try {
    const recipeId = req.params.id;
    const recipe = await recipeModel.getRecipeById(recipeId);
    
    if (!recipe) {
      return res.status(404).send("Recipe not found");
    }

    const [ingredients, steps, categories] = await Promise.all([
      recipeModel.getIngredientsByRecipeId(recipeId),
      recipeModel.getStepsByRecipeId(recipeId),
      categoryModel.getAll()
    ]);

    res.render("recipes/detail", { recipe, ingredients, steps, categories, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
}

module.exports = { getHomePage, getRecipeDetail };
