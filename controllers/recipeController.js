const validation = require('../utils/apiValidation');
const prisma = require('../config/prisma');
const recipeModel = require('../repositories/recipeRepository');
const categoryModel = require('../repositories/categoryRepository');
const commentModel = require('../repositories/commentRepository');
const ratingModel = require('../repositories/ratingRepository');
const favoriteModel = require('../repositories/favoriteRepository');
const recommender = require('../services/recommender');
const { getRecipeCardsByIds } = require('../repositories/recommendationRepository');
const { validateRecipeInput } = require('../utils/recipeValidation');

// Nếu hệ gợi ý mới lỗi (vd chưa dựng xong mô hình) thì dùng cách cũ, trang vẫn hiển thị được
function withFallback(promise, fallback, label) {
  return promise.catch((err) => {
    console.error(`[recommender] ${label} lỗi, dùng cách cũ:`, err.message);
    return fallback();
  });
}
async function getHomePage(req, res) {
  try {
    validation.listingQuery(req.query);
    const search = validation.text(req.query.search, 'search', 200, false);
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
      withFallback(recommender.popularRecipes(16), () => recipeModel.getPopularRecipes(16), 'popular'),
      recipeModel.getTodayRecipes(16),
      withFallback(
        recommender.recommendForUser(userId, 16),
        () => recipeModel.getRecommendedRecipes(userId, 16),
        'recommendForUser',
      ),
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
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err);
  }
}

async function getPopularRecipes(req, res) {
  try {
    const limit = validation.integer(req.query.limit, 'limit', 50, 1, 100);
    const allowedPeriods = ['all', 'month', 'week'];
    const period = req.query.period || 'all';
    if (!allowedPeriods.includes(period)) throw Object.assign(new Error('period không hợp lệ'), { status: 400 });
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
    console.error('Lỗi khi lấy công thức phổ biến:', err.code || err.name);
    return validation.apiError(res, err);
  }
}

async function getAllRecipes(req, res) {
  try {
    if (req.query.page !== undefined || req.query.limit !== undefined) {
      const query = validation.listingQuery(req.query);
      const [listing, categories, mealTimes] = await Promise.all([
        require('../repositories/recipeListingRepository').getPage(query), categoryModel.getAll(),
        prisma.meal_times.findMany({ orderBy: { name: 'asc' } }),
      ]);
      return res.json({ success: true, ...listing, categories, mealTimes });
    }
    validation.listingQuery(req.query);
    // Cap độ dài từ khoá để truy vấn không thể phình to (B2)
    const search = String(req.query.search || '').trim().slice(0, 200);
    // Chỉ nhận category/meal_time dạng số; dạng tên để frontend tự lọc
    const numeric = (v) => (/^\d+$/.test(String(v || '')) ? parseInt(v, 10) : null);
    const [recipes, categories, mealTimes] = await Promise.all([
      recipeModel.getAllRecipes(
        search,
        numeric(req.query.category),
        numeric(req.query.meal_time),
        numeric(req.query.max_cook_time),
      ),
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
      // Tên nguyên liệu (cho tìm kiếm phía client khớp với phạm vi tìm server)
      ingredient_names: (recipe.ingredients || []).map((item) => item.name),
      // tag của món (dùng cho bộ lọc ?tag= ở trang danh sách, vd "thịt gà", "hải sản")
      // gồm tag tác giả gắn (recipe_tags) và tag cộng đồng bình chọn (user_tag_votes)
      tag_names: [
        ...new Set(
          [...(recipe.recipe_tags || []), ...(recipe.user_tag_votes || [])]
            .map((item) => item.tags?.name)
            .filter(Boolean),
        ),
      ],
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
    console.error('Lỗi khi lấy tất cả công thức:', err.code || err.name);
    return validation.apiError(res, err);
  }
}

// Gợi ý tìm kiếm (typeahead)
async function getSearchSuggestions(req, res) {
  try {
    const suggestions = await recipeModel.getSearchSuggestions(validation.text(req.query.q, 'q', 100, false));
    return res.json({ success: true, suggestions });
  } catch (err) {
    console.error('Lỗi gợi ý tìm kiếm:', err.code || err.name);
    return validation.apiError(res, err);
  }
}

// Danh sách tiêu đề cho typeahead (client tự lọc)
async function getRecipeTitles(req, res) {
  try {
    const titles = await recipeModel.getAllRecipeTitles();
    return res.json({ success: true, titles });
  } catch (err) {
    console.error('Lỗi lấy tiêu đề gợi ý:', err.code || err.name);
    return validation.apiError(res, err);
  }
}

async function getRecipeDetail(req, res) {
  try {
    const recipeId = validation.id(req.params.id);
    const recentIds = validation.text(req.query.recent, 'recent', 300, false)
      .split(',')
      .filter(Boolean)
      .map((id) => validation.id(id))
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
        withFallback(
          recommender.similarRecipes(recipeId, 16),
          () => recipeModel.getDetailRecommendations(recipeId, req.session.user?.id || null, recentIds, 16),
          'similarRecipes',
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
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err);
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
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err);
  }
}
// Kiểm tra các id tham chiếu (danh mục, bữa ăn, loại món) có tồn tại trong DB
async function findMissingReferences(recipe) {
  const errors = [];
  const [category, mealTime, courseType] = await Promise.all([
    prisma.categories.findUnique({ where: { id: recipe.category_id }, select: { id: true } }),
    recipe.meal_time_id ? prisma.meal_times.findUnique({ where: { id: recipe.meal_time_id }, select: { id: true } }) : true,
    recipe.course_type_id ? prisma.course_types.findUnique({ where: { id: recipe.course_type_id }, select: { id: true } }) : true,
  ]);
  if (!category) errors.push('Danh mục không tồn tại.');
  if (!mealTime) errors.push('Bữa ăn không tồn tại.');
  if (!courseType) errors.push('Loại món không tồn tại.');
  return errors;
}

// Đọc + kiểm tra dữ liệu gửi lên; trả về null nếu đã trả lỗi 400 cho client
async function readRecipeInput(req, res) {
  const { errors, data } = validateRecipeInput(req.body);
  if (errors.length === 0) errors.push(...(await findMissingReferences(data.recipe)));
  if (errors.length > 0) {
    res.status(400).json({ success: false, message: errors[0], errors });
    return null;
  }
  return data;
}

async function handleCreateRecipe(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const input = await readRecipeInput(req, res);
    if (!input) return;

    const recipeId = await recipeModel.createRecipe(
      { ...input.recipe, user_id: req.session.user.id },
      input.ingredients,
      input.steps,
      input.media,
      input.tags,
    );

    res.status(201).json({ success: true, message: 'Recipe created', recipeId });
  } catch (err) {
    console.error('Lỗi đăng công thức:', err.code || err.name);
    return validation.apiError(res, err);
  }
}
async function getEditPage(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = validation.id(req.params.id);
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
    const [ingredients, steps, categories, courseTypes, mealTimes, media, tags] = await Promise.all([
      recipeModel.getIngredientsByRecipeId(recipeId),
      recipeModel.getStepsByRecipeId(recipeId),
      categoryModel.getAll(),
      prisma.course_types.findMany(),
      prisma.meal_times.findMany(),
      prisma.recipe_media.findMany({ where: { recipe_id: parseInt(recipeId) } }),
      recipeModel.getRecipeTagNames(recipeId),
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
      tags,
      user: req.session.user,
    });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err);
  }
}
async function handleUpdateRecipe(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = validation.id(req.params.id);
    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
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
    const input = await readRecipeInput(req, res);
    if (!input) return;

    await recipeModel.updateRecipe(recipeId, input.recipe, input.ingredients, input.steps, input.media, input.tags);
    res.json({ success: true, message: 'Recipe updated', recipeId });
  } catch (err) {
    console.error('Lỗi cập nhật công thức:', err.code || err.name);
    return validation.apiError(res, err);
  }
}
async function handleDeleteRecipe(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = validation.id(req.params.id);
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
    if (req.session.user.role === 'admin') {
      await require('../repositories/moderationRepository').deleteContent('recipe', recipeId, req.session.user.id);
    } else {
      await recipeModel.deleteRecipe(recipeId);
    }
    res.json({ success: true, message: 'Recipe deleted' });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err);
  }
}
// GET /api/recipe-cards?ids=3,1,2 -> thông tin thẻ món theo đúng thứ tự, bỏ qua món đã bị xóa.
// Dùng để làm mới danh sách "Xem gần đây" (lưu ở trình duyệt) theo dữ liệu hiện tại.
async function getRecipeCards(req, res) {
  try {
    const ids = validation.text(req.query.ids, 'ids', 400, false)
      .split(',')
      .filter(Boolean)
      .map((id) => validation.id(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 30);
    const cards = await getRecipeCardsByIds(ids);
    res.json({
      success: true,
      recipes: cards.map(({ id, title, image_url: imageUrl, category_name: categoryName }) => ({
        id,
        title,
        image_url: imageUrl,
        category_name: categoryName,
      })),
    });
  } catch (err) {
    console.error('Lỗi lấy thẻ món:', err.code || err.name);
    return validation.apiError(res, err);
  }
}

module.exports = {
  getRecipeCards,
  getHomePage,
  getAllRecipes,
  getSearchSuggestions,
  getRecipeTitles,
  getPopularRecipes,
  getRecipeDetail,
  getCreatePage,
  handleCreateRecipe,
  getEditPage,
  handleUpdateRecipe,
  handleDeleteRecipe,
};
