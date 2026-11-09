const validation = require('../utils/apiValidation');
const commentModel = require('../repositories/commentRepository');
const ratingModel = require('../repositories/ratingRepository');
const recipeModel = require('../repositories/recipeRepository');
const favoriteModel = require('../repositories/favoriteRepository');
const interactionModel = require('../repositories/interactionRepository');
const tagModel = require('../repositories/tagRepository');
const recipeViewModel = require('../repositories/recipeViewRepository');
const shoppingListModel = require('../repositories/shoppingListRepository');

async function getShoppingList(req, res) {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const recipeId = validation.id(req.params.id);
    const recipe = await recipeModel.getRecipeById(recipeId);
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });
    const data = await shoppingListModel.getCheckedIngredientIds(req.session.user.id, recipeId);
    return res.json({ success: true, ...data });
  } catch (err) { return validation.apiError(res, err, 'Server Error'); }
}

async function setShoppingListServings(req, res) { try { if (!req.session.user) return res.status(401).json({ success:false }); const recipeId = validation.id(req.params.id); const servings = Number(req.body?.servings); if (!Number.isInteger(servings) || servings < 1 || servings > 100) return res.status(400).json({ success:false, message:'Khẩu phần không hợp lệ' }); await shoppingListModel.setServings(req.session.user.id, recipeId, servings); req.app.locals.cookingSync?.emitShoppingListChanged(req.session.user.id, { recipeId, servings }); return res.json({ success:true, servings }); } catch (err) { return validation.apiError(res, err); } }

async function setShoppingListItem(req, res) {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const recipeId = validation.id(req.params.id);
    const ingredientId = validation.id(req.params.ingredientId);
    if (typeof req.body?.checked !== 'boolean') return res.status(400).json({ success: false, message: 'checked phải là boolean' });
    const checked = await shoppingListModel.setChecked(req.session.user.id, recipeId, ingredientId, req.body.checked);
    if (checked === null) return res.status(404).json({ success: false, message: 'Ingredient not found' });
    req.app.locals.cookingSync?.emitShoppingListChanged(req.session.user.id, { recipeId, ingredientId, checked });
    return res.json({ success: true, checked });
  } catch (err) { return validation.apiError(res, err, 'Server Error'); }
}

async function addComment(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = validation.id(req.params.id);
    const userId = req.session.user.id;
    const content = validation.text(req.body?.content, 'Bình luận', 2000);
    if (content === '') {
      return res.status(400).json({ success: false, message: 'Empty comment' });
    }
    // Giới hạn độ dài để tránh payload khổng lồ / spam
    if (content.length > 2000) {
      return res.status(400).json({ success: false, message: 'Bình luận tối đa 2000 ký tự!' });
    }
    const comment = await commentModel.createComment(userId, recipeId, content);
    res.json({ success: true, message: 'Comment added', commentId: comment.id });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Server Error');
  }
}

async function addRating(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = validation.id(req.params.id);
    const userId = req.session.user.id;
    const rawStars = req.body?.star_count;
    const starCount = typeof rawStars === 'number' || (typeof rawStars === 'string' && /^[1-5]$/.test(rawStars)) ? Number(rawStars) : NaN;
    if (!Number.isInteger(starCount) || starCount < 1 || starCount > 5) {
      return res
        .status(400)
        .json({ success: false, message: 'Số sao phải là số nguyên từ 1 đến 5' });
    }
    await ratingModel.createOrUpdateRating(userId, recipeId, starCount);
    const newRatingObj = await ratingModel.getAverageRating(recipeId);
    const newRating = newRatingObj.averageRating;
    const newCount = newRatingObj.totalRatings;
    
    res.json({ success: true, message: 'Rating added/updated', newRating, newCount });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Server Error');
  }
}

async function recordRecipeView(req, res) {
  try {
    if (!req.session.user) {
      req.session.recipeViewTracking = true;
    }

    const result = await recipeViewModel.recordQualifiedView(
      validation.id(req.params.id),
      req.session.user?.id || null,
      req.sessionID
    );

    if (result.notFound) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Lỗi khi ghi nhận lượt xem công thức:', err.code || err.name);
    return validation.apiError(res, err, 'Server Error');
  }
}

async function toggleFavorite(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = validation.id(req.params.id);
    const userId = req.session.user.id;
    const desired = req.body?.isFav;
    if (desired !== undefined && typeof desired !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isFav phải là boolean' });
    }
    const isFav = await favoriteModel.setFavorite(userId, recipeId, desired);
    // MySQL đã hoàn tất trước khi báo các thiết bị khác tải lại dữ liệu chuẩn qua REST.
    req.app.locals.cookingSync?.emitFavoritesChanged(userId);
    res.json({ success: true, message: 'Favorite updated', isFav });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Server Error');
  }
}

async function addTag(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = validation.id(req.params.id);
    const userId = req.session.user.id;
    const { tagName } = req.body || {};

    if (typeof tagName !== 'string' || !tagName.trim() || tagName.trim().length > 50) {
      return res.status(400).json({ success: false, message: 'Empty tag name' });
    }

    const cleanTagName = tagName.trim().toLowerCase();

    const result = await tagModel.toggleVote(userId, recipeId, cleanTagName);
    return res.json({ success: true, message: result.isAdded ? 'Đã gắn tag thành công' : 'Đã hủy vote cho tag này', ...result });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Lỗi server');
  }
}

async function showRecipeDetail(req, res) {
  // Existing showRecipeDetail handled by recipeController in original code. 
  // Wait, in my previous view of interactionController.js, there WAS a showRecipeDetail, but it's redundant.
  // I will just keep it here as it was.
  try {
    const recipeId = validation.id(req.params.id);
    const recipe = await recipeModel.getRecipeById(recipeId);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Khong tim thay' });
    }
    const comments = await commentModel.getCommentsByRecipeId(recipeId);
    const rating = await ratingModel.getAverageRating(recipeId);
    let userRating = null;
    let isFav = false;
    if (req.session.user) {
      userRating = await ratingModel.getUserRating(
        req.session.user.id,
        recipeId
      );
      isFav = await favoriteModel.isFavorite(req.session.user.id, recipeId);
    }
    res.json({
      success: true,
      recipe,
      comments,
      rating,
      userRating,
      isFav,
      user: req.session.user,
    });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Server Error');
  }
}

async function adminComments(req, res) {
  try {
    if (req.query?.page !== undefined || req.query?.limit !== undefined) {
      const result = await require('../repositories/adminListingRepository').getPage('comments', req.query);
      return res.json({ success: true, ...result, comments: result.items });
    }
    const comments = await interactionModel.getAllComments();
    res.json({ success: true, comments });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Server Error');
  }
}

async function deleteComment(req, res) {
  try {
    await require('../repositories/moderationRepository').deleteContent('comment', validation.id(req.params.id), req.session.user.id);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    console.error('Yêu cầu thất bại:', err.code || err.name);
    return validation.apiError(res, err, 'Server Error');
  }
}

module.exports = {
  addComment,
  addRating,
  recordRecipeView,
  toggleFavorite,
  addTag,
  showRecipeDetail,
  adminComments,
  deleteComment,
  getShoppingList,
  setShoppingListItem,
  setShoppingListServings,
};
