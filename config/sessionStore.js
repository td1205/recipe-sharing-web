const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// Một instance MySQLStore duy nhất dùng chung cho:
// - session cookie của website (app.js)
// - token Bearer cho ứng dụng Flutter (services/tokenService)
// Tránh mở nhiều connection pool cho cùng một bảng `sessions`.
let store = null;

function getSessionStore() {
  if (!store) {
    store = new MySQLStore({
      // Bảng `sessions` đã tồn tại trong MySQL, không tự tạo lại.
      createDatabaseTable: false,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
    });
  }
  return store;
}

// Đóng pool khi server tắt (app.locals.closeResources gọi ở graceful shutdown).
function closeSessionStore() {
  if (!store) return Promise.resolve();
  const closing = store.close();
  store = null;
  return closing;
}

module.exports = { getSessionStore, closeSessionStore };
