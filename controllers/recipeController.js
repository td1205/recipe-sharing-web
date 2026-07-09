const recipeModel = require("../models/recipeModel");

async function getHomePage(req, res) {
  try {
    const recipes = await recipeModel.getAllRecipes();
    res.render("home", { recipes, user: req.session.user });
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

    const [ingredients, steps] = await Promise.all([
      recipeModel.getIngredientsByRecipeId(recipeId),
      recipeModel.getStepsByRecipeId(recipeId)
    ]);

    res.render("recipes/detail", { recipe, ingredients, steps, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
}

module.exports = { getHomePage, getRecipeDetail };
