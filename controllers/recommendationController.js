const recommender = require('../services/recommender');

// Dựng sẵn mô hình gợi ý ngay khi server khởi động để request đầu tiên không phải chờ
setTimeout(() => {
  recommender.getModels().catch((err) => console.error('[recommender] Không dựng được mô hình:', err.message));
}, 1000).unref();

// GET /api/recommendations/by-ingredients?items=trứng,cà chua,hành tây
async function getByIngredients(req, res) {
  try {
    const raw = Array.isArray(req.query.items) ? req.query.items.join(',') : String(req.query.items || '');
    const items = raw
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= 50)
      .slice(0, 15);
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập ít nhất 1 nguyên liệu' });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const recipes = await recommender.recipesByIngredients(items, limit);
    return res.json({ success: true, items, recipes });
  } catch (err) {
    console.error('Lỗi gợi ý theo nguyên liệu:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống gợi ý' });
  }
}

// GET /api/recommendations/for-me
async function getForMe(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 16, 50);
    const recipes = await recommender.recommendForUser(req.session.user?.id || null, limit);
    return res.json({ success: true, recipes });
  } catch (err) {
    console.error('Lỗi gợi ý cho người dùng:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống gợi ý' });
  }
}

// GET /api/recommendations/popular?filter=breakfast|lunch|dinner|vegetarian|quick
async function getPopular(req, res) {
  try {
    const filter = String(req.query.filter || '');
    if (filter && !recommender.POPULAR_FILTERS.includes(filter)) {
      return res.status(400).json({ success: false, message: 'Bộ lọc không hợp lệ' });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 16, 50);
    const recipes = await recommender.popularRecipes(limit, filter || null);
    return res.json({ success: true, filter: filter || null, recipes });
  } catch (err) {
    console.error('Lỗi lấy món phổ biến:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống gợi ý' });
  }
}

// GET /api/recommendations/explain -> người dùng hiện tại đang được dùng thuật toán nào
async function getExplanation(req, res) {
  try {
    const explanation = await recommender.explainForUser(req.session.user?.id || null);
    return res.json({ success: true, ...explanation });
  } catch (err) {
    console.error('Lỗi giải thích gợi ý:', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống gợi ý' });
  }
}

module.exports = { getByIngredients, getForMe, getPopular, getExplanation };
