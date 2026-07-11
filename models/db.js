const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'recipe_db',
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection().then(connection => {
    console.log("Kết nối CSDL thành công!");
    connection.release();
}).catch(err => {
    console.error("Lỗi kết nối CSDL", err.message);
});

module.exports = pool;