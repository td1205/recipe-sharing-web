const prisma = require('../config/prisma');

const Recipe = {
  async getAllRecipes(search = '', categoryId = null, mealTimeId = null) {
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

    let recipes = await prisma.recipes.findMany({
      where,
      include: {
        users: true,
        categories: true,
        ratings: true,
        meal_times: true,
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
      const totalRatings = r.ratings.length;
      const avgRating =
        totalRatings > 0
          ? r.ratings.reduce((sum, cur) => sum + cur.star_count, 0) /
            totalRatings
          : 0;

      return {
        ...r,
        author_name: r.users?.fullname || r.users?.username,
        category_name: r.categories?.name,
        avg_rating: avgRating,
        total_ratings: totalRatings,
        search_score: r._score || 0, // Optional: expose score for debugging
        meal_time_name: r.meal_times?.name,
      };
    });
  },

  async getRecipeById(id) {
    const recipe = await prisma.recipes.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: true,
        categories: true,
        ratings: true,
        meal_times: true,
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
      meal_time_name: recipe.meal_times?.name,
    };
  },

  async getLatestRecipes(limit = 12) {
    const recipes = await prisma.recipes.findMany({
      take: limit,
      include: { users: true, categories: true, ratings: true, meal_times: true },
      orderBy: { created_at: 'desc' },
    });
    return this._formatRecipes(recipes);
  },

  async getPopularRecipes(limit = 12) {
    // Ideally order by ratings count or score. For simplicity, fetching latest and sorting manually by views/ratings.
    const recipes = await prisma.recipes.findMany({
      include: { users: true, categories: true, ratings: true, favorites: true, meal_times: true },
      take: 50
    });
    const formatted = this._formatRecipes(recipes);
    // Sort by avg_rating * total_ratings (popularity score)
    formatted.sort((a, b) => (b.avg_rating * b.total_ratings) - (a.avg_rating * a.total_ratings));
    return formatted.slice(0, limit);
  },

  async getTodayRecipes(limit = 12) {
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
      include: { users: true, categories: true, ratings: true, meal_times: true },
      orderBy: { created_at: 'desc' },
    });
    return this._formatRecipes(recipes);
  },

  async getRecommendedRecipes(userId = null, limit = 12) {
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
      include: { users: true, categories: true, ratings: true, meal_times: true },
      orderBy: { created_at: 'desc' },
    });
    return this._formatRecipes(recipes);
  },

  _formatRecipes(recipes) {
    return recipes.map((r) => {
      const totalRatings = r.ratings ? r.ratings.length : 0;
      const avgRating = totalRatings > 0 ? r.ratings.reduce((sum, cur) => sum + cur.star_count, 0) / totalRatings : 0;
      return {
        ...r,
        author_name: r.users?.fullname || r.users?.username,
        category_name: r.categories?.name,
        avg_rating: avgRating,
        total_ratings: totalRatings,
        search_score: r._score || 0,
        meal_time_name: r.meal_times?.name,
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
      const tags = await prisma.$queryRaw`
        SELECT t.id, t.name, t.type 
        FROM tags t
        JOIN recipe_tags rt ON t.id = rt.tag_id
        WHERE rt.recipe_id = ${parseInt(recipeId)}
      `;
      return tags;
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

  async createRecipe(recipeData, ingredients, steps) {
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
      },
    });
    return newRecipe.id;
  },

  async updateRecipe(recipeId, recipeData, ingredients, steps) {
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
