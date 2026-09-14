const prisma = require('../config/prisma');

const Recipe = {
  async getAllRecipes(search = '', categoryId = null) {
    const where = {};
    if (search && search.trim() !== '') {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (categoryId) {
      where.category_id = parseInt(categoryId);
    }

    const recipes = await prisma.recipes.findMany({
      where,
      include: {
        users: true,
        categories: true,
        ratings: true,
      },
      orderBy: { created_at: 'desc' },
    });

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
      };
    });
  },

  async getRecipeById(id) {
    const recipe = await prisma.recipes.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: true,
        categories: true,
      },
    });

    if (!recipe) return null;

    return {
      ...recipe,
      author_name: recipe.users?.fullname || recipe.users?.username,
      category_name: recipe.categories?.name,
    };
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
