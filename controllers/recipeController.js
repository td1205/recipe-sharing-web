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

async function getCreatePage(req, res) {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    const categories = await categoryModel.getAll();
    res.render("recipes/create", { categories, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
}

async function handleCreateRecipe(req, res) {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const { title, description, prep_time, cook_time, servings, image_url, category_id } = req.body;
    
    const recipeData = {
      user_id: req.session.user.id,
      category_id: parseInt(category_id),
      title,
      description,
      prep_time: parseInt(prep_time) || 0,
      cook_time: parseInt(cook_time) || 0,
      servings: parseInt(servings) || 1,
      image_url
    };

    const ingNames = req.body.ing_name;
    const ingAmounts = req.body.ing_amount;
    const ingUnits = req.body.ing_unit;
    const ingredients = [];

    if (Array.isArray(ingNames)) {
      for (let i = 0; i < ingNames.length; i++) {
        ingredients.push({
          name: ingNames[i],
          amount: ingAmounts[i],
          unit: ingUnits[i]
        });
      }
    } else if (ingNames) {
      ingredients.push({
        name: ingNames,
        amount: ingAmounts,
        unit: ingUnits
      });
    }

    const stepInstructions = req.body.step_instruction;
    const steps = [];

    if (Array.isArray(stepInstructions)) {
      for (let i = 0; i < stepInstructions.length; i++) {
        steps.push({
          step_number: i + 1,
          instruction: stepInstructions[i]
        });
      }
    } else if (stepInstructions) {
      steps.push({
        step_number: 1,
        instruction: stepInstructions
      });
    }

    await recipeModel.createRecipe(recipeData, ingredients, steps);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
}

module.exports = { getHomePage, getRecipeDetail, getCreatePage, handleCreateRecipe }
