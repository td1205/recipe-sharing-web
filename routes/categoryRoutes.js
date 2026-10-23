const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/authMiddleware');
const categoryController = require('../controllers/categoryController');

// Public
router.get('/nav-data', categoryController.getNavData);

// Admin
router.get('/admin/categories', isAdmin, categoryController.showCategories);
router.get('/admin/categories/create', isAdmin, categoryController.showCreate);
router.post('/admin/categories/create', isAdmin, categoryController.createCategory);
router.get('/admin/categories/edit/:id', isAdmin, categoryController.showEdit);
router.post('/admin/categories/edit/:id', isAdmin, categoryController.updateCategory);
router.post('/admin/categories/delete/:id', isAdmin, categoryController.deleteCategory);

module.exports = router;
