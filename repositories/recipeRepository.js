const prisma = require('../config/prisma');
const { PUBLIC_USER_SELECT } = require('../utils/userSelect');
const { rankRecommendations } = require('../services/recommendationService');

function getPopularityPeriodStart(period) {
  const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : null;
  return periodDays ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) : null;
}

function normalizeLog(value, maximum) {
  return maximum > 0 ? Math.log1p(value) / Math.log1p(maximum) : 0;
}

const Recipe = {
  async getAllRecipes(search = '', categoryId = null, mealTimeId = null, maxCookTime = null) {
    const where = {};
    const searchString = search.trim();
    let keywords = [];

    if (searchString !== '') {
      // Split into keywords
      keywords = searchString.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      
      if (keywords.length > 0) {
        // Find recipes matching at least ONE keyword
        const orConditions = [];
        for (const kw of keywords) {
          orConditions.push({ title: { contains: kw } });
          orConditions.push({ description: { contains: kw } });
        }
        where.OR = orConditions;
      }
    }
    
    if (categoryId) {
      where.category_id = parseInt(categoryId);
    }

    if (mealTimeId) {
      where.meal_time_id = parseInt(mealTimeId);
    }

    if (maxCookTime) {
      where.cook_time = { lte: parseInt(maxCookTime) };
    }

    let recipes = await prisma.recipes.findMany({
      where,
      include: {
        users: { select: PUBLIC_USER_SELECT },
        categories: true,
        ratings: true,
        meal_times: true,
        recipe_media: true,
        _count: { select: { recipe_views: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // Apply Scoring if searching
    if (keywords.length > 0) {
      const searchLower = searchString.toLowerCase();
      
      recipes = recipes.map(r => {
        let score = 0;
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();

        // Tier 1: Exact match
        if (title.includes(searchLower)) {
          score += 100;
        } else if (desc.includes(searchLower)) {
          score += 80;
        }

        // Count individual word matches
        let matchedKeywords = 0;
        for (const kw of keywords) {
          if (title.includes(kw) || desc.includes(kw)) {
            matchedKeywords++;
          }
        }

        // Tier 2: All words exist but not in exact order
        if (matchedKeywords === keywords.length && score < 80) {
          score += 50; 
        }

        // Tier 3: Partial matches
        score += (matchedKeywords / keywords.length) * 30;

        return { ...r, _score: score };
      });

      // Sort by score DESC, then created_at DESC
      recipes.sort((a, b) => {
        if (b._score !== a._score) {
          return b._score - a._score;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }

    // Định dạng lại dữ liệu giống với SQL cũ
    return recipes.map((r) => {
      const totalRatings = r.ratings ? r.ratings.length : 0;
      const avgRating =
        totalRatings > 0
          ? r.ratings.reduce((sum, cur) => sum + cur.star_count, 0) /
            totalRatings
          : 0;

      let video_url = null;
      if (r.recipe_media) {
        const videoMedia = r.recipe_media.find(m => m.media_type === 'video');
        if (videoMedia) video_url = videoMedia.media_url;
      }

      return {
        ...r,
        author_name: r.users?.fullname || r.users?.username,
        category_name: r.categories?.name,
        avg_rating: avgRating,
        total_ratings: totalRatings,
        view_count: r._count?.recipe_views || 0,
        search_score: r._score || 0, // Optional: expose score for debugging
        meal_time_name: r.meal_times?.name,
        video_url,
      };
    });
  },

  async getRecipeById(id) {
    const recipe = await prisma.recipes.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: { select: PUBLIC_USER_SELECT },
        categories: true,
        ratings: true,
        meal_times: true,
        course_types: true,
        _count: { select: { recipe_views: true } },
      },
    });

    if (!recipe) return null;
    
    const totalRatings = recipe.ratings ? recipe.ratings.length : 0;
    const avgRating = totalRatings > 0 ? recipe.ratings.reduce((sum, cur) => sum + cur.star_count, 0) / totalRatings : 0;

    return {
      ...recipe,
      author_name: recipe.users?.fullname || recipe.users?.username,
      category_name: recipe.categories?.name,
      avg_rating: avgRating,
      total_ratings: totalRatings,
      view_count: recipe._count?.recipe_views || 0,
      meal_time_name: recipe.meal_times?.name,
      course_type_name: recipe.course_types?.name,
    };
  },

  async getLatestRecipes(limit = 16) {
    const recipes = await prisma.recipes.findMany({
      take: limit,
      include: {
        users: { select: PUBLIC_USER_SELECT },
        categories: true,
        ratings: true,
        meal_times: true,
        recipe_media: true,
        _count: { select: { recipe_views: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return this._formatRecipes(recipes);
  },

  async getPopularRecipes(limit = 50, period = 'all') {
    const periodStart = getPopularityPeriodStart(period);
    const interactionDateFilter = periodStart ? { created_at: { gte: periodStart } } : undefined;
    const viewDateFilter = periodStart ? { viewed_at: { gte: periodStart } } : undefined;
    const recipes = await prisma.recipes.findMany({
      include: {
        users: { select: PUBLIC_USER_SELECT },
        categories: true,
        meal_times: true,
        recipe_media: true,
        ratings: interactionDateFilter ? { where: interactionDateFilter } : true,
        favorites: interactionDateFilter ? { where: interactionDateFilter } : true,
        comments: interactionDateFilter ? { where: interactionDateFilter } : true,
        recipe_views: viewDateFilter ? { where: viewDateFilter } : true,
      },
    });

    const formatted = this._formatRecipes(recipes).map((recipe) => {
      const {
        recipe_views: recipeViews = [],
        favorites = [],
        comments = [],
        ...publicRecipe
      } = recipe;

      return {
        ...publicRecipe,
        view_count: recipeViews.length,
        favorite_count: favorites.length,
        comment_count: comments.length,
      };
    });

    const maximumViews = Math.max(0, ...formatted.map((recipe) => recipe.view_count));
    const maximumFavorites = Math.max(0, ...formatted.map((recipe) => recipe.favorite_count));
    const maximumComments = Math.max(0, ...formatted.map((recipe) => recipe.comment_count));
    const ratingPrior = 3.5;
    const ratingPriorWeight = 5;

    const rankedRecipes = formatted.map((recipe) => {
      const bayesianRating = (
        recipe.total_ratings * recipe.avg_rating + ratingPriorWeight * ratingPrior
      ) / (recipe.total_ratings + ratingPriorWeight);
      const popularityScore =
        0.45 * normalizeLog(recipe.view_count, maximumViews) +
        0.25 * normalizeLog(recipe.favorite_count, maximumFavorites) +
        0.20 * (bayesianRating / 5) +
        0.10 * normalizeLog(recipe.comment_count, maximumComments);

      return {
        ...recipe,
        bayesian_rating: bayesianRating,
        popularity_score: popularityScore,
      };
    });

    rankedRecipes.sort((recipeA, recipeB) => {
      if (recipeB.popularity_score !== recipeA.popularity_score) {
        return recipeB.popularity_score - recipeA.popularity_score;
      }
      if (recipeB.view_count !== recipeA.view_count) {
        return recipeB.view_count - recipeA.view_count;
      }
      return new Date(recipeB.created_at) - new Date(recipeA.created_at);
    });

    return rankedRecipes.slice(0, limit);
  },

  async getTodayRecipes(limit = 16) {
    const hour = new Date().getHours();
    let mealTime = '';
    if (hour >= 5 && hour < 11) mealTime = 'Sáng';
    else if (hour >= 11 && hour < 17) mealTime = 'Trưa';
    else mealTime = 'Tối';

    const recipes = await prisma.recipes.findMany({
      where: {
        OR: [
          { meal_times: { name: mealTime } },
          { meal_time_id: null }
        ]
      },
      take: limit,
      include: { users: { select: PUBLIC_USER_SELECT }, categories: true, ratings: true, meal_times: true, recipe_media: true },
      orderBy: { created_at: 'desc' },
    });
    return this._formatRecipes(recipes);
  },

  async getRecommendedRecipes(userId = null, limit = 16) {
    if (!userId) return this.getPopularRecipes(limit);

    // Get user's favorites to find favorite category
    const favorites = await prisma.favorites.findMany({
      where: { user_id: parseInt(userId) },
      include: { recipes: true }
    });

    if (favorites.length === 0) return this.getPopularRecipes(limit);

    const categoryCounts = {};
    for (const fav of favorites) {
      const catId = fav.recipes.category_id;
      categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
    }

    // Find top category
    let topCategoryId = null;
    let maxCount = 0;
    for (const [catId, count] of Object.entries(categoryCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topCategoryId = parseInt(catId);
      }
    }

    const recipes = await prisma.recipes.findMany({
      where: { category_id: topCategoryId },
      take: limit,
      include: { users: { select: PUBLIC_USER_SELECT }, categories: true, ratings: true, meal_times: true, recipe_media: true },
      orderBy: { created_at: 'desc' },
    });
    return this._formatRecipes(recipes);
  },

  async getDetailRecommendations(recipeId, userId = null, recentIds = [], limit = 16) {
    const recipes = await prisma.recipes.findMany({
      include: {
        users: { select: PUBLIC_USER_SELECT },
        categories: true,
        meal_times: true,
        course_types: true,
        recipe_media: true,
        ingredients: true,
        recipe_tags: { include: { tags: true } },
        user_tag_votes: { include: { tags: true } },
        ratings: true,
        favorites: true,
        comments: true,
        recipe_views: true,
      },
    });

    const rankedRecipes = rankRecommendations({
      recipes,
      referenceRecipeId: recipeId,
      userId,
      recentIds,
      limit,
    });

    return this._formatRecipes(rankedRecipes).map((recipe) => {
      const {
        ingredients,
        recipe_tags: recipeTags,
        user_tag_votes: userTagVotes,
        ratings,
        favorites,
        comments,
        recipe_views: recipeViews,
        users,
        recommendation_score: recommendationScore,
        ...publicRecipe
      } = recipe;

      return {
        ...publicRecipe,
        view_count: recipeViews?.length || 0,
        favorite_count: favorites?.length || 0,
        comment_count: comments?.length || 0,
      };
    });
  },

  _formatRecipes(recipes) {
    return recipes.map((r) => {
      const totalRatings = r.ratings ? r.ratings.length : 0;
      const avgRating = totalRatings > 0 ? r.ratings.reduce((sum, cur) => sum + cur.star_count, 0) / totalRatings : 0;

      let video_url = null;
      if (r.recipe_media) {
        const videoMedia = r.recipe_media.find(m => m.media_type === 'video');
        if (videoMedia) video_url = videoMedia.media_url;
      }

      return {
        ...r,
        author_name: r.users?.fullname || r.users?.username,
        category_name: r.categories?.name,
        avg_rating: avgRating,
        total_ratings: totalRatings,
        view_count: r._count?.recipe_views || 0,
        search_score: r._score || 0,
        meal_time_name: r.meal_times?.name,
        video_url,
      };
    });
  },

  async getIngredientsByRecipeId(recipeId) {
    return await prisma.ingredients.findMany({
      where: { recipe_id: parseInt(recipeId) },
    });
  },

  async getStepsByRecipeId(recipeId) {
    return await prisma.steps.findMany({
      where: { recipe_id: parseInt(recipeId) },
      orderBy: { step_number: 'asc' },
    });
  },

  async getTagsByRecipeId(recipeId) {
    try {
      const parsedId = parseInt(recipeId);
      const tags = await prisma.$queryRaw`
        SELECT t.id, t.name, t.type,
          (SELECT COUNT(*) FROM user_tag_votes utv WHERE utv.tag_id = t.id AND utv.recipe_id = ${parsedId}) as voteCount,
          CAST((SELECT COUNT(*) FROM user_tag_votes utv WHERE utv.tag_id = t.id AND utv.recipe_id = ${parsedId}) as UNSIGNED) as numericVoteCount
        FROM tags t
        WHERE t.id IN (
          SELECT tag_id FROM recipe_tags WHERE recipe_id = ${parsedId}
          UNION
          SELECT tag_id FROM user_tag_votes WHERE recipe_id = ${parsedId}
        )
        ORDER BY numericVoteCount DESC
      `;
      // Convert BigInt to Number if needed
      return tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        type: tag.type,
        voteCount: Number(tag.voteCount || 0)
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async getMediaByRecipeId(recipeId) {
    try {
      const media = await prisma.$queryRaw`
        SELECT id, media_url, media_type, display_order 
        FROM recipe_media 
        WHERE recipe_id = ${parseInt(recipeId)}
        ORDER BY display_order ASC
      `;
      return media;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async createRecipe(recipeData, ingredients, steps, media) {
    const newRecipe = await prisma.recipes.create({
      data: {
        user_id: parseInt(recipeData.user_id),
        category_id: parseInt(recipeData.category_id),
        title: recipeData.title,
        description: recipeData.description,
        prep_time: parseInt(recipeData.prep_time) || 0,
        cook_time: parseInt(recipeData.cook_time) || 0,
        servings: parseInt(recipeData.servings) || 1,
        image_url: recipeData.image_url,
        meal_time_id: recipeData.meal_time_id || null,
        course_type_id: recipeData.course_type_id || null,
        ingredients: {
          create: (ingredients || [])
            .filter((ing) => ing.name && ing.name.trim() !== '')
            .map((ing) => ({
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
            })),
        },
        steps: {
          create: (steps || [])
            .filter(
              (step) => step.instruction && step.instruction.trim() !== ''
            )
            .map((step) => ({
              step_number: parseInt(step.step_number) || 0,
              instruction: step.instruction,
            })),
        },
        recipe_media: {
          create: (media || [])
            .filter((m) => m.media_url && m.media_url.trim() !== '')
            .map((m) => ({
              media_url: m.media_url,
              media_type: m.media_type || 'image',
            })),
        }
      },
    });
    return newRecipe.id;
  },

  async updateRecipe(recipeId, recipeData, ingredients, steps, media) {
    await prisma.recipes.update({
      where: { id: parseInt(recipeId) },
      data: {
        category_id: parseInt(recipeData.category_id),
        title: recipeData.title,
        description: recipeData.description,
        prep_time: parseInt(recipeData.prep_time) || 0,
        cook_time: parseInt(recipeData.cook_time) || 0,
        servings: parseInt(recipeData.servings) || 1,
        image_url: recipeData.image_url,
        meal_time_id: recipeData.meal_time_id || null,
        course_type_id: recipeData.course_type_id || null,
        ingredients: {
          deleteMany: {}, // Xóa toàn bộ ingredient cũ
          create: (ingredients || [])
            .filter((ing) => ing.name && ing.name.trim() !== '')
            .map((ing) => ({
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
            })),
        },
        steps: {
          deleteMany: {}, // Xóa toàn bộ step cũ
          create: (steps || [])
            .filter(
              (step) => step.instruction && step.instruction.trim() !== ''
            )
            .map((step) => ({
              step_number: parseInt(step.step_number) || 0,
              instruction: step.instruction,
            })),
        },
        recipe_media: {
          deleteMany: {}, // Xóa toàn bộ media cũ
          create: (media || [])
            .filter((m) => m.media_url && m.media_url.trim() !== '')
            .map((m) => ({
              media_url: m.media_url,
              media_type: m.media_type || 'image',
            })),
        }
      },
    });
  },

  async deleteRecipe(id) {
    return await prisma.recipes.delete({
      where: { id: parseInt(id) },
    });
  },
};

module.exports = Recipe;
