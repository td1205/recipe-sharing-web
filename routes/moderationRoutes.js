const router = require('express').Router();
const { isAuthenticated, isAdmin } = require('../middlewares/authMiddleware');
const { createRateLimiter } = require('../middlewares/rateLimit');
const controller = require('../controllers/moderationController');
const limiter = createRateLimiter({
  windowMs: 600000,
  max: 20,
  key: () => 'reports',
});
router.post('/reports', isAuthenticated, limiter, controller.create);
router.get('/admin/reports', isAdmin, controller.reports);
router.patch('/admin/reports/:id', isAdmin, controller.resolve);
router.get('/admin/audit-logs', isAdmin, controller.logs);
router.get('/admin/recommender', isAdmin, controller.model);
module.exports = router;
