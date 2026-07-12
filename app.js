const express = require('express')
const path = require('path')
const session = require('express-session')
require('dotenv').config()

const authRoutes = require("./routes/authRoutes");
const recipeRoutes = require("./routes/recipeRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const interactionRoutes = require("./routes/interactionRoutes");

const app = express()

app.set('view engine', 'ejs')
app.set('views', './views')
app.use(express.static('public'))

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

const PORT = 3000
app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`)
})
