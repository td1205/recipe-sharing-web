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
const aiRoutes = require('./routes/aiRoutes.js');
const articleRoutes = require('./routes/articleRoutes.js');
const app = express();
app.use(express.static(path.join(__dirname, 'frontend/dist')));
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
app.use('/api', recipeRoutes);
app.use('/api', authRoutes);
app.use('/api', categoryRoutes);
app.use('/api', interactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminCommentRoutes);
app.use(articleRoutes);

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  } else {
    next();
  }
});
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});
