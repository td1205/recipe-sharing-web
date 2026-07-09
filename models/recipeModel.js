const db = require("./db");

const Recipe = {
  async getAllRecipes() {
    const sql = `
      SELECT recipes.*, users.fullname AS author_name, categories.name AS category_name 
      FROM recipes 
      LEFT JOIN users ON recipes.user_id = users.id 
      LEFT JOIN categories ON recipes.category_id = categories.id 
      ORDER BY recipes.created_at DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  async getRecipeById(id) {
    const sql = `
      SELECT recipes.*, users.fullname AS author_name, categories.name AS category_name 
      FROM recipes 
      LEFT JOIN users ON recipes.user_id = users.id 
      LEFT JOIN categories ON recipes.category_id = categories.id 
      WHERE recipes.id = ?
    `;
    const [rows] = await db.execute(sql, [id]);
    return rows[0];
  },

  async getIngredientsByRecipeId(recipeId) {
    const sql = `SELECT * FROM ingredients WHERE recipe_id = ?`;
    const [rows] = await db.execute(sql, [recipeId]);
    return rows;
  },

  async getStepsByRecipeId(recipeId) {
    const sql = `SELECT * FROM steps WHERE recipe_id = ? ORDER BY step_number ASC`;
    const [rows] = await db.execute(sql, [recipeId]);
    return rows;
  }
};

module.exports = Recipe;
