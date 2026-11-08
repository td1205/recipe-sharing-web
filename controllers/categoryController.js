const validation = require('../utils/apiValidation');
const categoryModel = require('../repositories/categoryRepository');
exports.showCategories = async (req, res) => {
  try {
    if (req.query?.page !== undefined || req.query?.limit !== undefined) {
      const result = await require('../repositories/adminListingRepository').getPage('categories', req.query);
      return res.json({ success: true, ...result, categories: result.items });
    }
    // Kèm số món thuộc danh mục để cảnh báo trước khi xoá dây chuyền
    const categories = await categoryModel.getAllWithRecipeCount();
    res.json({ success: true, categories });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Lỗi khi lấy danh mục');
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
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Lỗi lấy dữ liệu nav');
  }
};
exports.showCreate = (req, res) => {
  res.json({ success: true, message: 'Category form' });
};
exports.createCategory = async (req, res) => {
  try {
    const name = validation.text(req.body?.name, 'Tên danh mục', 100);
    const description = validation.text(req.body?.description, 'Mô tả', 10000, false);
    await categoryModel.create(name, description);
    res.json({ success: true, message: 'Category created' });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Lỗi khi thêm danh mục');
  }
};
exports.showEdit = async (req, res) => {
  try {
    const category = await categoryModel.getById(validation.id(req.params.id));
    if (!category) return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
    res.json({ success: true, category });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Lỗi');
  }
};
exports.updateCategory = async (req, res) => {
  try {
    const name = validation.text(req.body?.name, 'Tên danh mục', 100);
    const description = validation.text(req.body?.description, 'Mô tả', 10000, false);
    await categoryModel.update(validation.id(req.params.id), name, description);
    res.json({ success: true, message: 'Category updated' });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Lỗi cập nhật danh mục');
  }
};
exports.deleteCategory = async (req, res) => {
  try {
    await categoryModel.remove(validation.id(req.params.id));
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Lỗi xóa danh mục');
  }
};
