// Truy vấn dữ liệu cho hệ gợi ý (services/recommender).
// Chỉ lấy đúng các cột cần thiết để nhẹ và nhanh.
const prisma = require('../config/prisma');
const recipeModel = require('./recipeRepository');
const { PUBLIC_USER_SELECT } = require('../utils/userSelect');

// Đặc trưng nội dung của tất cả món: tên, danh mục, nguyên liệu, tag
async function loadRecipeFeatures() {
  const recipes = await prisma.recipes.findMany({
    select: {
      id: true,
      title: true,
      category_id: true,
      cook_time: true,
      meal_times: { select: { name: true } },
      ingredients: { select: { name: true } },
      recipe_tags: { select: { tags: { select: { name: true } } } },
    },
  });
  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    categoryId: recipe.category_id,
    cookTime: recipe.cook_time,
    mealTime: recipe.meal_times?.name || null,
    ingredients: recipe.ingredients.map((ingredient) => ingredient.name),
    tags: recipe.recipe_tags.map((item) => item.tags?.name).filter(Boolean),
  }));
}

// Toàn bộ hành vi của người dùng đã đăng nhập + lượt xem ẩn danh theo món
async function loadInteractions({ userId = null } = {}) {
  const whereUser = userId ? { user_id: Number(userId) } : {};
  const [favorites, ratings, comments, views] = await Promise.all([
    prisma.favorites.findMany({ where: whereUser, select: { user_id: true, recipe_id: true } }),
    prisma.ratings.findMany({ where: whereUser, select: { user_id: true, recipe_id: true, star_count: true } }),
    prisma.comments.findMany({ where: whereUser, select: { user_id: true, recipe_id: true } }),
    prisma.recipe_views.groupBy({
      by: ['user_id', 'recipe_id'],
      where: userId ? { user_id: Number(userId) } : {},
      _count: { _all: true },
    }),
  ]);

  const interactions = [
    ...favorites.map((row) => ({ userId: row.user_id, recipeId: row.recipe_id, type: 'favorite' })),
    ...ratings.map((row) => ({ userId: row.user_id, recipeId: row.recipe_id, type: 'rating', stars: row.star_count })),
    ...comments.map((row) => ({ userId: row.user_id, recipeId: row.recipe_id, type: 'comment' })),
  ];
  const anonymousViews = new Map();
  views.forEach((row) => {
    if (row.user_id == null) {
      anonymousViews.set(row.recipe_id, (anonymousViews.get(row.recipe_id) || 0) + row._count._all);
    } else {
      interactions.push({ userId: row.user_id, recipeId: row.recipe_id, type: 'view' });
    }
  });
  return { interactions, anonymousViews };
}

// Lấy thông tin hiển thị (thẻ món ăn) theo đúng thứ tự id truyền vào
async function getRecipeCardsByIds(ids) {
  if (!ids.length) return [];
  const recipes = await prisma.recipes.findMany({
    where: { id: { in: ids.map(Number) } },
    include: {
      users: { select: PUBLIC_USER_SELECT },
      categories: true,
      ratings: { select: { star_count: true } },
      meal_times: true,
      recipe_media: true,
      _count: { select: { recipe_views: true } },
    },
  });
  const formatted = new Map(recipeModel._formatRecipes(recipes).map((recipe) => [recipe.id, recipe]));
  return ids.map((id) => formatted.get(Number(id))).filter(Boolean);
}

module.exports = { loadRecipeFeatures, loadInteractions, getRecipeCardsByIds };
