const express = require('express')
const path = require('path')
const session = require('express-session')
require('dotenv').config()

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const recipeRoutes = require("./routes/recipeRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const interactionRoutes = require("./routes/interactionRoutes");
const adminCommentRoutes = require("./routes/admin");

// Khởi tạo express
const app = express()

// Cấu hình view engine là ejs
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Cấu hình thư mục chứa css và hình ảnh
app.use(express.static(path.join(__dirname, 'public')))

// Cấu hình middleware để đọc dữ liệu từ form (POST request)
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(session({
    secret: 'recipe_secret_key_123',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}))

app.use("/", recipeRoutes);
app.use('/', authRoutes);
app.use(categoryRoutes);
app.use("/", interactionRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', adminCommentRoutes);
const PORT = 3000
app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`)
})
