const commentModel = require('../repositories/commentRepository');
const ratingModel = require('../repositories/ratingRepository');
const recipeModel = require('../repositories/recipeRepository');
const favoriteModel = require('../repositories/favoriteRepository');
const interactionModel = require('../repositories/interactionRepository');
const tagModel = require('../repositories/tagRepository');
const recipeViewModel = require('../repositories/recipeViewRepository');

async function addComment(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = req.params.id;
    const userId = req.session.user.id;
    const { content } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Empty comment' });
    }
    await commentModel.createComment(userId, recipeId, content);
    res.json({ success: true, message: 'Comment added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function addRating(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = req.params.id;
    const userId = req.session.user.id;
    const starCount = Number(req.body.star_count);
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
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function recordRecipeView(req, res) {
  try {
    if (!req.session.user) {
      req.session.recipeViewTracking = true;
    }

    const result = await recipeViewModel.recordQualifiedView(
      req.params.id,
      req.session.user?.id || null,
      req.sessionID
    );

    if (result.notFound) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Lỗi khi ghi nhận lượt xem công thức:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function toggleFavorite(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = req.params.id;
    const userId = req.session.user.id;
    const isFav = await favoriteModel.isFavorite(userId, recipeId);
    if (isFav) {
      await favoriteModel.removeFavorite(userId, recipeId);
    } else {
      await favoriteModel.addFavorite(userId, recipeId);
    }
    res.json({ success: true, message: 'Favorite toggled', isFav: !isFav });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function addTag(req, res) {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const recipeId = req.params.id;
    const userId = req.session.user.id;
    const { tagName } = req.body;

    if (!tagName || tagName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Empty tag name' });
    }

    const cleanTagName = tagName.trim().toLowerCase();

    // Check how many tags this user has voted on this recipe
    const voteCount = await tagModel.getUserVoteCountForRecipe(userId, recipeId);
    
    // Find or create tag
    let tag = await tagModel.getTagByName(cleanTagName);
    if (!tag) {
      // Must enforce 5 tag limit before creating new tags
      if (voteCount >= 5) {
        return res.status(400).json({ success: false, message: 'Bạn chỉ được gắn tối đa 5 tag cho món ăn này!' });
      }
      tag = await tagModel.createTag(cleanTagName);
    }

    // Check if user already voted for this tag
    const hasVoted = await tagModel.hasUserVotedForTag(userId, recipeId, tag.id);
    if (hasVoted) {
      // Unvote (Toggle behavior similar to Steam)
      await tagModel.removeVote(userId, recipeId, tag.id);
      return res.json({ success: true, message: 'Đã hủy vote cho tag này', isAdded: false });
    } else {
      if (voteCount >= 5) {
        return res.status(400).json({ success: false, message: 'Bạn chỉ được gắn tối đa 5 tag cho món ăn này!' });
      }
      await tagModel.addVote(userId, recipeId, tag.id);
      return res.json({ success: true, message: 'Đã gắn tag thành công', isAdded: true, tag: { id: tag.id, name: tag.name } });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
}

async function showRecipeDetail(req, res) {
  // Existing showRecipeDetail handled by recipeController in original code. 
  // Wait, in my previous view of interactionController.js, there WAS a showRecipeDetail, but it's redundant.
  // I will just keep it here as it was.
  try {
    const recipeId = req.params.id;
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
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function adminComments(req, res) {
  try {
    const comments = await interactionModel.getAllComments();
    res.json({ success: true, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
}

async function deleteComment(req, res) {
  try {
    await interactionModel.deleteComment(req.params.id);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
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
  deleteComment
};
