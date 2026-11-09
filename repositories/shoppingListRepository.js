const prisma = require('../config/prisma');

async function ensureItems(userId, recipeId) {
  await prisma.$executeRaw`
    INSERT IGNORE INTO shopping_list_items (user_id, recipe_id, ingredient_id)
    SELECT ${Number(userId)}, ${Number(recipeId)}, id FROM ingredients WHERE recipe_id = ${Number(recipeId)}
  `;
}

async function getCheckedIngredientIds(userId, recipeId) {
  await ensureItems(userId, recipeId);
  const rows = await prisma.$queryRaw`
    SELECT ingredient_id, is_checked FROM shopping_list_items
    WHERE user_id = ${Number(userId)} AND recipe_id = ${Number(recipeId)}
  `;
  return { checkedIngredientIds: rows.filter((row) => Boolean(row.is_checked)).map((row) => Number(row.ingredient_id)), servings: Number(rows[0]?.servings || 1) };
}

async function setServings(userId, recipeId, servings) {
  await ensureItems(userId, recipeId);
  await prisma.$executeRaw`UPDATE shopping_list_items SET servings = ${Number(servings)} WHERE user_id = ${Number(userId)} AND recipe_id = ${Number(recipeId)}`;
}

async function setChecked(userId, recipeId, ingredientId, checked) {
  const ingredient = await prisma.ingredients.findFirst({ where: { id: Number(ingredientId), recipe_id: Number(recipeId) }, select: { id: true } });
  if (!ingredient) return null;
  await prisma.$executeRaw`
    INSERT INTO shopping_list_items (user_id, recipe_id, ingredient_id, is_checked)
    VALUES (${Number(userId)}, ${Number(recipeId)}, ${Number(ingredientId)}, ${Boolean(checked)})
    ON DUPLICATE KEY UPDATE is_checked = VALUES(is_checked), updated_at = CURRENT_TIMESTAMP
  `;
  return Boolean(checked);
}

module.exports = { getCheckedIngredientIds, setChecked, setServings };
