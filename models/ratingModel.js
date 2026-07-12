const db = require("./db");

// Thêm hoặc cập nhật đánh giá sao
async function createOrUpdateRating(userId, recipeId, starCount) {
    const [rows] = await db.query(
        `SELECT id
         FROM ratings
         WHERE user_id = ? AND recipe_id = ?`,
        [userId, recipeId]
    );

    if (rows.length > 0) {
        const [result] = await db.query(
            `UPDATE ratings
             SET star_count = ?
             WHERE user_id = ? AND recipe_id = ?`,
            [starCount, userId, recipeId]
        );

        return result;
    }

    const [result] = await db.query(
        `INSERT INTO ratings (user_id, recipe_id, star_count)
         VALUES (?, ?, ?)`,
        [userId, recipeId, starCount]
    );

    return result;
}

// Lấy điểm đánh giá trung bình
async function getAverageRating(recipeId) {
    const [rows] = await db.query(
        `SELECT AVG(star_count) AS averageRating,
                COUNT(*) AS totalRatings
         FROM ratings
         WHERE recipe_id = ?`,
        [recipeId]
    );

    return rows[0];
}

// Lấy số sao của người dùng cho một món ăn
async function getUserRating(userId, recipeId) {
    const [rows] = await db.query(
        `SELECT star_count
         FROM ratings
         WHERE user_id = ? AND recipe_id = ?`,
        [userId, recipeId]
    );

    return rows[0];
}

module.exports = {
    createOrUpdateRating,
    getAverageRating,
    getUserRating,
};