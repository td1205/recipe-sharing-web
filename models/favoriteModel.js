const db = require("./db");

// Kiểm tra người dùng đã thích món ăn chưa
async function isFavorite(userId, recipeId) {
    const [rows] = await db.query(
        `SELECT * FROM favorites
         WHERE user_id = ? AND recipe_id = ?`,
        [userId, recipeId]
    );

    return rows.length > 0;
}

// Thêm vào yêu thích
async function addFavorite(userId, recipeId) {
    const [result] = await db.query(
        `INSERT INTO favorites (user_id, recipe_id)
         VALUES (?, ?)`,
        [userId, recipeId]
    );

    return result;
}

// Bỏ yêu thích
async function removeFavorite(userId, recipeId) {
    await db.query(
        `DELETE FROM favorites
         WHERE user_id = ? AND recipe_id = ?`,
        [userId, recipeId]
    );
}

module.exports = {
    isFavorite,
    addFavorite,
    removeFavorite,
};