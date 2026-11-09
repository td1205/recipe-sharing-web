// Explicit operator action only. Never called by the scheduler or HTTP routes.
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });
async function main() {
  const output = process.argv[2];
  if (!output) throw new Error('Specify a new private output JSON file');
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.query('SET SESSION TRANSACTION READ ONLY');
    await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    const [recipes] = await connection.query('SELECT r.id, r.title, r.category_id AS categoryId, r.cook_time AS cookTime, m.name AS mealTime FROM recipes r LEFT JOIN meal_times m ON m.id=r.meal_time_id ORDER BY r.id');
    const [ingredients] = await connection.query('SELECT recipe_id, name FROM ingredients');
    const [tags] = await connection.query('SELECT rt.recipe_id, t.name FROM recipe_tags rt JOIN tags t ON t.id=rt.tag_id');
    const [rows] = await connection.query("SELECT user_id, recipe_id, 'favorite' AS type, NULL AS stars FROM favorites UNION ALL SELECT user_id, recipe_id, 'rating', star_count FROM ratings UNION ALL SELECT user_id, recipe_id, 'comment', NULL FROM comments UNION ALL SELECT user_id, recipe_id, 'view', NULL FROM recipe_views WHERE user_id IS NOT NULL GROUP BY user_id, recipe_id");
    // ROLLBACK closes the read-only snapshot; no application row is written.
    await connection.rollback();
    const byId = new Map(recipes.map(recipe => [recipe.id, { ...recipe, ingredients: [], tags: [] }]));
    ingredients.forEach(row => byId.get(row.recipe_id)?.ingredients.push(row.name));
    tags.forEach(row => byId.get(row.recipe_id)?.tags.push(row.name));
    const aliases = new Map();
    const interactions = rows.filter(row => row.user_id != null && byId.has(row.recipe_id)).map(row => {
      if (!aliases.has(row.user_id)) aliases.set(row.user_id, aliases.size + 1);
      return { userId: aliases.get(row.user_id), recipeId: row.recipe_id, type: row.type, ...(row.type === 'rating' ? { stars: row.stars } : {}) };
    });
    const dataset = { kind: 'unverified', label: 'Snapshot website — chưa phân tách nguồn tương tác thật/mô phỏng',
      capturedAt: new Date().toISOString(), recipes: [...byId.values()], interactions };
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(dataset), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ recipes: recipes.length, interactions: interactions.length, users: aliases.size, mode: 'read-only snapshot; pseudonymous user IDs' }));
  } finally { await connection.end(); }
}
main().catch(() => { console.error('Không xuất được snapshot; kiểm tra kết nối/quyền và file đích mới. Không có thao tác ghi database.'); process.exitCode = 1; });
