const db = require("./db");

const Recipe = {
  async getAllRecipes(search = "", categoryId = null) {
    let sql = `
      SELECT recipes.*, users.fullname AS author_name, categories.name AS category_name 
      FROM recipes 
      LEFT JOIN users ON recipes.user_id = users.id 
      LEFT JOIN categories ON recipes.category_id = categories.id
    `;
    const params = [];
    const conditions = [];

    if (search && search.trim() !== "") {
      conditions.push("(recipes.title LIKE ? OR recipes.description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      conditions.push("recipes.category_id = ?");
      params.push(categoryId);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY recipes.created_at DESC";

    const [rows] = await db.execute(sql, params);
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
  },
  async createRecipe(recipeData, ingredients, steps) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const sqlRecipe = `
        INSERT INTO recipes (user_id, category_id, title, description, prep_time, cook_time, servings, image_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const [resultRecipe] = await conn.execute(sqlRecipe, [
        recipeData.user_id,
        recipeData.category_id,
        recipeData.title,
        recipeData.description,
        recipeData.prep_time,
        recipeData.cook_time,
        recipeData.servings,
        recipeData.image_url
      ]);

      const recipeId = resultRecipe.insertId;

      if (ingredients && ingredients.length > 0) {
        const sqlIngredient = `INSERT INTO ingredients (recipe_id, name, amount, unit) VALUES (?, ?, ?, ?)`;
        for (const ing of ingredients) {
          if (ing.name && ing.name.trim() !== "") {
            await conn.execute(sqlIngredient, [recipeId, ing.name, ing.amount, ing.unit]);
          }
        }
      }

      if (steps && steps.length > 0) {
        const sqlStep = `INSERT INTO steps (recipe_id, step_number, instruction) VALUES (?, ?, ?)`;
        for (const step of steps) {
          if (step.instruction && step.instruction.trim() !== "") {
            await conn.execute(sqlStep, [recipeId, step.step_number, step.instruction]);
          }
        }
      }

      await conn.commit();
      return recipeId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
  async updateRecipe(recipeId, recipeData, ingredients, steps) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const sqlRecipe = `
        UPDATE recipes 
        SET category_id = ?, title = ?, description = ?, prep_time = ?, cook_time = ?, servings = ?, image_url = ?
        WHERE id = ?
      `;
      await conn.execute(sqlRecipe, [
        recipeData.category_id,
        recipeData.title,
        recipeData.description,
        recipeData.prep_time,
        recipeData.cook_time,
        recipeData.servings,
        recipeData.image_url,
        recipeId
      ]);

      await conn.execute(`DELETE FROM ingredients WHERE recipe_id = ?`, [recipeId]);

      if (ingredients && ingredients.length > 0) {
        const sqlIngredient = `INSERT INTO ingredients (recipe_id, name, amount, unit) VALUES (?, ?, ?, ?)`;
        for (const ing of ingredients) {
          if (ing.name && ing.name.trim() !== "") {
            await conn.execute(sqlIngredient, [recipeId, ing.name, ing.amount, ing.unit]);
          }
        }
      }

      await conn.execute(`DELETE FROM steps WHERE recipe_id = ?`, [recipeId]);

      if (steps && steps.length > 0) {
        const sqlStep = `INSERT INTO steps (recipe_id, step_number, instruction) VALUES (?, ?, ?)`;
        for (const step of steps) {
          if (step.instruction && step.instruction.trim() !== "") {
            await conn.execute(sqlStep, [recipeId, step.step_number, step.instruction]);
          }
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
  async deleteRecipe(id) {
    const sql = `DELETE FROM recipes WHERE id = ?`;
    const [result] = await db.execute(sql, [id]);
    return result;
  }
};


module.exports = Recipe;
