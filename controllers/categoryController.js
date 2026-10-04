const categoryModel = require('../repositories/categoryRepository');
exports.showCategories = async (req, res) => {
  try {
    const categories = await categoryModel.getAll();
    res.json({ success: true, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi khi lấy danh mục' });
  }
};

exports.getNavData = async (req, res) => {
  try {
    const [categories, courseTypes, mealTimes] = await Promise.all([
      categoryModel.getAll(),
      categoryModel.getAllCourseTypes(),
      categoryModel.getAllMealTimes()
    ]);
    res.json({ success: true, categories, courseTypes, mealTimes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi lấy dữ liệu nav' });
  }
};
exports.showCreate = (req, res) => {
  res.json({ success: true, message: 'Category form' });
};
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    await categoryModel.create(name, description);
    res.json({ success: true, message: 'Category created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi khi thêm danh mục' });
  }
};
exports.showEdit = async (req, res) => {
  try {
    const category = await categoryModel.getById(req.params.id);
    res.json({ success: true, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi' });
  }
};
exports.updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    await categoryModel.update(req.params.id, name, description);
    res.json({ success: true, message: 'Category updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật danh mục' });
  }
};
exports.deleteCategory = async (req, res) => {
  try {
    await categoryModel.remove(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Lỗi xóa danh mục' });
  }
};
