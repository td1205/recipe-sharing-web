const express = require('express')
const path = require('path')
const session = require('express-session')
require('dotenv').config()


//Khởi tạo express
const app= express()
//import database
const pool = require('./models/db')
//Cấu hình view engine là ejs
app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))
//Cấu hình thư mục chứa css và hình ảnh
app.use(express.static(path.join(__dirname,'public')))
//Cấu hình middleware để đọc dữ liệu từ form (POST request)
app.use(express.urlencoded({extended:true}))
//Cấu hình middleware để đọc dữ liệu từ JSON
app.use(express.json())

app.use(session({
    //Chuỗi kí tự mã hóa session
    secret:'recipe_secret_key_123',
    //Không lưu lại session nếu không có thay đổi
    resave: false,
    //Không tạo session rác khi người dùng chưa đăng nhập
    saveUninitialized: false,
    cookie:{
        //Để false vì web ở localhost, không có https
        secure: false,
        //Thời gian tồn tại của session (1 ngày)
        maxAge: 1000*60*60*24   
    }
}))
//Tạo route thử nghiệm (Milestone ghép code)
app.get('/',(req,res)=>{
    res.send("Server express đang hoạt động!")
})
//Khởi động server
const PORT = 3000
app.listen(PORT,()=>{
    console.log(`Server đang chạy tại cổng ${PORT}`)
})