require('dotenv').config();
// Fail before creating database/session clients. Importing does not start a listener.
if (require.main === module) require('./config/runtime').validateRuntime(process.env);
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const authRoutes = require('./routes/authRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const recipeRoutes = require('./routes/recipeRoutes.js');
const categoryRoutes = require('./routes/categoryRoutes.js');
const interactionRoutes = require('./routes/interactionRoutes.js');
const adminCommentRoutes = require('./routes/admin.js');
const aiRoutes = require('./routes/aiRoutes.js');

const { refreshSessionUser } = require('./middlewares/sessionUserMiddleware');
const tokenAuth = require('./middlewares/tokenAuth');
const app = express();
// Không tiết lộ framework/phiên bản qua response header
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY.split(',').map(value => value.trim()));
app.get('/healthz', (_req, res) => res.json({ success: true }));
// Security headers: HSTS, X-Frame-Options, noSniff, Referrer-Policy...
// CSP mở img-src https: vì ảnh công thức trỏ tới Flickr/Wikimedia/monngonmoingay...
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      },
    },
  }),
);
app.use(express.static(path.join(__dirname, 'frontend/dist')));
// Ảnh đại diện người dùng tải lên
app.use('/avatars', express.static(path.join(__dirname, 'uploads/avatars')));
// Tương thích ảnh cũ từng lưu trong frontend/public/avatars
app.use('/avatars', express.static(path.join(__dirname, 'frontend/public/avatars')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Preserve existing error/message consumers while converging on a JSON error contract.
app.use((_req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (body?.success === false) {
      const message = body.error || body.message || 'Yêu cầu không thành công';
      body = { ...body, error: message, message };
    }
    return json(body);
  };
  next();
});
const sessionStore = require('./config/sessionStore').getSessionStore();
let draining = false;
app.locals.closeResources = () => Promise.all([
  require('./config/sessionStore').closeSessionStore(),
  require('./config/prisma').$disconnect(),
]);
app.get('/readyz', require('./config/operations').readiness({
  probeDatabase: () => require('./config/prisma').$queryRaw`SELECT 1`,
  probeSessions: () => sessionStore.query('SELECT session_id FROM sessions LIMIT 0'),
  isDraining: () => draining,
}));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      // 'auto': HTTPS thì bật Secure, HTTP (dev) thì tắt — cookie không bị rò rỉ khi deploy
      secure: 'auto',
      // Chống CSRF: cookie không gửi trong cross-site POST
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});
// Kiểm tra tài khoản bị khóa / đổi quyền ở mỗi request API
// Xác thực token Bearer (Flutter) TRƯỚC khi đồng bộ session: token hợp lệ sẽ
// được hydrate thành req.session, kế thừa ngay luồng chặn khóa/đổi quyền bên dưới.
app.use('/api', tokenAuth);
app.use('/api', refreshSessionUser);
app.use('/api', (req, res, next) => {
  // Same-origin browser writes; requests without Origin (non-browser clients) remain compatible.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
    const expected = process.env.APP_ORIGIN || `${req.protocol}://${req.get('host')}`;
    const developmentOrigin = process.env.NODE_ENV !== 'production' && !process.env.APP_ORIGIN
      && ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(req.headers.origin);
    if (req.headers.origin !== expected && !developmentOrigin) return res.status(403).json({ success: false, error: 'Nguồn yêu cầu không hợp lệ' });
  }
  next();
});
app.use('/api', recipeRoutes);
app.use('/api', authRoutes);
app.use('/api', categoryRoutes);
app.use('/api', interactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminCommentRoutes);


app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  } else {
    next();
  }
});
app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'Không tìm thấy API' }));
app.use((error, _req, res, _next) => {
  if (res.headersSent) return _next(error);
  const status = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
  if (status === 500) return require('./utils/apiValidation').apiError(res, error);
  const message = status === 400 ? 'Dữ liệu JSON không hợp lệ' : status === 413 ? 'Dữ liệu gửi quá lớn' : 'Lỗi hệ thống, vui lòng thử lại';
  res.status(status).json({ success: false, error: message, message });
});
module.exports = app;
if (require.main === module) {
  const PORT = Number(process.env.PORT || 3000);
  const server = app.listen(PORT, () => console.log(`Server đang chạy tại cổng ${PORT}`));
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    draining = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    server.close(async () => {
      try {
        await app.locals.closeResources();
        clearTimeout(deadline);
      } catch { process.exitCode = 1; }
    });
    server.closeIdleConnections();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
