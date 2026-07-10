const express = require('express')
const path = require('path')
const session = require('express-session')
require('dotenv').config()


//Khởi tạo express
const app = express()
//import database
const pool = require('./models/db')
const categoryModel = require('./models/categoryModel')
//Cấu hình middleware để đọc dữ liệu từ form (POST request)
app.use(express.urlencoded({ extended: true }))
//Cấu hình middleware để đọc dữ liệu từ JSON
app.use(express.json())

//Cấu hình view engine là ejs
app.set('view engine', 'ejs')
app.set('views', './views')
//Cấu hình thư mục chứa css và hình ảnh
app.use(express.static('public'))

//import routes
const categoryRoutes = require("./routes/categoryRoutes");
app.use(categoryRoutes);

app.use(session({
    //Chuỗi kí tự mã hóa session
    secret: 'recipe_secret_key_123',
    //Không lưu lại session nếu không có thay đổi
    resave: false,
    //Không tạo session rác khi người dùng chưa đăng nhập
    saveUninitialized: false,
    cookie: {
        //Để false vì web ở localhost, không có https
        secure: false,
        //Thời gian tồn tại của session (1 ngày)
        maxAge: 1000 * 60 * 60 * 24
    }
}))
//Tạo route thử nghiệm (Milestone ghép code)
app.get('/', async (req, res) => {

    try {

        const categories = await categoryModel.getAll();

        res.render("home", {
            categories
        });

    } catch (err) {

        console.error(err);
        res.send("Lỗi tải trang chủ");

    }

});
//Khởi động server
const PORT = 3000
app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`)
})