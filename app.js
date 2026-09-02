require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const authRoutes = require('./routes/authRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const recipeRoutes = require('./routes/recipeRoutes.js');
const categoryRoutes = require('./routes/categoryRoutes.js');
const interactionRoutes = require('./routes/interactionRoutes.js');
const adminCommentRoutes = require('./routes/admin.js');
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const sessionStore = new MySQLStore({
  password: process.env.DB_PASSWORD,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
});
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});
app.use('/', recipeRoutes);
app.use('/', authRoutes);
app.use(categoryRoutes);
app.use('/', interactionRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', adminCommentRoutes);
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});
