const db = require("./db");

// Lấy toàn bộ comment
async function getAllComments() {
    const [rows] = await db.query(`
        SELECT
            comments.id,
            comments.content,
            comments.created_at,
            users.username,
            recipes.title
        FROM comments
        JOIN users
            ON comments.user_id = users.id
        JOIN recipes
            ON comments.recipe_id = recipes.id
        ORDER BY comments.created_at DESC
    `);

    return rows;
}

// Xóa comment
async function deleteComment(id) {
    await db.query(
        "DELETE FROM comments WHERE id = ?",
        [id]
    );
}

module.exports = {
    getAllComments,
    deleteComment
};
