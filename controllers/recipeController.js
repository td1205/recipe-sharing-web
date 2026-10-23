const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const recipeModel = require('../repositories/recipeRepository');
const categoryModel = require('../repositories/categoryRepository');
const commentModel = require('../repositories/commentRepository');
const ratingModel = require('../repositories/ratingRepository');
const favoriteModel = require('../repositories/favoriteRepository');
async function getHomePage(req, res) {
  try {
    const search = req.query.search ? req.query.search.trim() : '';
    const maxCookTime = req.query.max_cook_time ? parseInt(req.query.max_cook_time) : null;

    let categoryId = null;
    if (req.query.category && req.query.category !== 'Tất cả') {
      const parsedCat = parseInt(req.query.category);
      if (!isNaN(parsedCat)) {
        categoryId = parsedCat;
      } else {
        const foundCat = await prisma.categories.findFirst({
          where: { name: { contains: req.query.category } }
        });
        if (foundCat) categoryId = foundCat.id;
      }
    }

    let mealTimeId = null;
    if (req.query.meal_time) {
      const parsedMeal = parseInt(req.query.meal_time);
      if (!isNaN(parsedMeal)) {
        mealTimeId = parsedMeal;
      } else {
        const foundMeal = await prisma.meal_times.findFirst({
          where: { name: { contains: req.query.meal_time } }
        });
        if (foundMeal) mealTimeId = foundMeal.id;
      }
    }
    
    // Nếu có search hoặc filter category, meal_time, hoặc max_cook_time
    if (search !== '' || categoryId !== null || mealTimeId !== null || maxCookTime !== null) {
      const [recipes, categories] = await Promise.all([
        recipeModel.getAllRecipes(search, categoryId, mealTimeId, maxCookTime),
        categoryModel.getAll(),
      ]);
      return res.json({
        success: true,
        recipes,
        categories,
        search,
        selectedCategory: categoryId,
        selectedMealTime: mealTimeId,
        selectedMaxCookTime: maxCookTime,
        user: req.session.user,
        isSearch: true
      });
    }

    // Nếu không search, trả về dữ liệu cho trang Khám phá
    const categories = await categoryModel.getAll();
    const userId = req.session.user ? req.session.user.id : null;
    
    const [latestRecipes, popularRecipes, todayRecipes, recommendedRecipes] = await Promise.all([
      recipeModel.getLatestRecipes(16),
      recipeModel.getPopularRecipes(16),
      recipeModel.getTodayRecipes(16),
      recipeModel.getRecommendedRecipes(userId, 16)
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

async function getPopularRecipes(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const allowedPeriods = ['all', 'month', 'week'];
    const period = allowedPeriods.includes(req.query.period) ? req.query.period : 'all';
    const [popularRecipes, categories] = await Promise.all([
      recipeModel.getPopularRecipes(limit, period),
      categoryModel.getAll(),
    ]);

    res.json({
      success: true,
      recipes: popularRecipes,
      categories,
      total: popularRecipes.length,
      period,
    });
  } catch (err) {
    console.error('Lỗi khi lấy công thức phổ biến:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function getAllRecipes(req, res) {
  try {
    const [recipes, categories, mealTimes] = await Promise.all([
      recipeModel.getAllRecipes(),
      categoryModel.getAll(),
      prisma.meal_times.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const publicRecipes = recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      image_url: recipe.image_url,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      created_at: recipe.created_at,
      category_id: recipe.category_id,
      meal_time_id: recipe.meal_time_id,
      author_name: recipe.author_name,
      category_name: recipe.category_name,
      meal_time_name: recipe.meal_time_name,
      avg_rating: recipe.avg_rating,
      total_ratings: recipe.total_ratings,
      view_count: recipe.view_count,
    }));

    res.json({
      success: true,
      recipes: publicRecipes,
      categories,
      mealTimes,
      total: publicRecipes.length,
    });
  } catch (err) {
    console.error('Lỗi khi lấy tất cả công thức:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function getRecipeDetail(req, res) {
  try {
    const recipeId = req.params.id;
    const recentIds = String(req.query.recent || '')
      .split(',')
      .map((id) => parseInt(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 20);
    const recipe = await recipeModel.getRecipeById(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
    const [ingredients, steps, categories, comments, rating, tags, media, relatedRecipes] =
      await Promise.all([
        recipeModel.getIngredientsByRecipeId(recipeId),
        recipeModel.getStepsByRecipeId(recipeId),
        categoryModel.getAll(),
        commentModel.getCommentsByRecipeId(recipeId),
        ratingModel.getAverageRating(recipeId),
        recipeModel.getTagsByRecipeId(recipeId),
        recipeModel.getMediaByRecipeId(recipeId),
        recipeModel.getDetailRecommendations(
          recipeId,
          req.session.user?.id || null,
          recentIds,
          16
        ),
      ]);
    let isFav = false;
    let userRating = null;
    if (req.session.user) {
      isFav = await favoriteModel.isFavorite(req.session.user.id, recipeId);
      userRating = await ratingModel.getUserRating(req.session.user.id, recipeId);
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
      userRating,
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
      video_url,
      media_urls,
      media_types,
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

    const media = [];
    if (Array.isArray(media_urls) && Array.isArray(media_types)) {
      for (let i = 0; i < media_urls.length; i++) {
        if (media_urls[i] && media_urls[i].trim() !== '') {
          media.push({
            media_url: media_urls[i].trim(),
            media_type: media_types[i] || 'image'
          });
        }
      }
    } else if (media_urls) {
      media.push({
        media_url: media_urls.trim(),
        media_type: media_types || 'image'
      });
    }

    if (video_url && video_url.trim() !== '') {
      media.push({
        media_url: video_url.trim(),
        media_type: 'video'
      });
    }

    await recipeModel.createRecipe(recipeData, ingredients, steps, media);
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
    const [ingredients, steps, categories, courseTypes, mealTimes, media] = await Promise.all([
      recipeModel.getIngredientsByRecipeId(recipeId),
      recipeModel.getStepsByRecipeId(recipeId),
      categoryModel.getAll(),
      prisma.course_types.findMany(),
      prisma.meal_times.findMany(),
      prisma.recipe_media.findMany({ where: { recipe_id: parseInt(recipeId) } })
    ]);
    res.json({
      success: true,
      recipe,
      ingredients,
      steps,
      categories,
      courseTypes,
      mealTimes,
      media,
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
      media_urls,
      media_types
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

    const media = [];
    if (Array.isArray(media_urls)) {
      for (let i = 0; i < media_urls.length; i++) {
        media.push({
          media_url: media_urls[i],
          media_type: media_types && media_types[i] ? media_types[i] : 'image',
        });
      }
    } else if (media_urls) {
      media.push({
        media_url: media_urls,
        media_type: media_types || 'image',
      });
    }

    await recipeModel.updateRecipe(recipeId, recipeData, ingredients, steps, media);
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
  getAllRecipes,
  getPopularRecipes,
  getRecipeDetail,
  getCreatePage,
  handleCreateRecipe,
  getEditPage,
  handleUpdateRecipe,
  handleDeleteRecipe,
};
