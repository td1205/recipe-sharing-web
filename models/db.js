//Tạo model
const mysql = require('mysql2/promise');
//Tạo kết nối pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'recipe_db',
    password: 'dtdt@nhe',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

//Kiểm tra kết nối khi khởi động
pool.getConnection().then(connection =>{
    console.log("Kết nối CSDL thành công!")
    connection.release();
})
.catch(err=>{
    console.error("Lỗi kết nối CSDL",err.message);
})

//Xuất pool ra để các file khác có thể import vào
module.exports = pool;