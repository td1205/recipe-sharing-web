const db = require("./db");
async function getCommentsByRecipeId(recipeId) {
  const [rows] = await db.query(
    `SELECT comments.*, users.username
         FROM comments
         JOIN users ON comments.user_id = users.id
         WHERE recipe_id = ?
         ORDER BY created_at DESC`,
    [recipeId],
  );
  return rows;
}
async function createComment(userId, recipeId, content) {
  const [result] = await db.query(
    `INSERT INTO comments (user_id, recipe_id, content)
         VALUES (?, ?, ?)`,
    [userId, recipeId, content],
  );
  return result;
}
async function deleteComment(commentId) {
  await db.query(`DELETE FROM comments WHERE id = ?`, [commentId]);
}
module.exports = {
  getCommentsByRecipeId,
  createComment,
  deleteComment,
};
