const db = require("./db");
const User = {};
async function getUserByUsername(username) {
  const sql = `SELECT * FROM users WHERE username =?`;
  const [rows] = await db.execute(sql, [username]);
  return rows;
}
async function getUserByEmail(email) {
  const sql = `SELECT * FROM users WHERE email =?`;
  const [rows] = await db.execute(sql, [email]);
  return rows;
}
async function getUserById(id) {
  const sql = `SELECT * FROM users WHERE id =?`;
  const [rows] = await db.execute(sql, [id]);
  return rows;
}
async function createUser(username, password, email, fullname) {
  const sql = `INSERT INTO users (username, password, email, fullname) VALUES (?,?,?,?)`;
  const [rows] = await db.execute(sql, [username, password, email, fullname]);
  return rows;
}
async function getFavouriteRecipesByUser(userId) {
  const sql = `SELECT r.* FROM favorites f JOIN recipes r ON f.recipe_id = r.id WHERE f.user_id = ?`;
  const [rows] = await db.execute(sql, [userId]);
  return rows;
}
async function updatePasswordByEmail(email, hashedPassword) {
  const sql = `UPDATE users SET password = ? WHERE email = ?`;
  const [result] = await db.execute(sql, [hashedPassword, email]);
  return result;
}
async function updateUserInfo(id, fullname, email) {
  const sql = `UPDATE users SET fullname = ?, email = ? WHERE id = ?`;
  const [result] = await db.execute(sql, [fullname, email, id]);
  return result;
}
async function updateUserProfile(id, fullname, email) {
  const sql = "UPDATE users SET fullname = ?, email = ? WHERE id = ?";
  const [result] = await db.execute(sql, [fullname, email, id]);
  return result;
}

module.exports = {
  updateUserProfile,
  getUserByUsername,
  getUserByEmail,
  createUser,
  getUserById,
  getFavouriteRecipesByUser,
  updatePasswordByEmail,
  updateUserInfo,
};
