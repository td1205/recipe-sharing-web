const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const recipeModel = require('../repositories/recipeRepository');
const categoryModel = require('../repositories/categoryRepository');
const commentModel = require('../repositories/commentRepository');
const ratingModel = require('../repositories/ratingRepository');
const favoriteModel = require('../repositories/favoriteRepository');
async function getHomePage(req, res) {
  try {
    const search = req.query.search || '';
    const categoryId = req.query.category ? parseInt(req.query.category) : null;
    const mealTimeId = req.query.meal_time ? parseInt(req.query.meal_time) : null;
    
    // Nếu có search hoặc filter category, hoặc meal_time chỉ trả về kết quả tìm kiếm thông thường
    if (search !== '' || categoryId !== null || mealTimeId !== null) {
      const [recipes, categories] = await Promise.all([
        recipeModel.getAllRecipes(search, categoryId, mealTimeId),
        categoryModel.getAll(),
      ]);
      return res.json({
        success: true,
        recipes,
        categories,
        search,
        selectedCategory: categoryId,
        selectedMealTime: mealTimeId,
        user: req.session.user,
        isSearch: true
      });
    }

    // Nếu không search, trả về dữ liệu cho trang Khám phá
    const categories = await categoryModel.getAll();
    const userId = req.session.user ? req.session.user.id : null;
    
    const [latestRecipes, popularRecipes, todayRecipes, recommendedRecipes] = await Promise.all([
      recipeModel.getLatestRecipes(12),
      recipeModel.getPopularRecipes(12),
      recipeModel.getTodayRecipes(12),
      recipeModel.getRecommendedRecipes(userId, 12)
    ]);

    res.json({
      success: true,
      latestRecipes,
      popularRecipes,
      todayRecipes,
      recommendedRecipes,
      categories,
      search,
      selectedCategory: categoryId,
      user: req.session.user,
      isSearch: false
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}
async function getRecipeDetail(req, res) {
  try {
    const recipeId = req.params.id;
    const recipe = await recipeModel.getRecipeById(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
    const [ingredients, steps, categories, comments, rating, tags, media] =
      await Promise.all([
        recipeModel.getIngredientsByRecipeId(recipeId),
        recipeModel.getStepsByRecipeId(recipeId),
        categoryModel.getAll(),
        commentModel.getCommentsByRecipeId(recipeId),
        ratingModel.getAverageRating(recipeId),
        recipeModel.getTagsByRecipeId(recipeId),
        recipeModel.getMediaByRecipeId(recipeId),
      ]);
    let isFav = false;
    if (req.session.user) {
      isFav = await favoriteModel.isFavorite(req.session.user.id, recipeId);
    }

    // Fetch related recipes
    let relatedRecipes = [];
    if (recipe.category_id) {
      const allRelated = await recipeModel.getAllRecipes('', recipe.category_id, null);
      relatedRecipes = allRelated.filter(r => r.id !== recipe.id).slice(0, 4);
    }

    // Fallback: If not enough related recipes, fill with random recipes
    if (relatedRecipes.length < 4) {
      const pool = await recipeModel.getLatestRecipes(30);
      
      // Shuffle pool
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      for (const p of pool) {
        if (relatedRecipes.length >= 4) break;
        if (p.id !== recipe.id && !relatedRecipes.find(r => r.id === p.id)) {
          relatedRecipes.push(p);
        }
      }
    }

    res.json({
      success: true,
      recipe,
      ingredients,
      steps,
      categories,
      comments,
      rating,
      tags,
      media,
      isFav,
      user: req.session.user,
      relatedRecipes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}
async function getCreatePage(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const [categories, courseTypes, mealTimes] = await Promise.all([
      categoryModel.getAll(),
      prisma.course_types.findMany(),
      prisma.meal_times.findMany()
    ]);
    res.json({ success: true, categories, courseTypes, mealTimes, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}
async function handleCreateRecipe(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const {
      title,
      description,
      prep_time,
      cook_time,
      servings,
      image_url,
      category_id,
      meal_time,
      course_type,
    } = req.body;
    const recipeData = {
      user_id: req.session.user.id,
      category_id: parseInt(category_id),
      title,
      description,
      prep_time: parseInt(prep_time) || 0,
      cook_time: parseInt(cook_time) || 0,
      servings: parseInt(servings) || 1,
      image_url,
      meal_time_id: parseInt(req.body.meal_time_id) || null,
      course_type_id: parseInt(req.body.course_type_id) || null,
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
          unit: ingUnits[i],
        });
      }
    } else if (ingNames) {
      ingredients.push({
        name: ingNames,
        amount: ingAmounts,
        unit: ingUnits,
      });
    }
    const stepInstructions = req.body.step_instruction;
    const steps = [];
    if (Array.isArray(stepInstructions)) {
      for (let i = 0; i < stepInstructions.length; i++) {
        steps.push({
          step_number: i + 1,
          instruction: stepInstructions[i],
        });
      }
    } else if (stepInstructions) {
      steps.push({
        step_number: 1,
        instruction: stepInstructions,
      });
    }
    await recipeModel.createRecipe(recipeData, ingredients, steps);
    res.json({ success: true, message: 'Recipe created' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}
async function getEditPage(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = req.params.id;
    const recipe = await recipeModel.getRecipeById(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
    if (
      recipe.user_id !== req.session.user.id &&
      req.session.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const [ingredients, steps, categories, courseTypes, mealTimes] = await Promise.all([
      recipeModel.getIngredientsByRecipeId(recipeId),
      recipeModel.getStepsByRecipeId(recipeId),
      categoryModel.getAll(),
      prisma.course_types.findMany(),
      prisma.meal_times.findMany()
    ]);
    res.json({
      success: true,
      recipe,
      ingredients,
      steps,
      categories,
      courseTypes,
      mealTimes,
      user: req.session.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}
async function handleUpdateRecipe(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = req.params.id;
    const recipe = await recipeModel.getRecipeById(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
    if (
      recipe.user_id !== req.session.user.id &&
      req.session.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const {
      title,
      description,
      prep_time,
      cook_time,
      servings,
      image_url,
      category_id,
      meal_time,
      course_type,
    } = req.body;
    const recipeData = {
      category_id: parseInt(category_id),
      title,
      description,
      prep_time: parseInt(prep_time) || 0,
      cook_time: parseInt(cook_time) || 0,
      servings: parseInt(servings) || 1,
      image_url,
      meal_time_id: parseInt(req.body.meal_time_id) || null,
      course_type_id: parseInt(req.body.course_type_id) || null,
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
          unit: ingUnits[i],
        });
      }
    } else if (ingNames) {
      ingredients.push({
        name: ingNames,
        amount: ingAmounts,
        unit: ingUnits,
      });
    }
    const stepInstructions = req.body.step_instruction;
    const steps = [];
    if (Array.isArray(stepInstructions)) {
      for (let i = 0; i < stepInstructions.length; i++) {
        steps.push({
          step_number: i + 1,
          instruction: stepInstructions[i],
        });
      }
    } else if (stepInstructions) {
      steps.push({
        step_number: 1,
        instruction: stepInstructions,
      });
    }
    await recipeModel.updateRecipe(recipeId, recipeData, ingredients, steps);
    res.json({ success: true, message: 'Recipe updated' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}
async function handleDeleteRecipe(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = req.params.id;
    const recipe = await recipeModel.getRecipeById(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
    if (
      recipe.user_id !== req.session.user.id &&
      req.session.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    await recipeModel.deleteRecipe(recipeId);
    res.json({ success: true, message: 'Recipe deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}
module.exports = {
  getHomePage,
  getRecipeDetail,
  getCreatePage,
  handleCreateRecipe,
  getEditPage,
  handleUpdateRecipe,
  handleDeleteRecipe,
};
