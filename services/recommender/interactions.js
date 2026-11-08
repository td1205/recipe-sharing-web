// ============================================================================
// QUY ĐỔI HÀNH VI NGƯỜI DÙNG THÀNH "ĐIỂM QUAN TÂM" (implicit feedback)
// ============================================================================
// Người dùng hiếm khi chấm sao, nhưng hành vi xem / yêu thích / bình luận cũng
// cho biết họ thích gì. Mỗi cặp (người dùng, món) được cộng điểm như sau:
//
//   Xem món                 +1
//   Bình luận               +0.25, tối đa một lần cho mỗi user–món
//   Yêu thích (thả tim)     +3
//   Đánh giá 5 sao          +3
//   Đánh giá 4 sao          +2
//   Đánh giá 3 sao           0
//   Đánh giá 1-2 sao        -2, ghi đè tổng điểm tích cực (không thích)
//
// Món được coi là người dùng "THÍCH" khi: đã yêu thích HOẶC đánh giá >= 4 sao.
// ============================================================================

const INTERACTION_POINTS = {
  view: 1,
  comment: 0.25,
  favorite: 3,
};

function ratingPoints(stars) {
  if (stars >= 5) return 3;
  if (stars >= 4) return 2;
  if (stars >= 3) return 0;
  return -2;
}

// interactions: [{ userId, recipeId, type: 'view'|'comment'|'favorite'|'rating', stars? }]
// -> Map(userId -> Map(recipeId -> điểm))
function buildUserItemScores(interactions) {
  const users = new Map();
  const countedViews = new Set();
  const disliked = new Map();
  interactions.forEach(({ userId, recipeId, type, stars }) => {
    if (userId == null || recipeId == null) return;
    // "xem" chỉ tính 1 lần cho mỗi cặp (người dùng, món) dù xem nhiều lần
    if (type === 'view' || type === 'comment') {
      const key = `${type}:${userId}:${recipeId}`;
      if (countedViews.has(key)) return;
      countedViews.add(key);
    }
    const points = type === 'rating' ? ratingPoints(stars) : INTERACTION_POINTS[type] || 0;
    if (type === 'rating' && stars >= 1 && stars <= 2) {
      if (!disliked.has(userId)) disliked.set(userId, new Set());
      disliked.get(userId).add(recipeId);
    }
    if (!users.has(userId)) users.set(userId, new Map());
    const items = users.get(userId);
    items.set(recipeId, (items.get(recipeId) || 0) + points);
  });
  // Dữ liệu nguồn chứa đánh giá hiện tại; không phụ thuộc thứ tự hành vi.
  disliked.forEach((ids, userId) => {
    ids.forEach((recipeId) => users.get(userId).set(recipeId, -2));
  });
  return users;
}

// Danh sách món người dùng "thích" (yêu thích hoặc >= 4 sao)
function likedRecipeIds(interactions) {
  const liked = new Set();
  const disliked = new Set();
  interactions.forEach(({ recipeId, type, stars }) => {
    if (type === 'favorite' || (type === 'rating' && stars >= 4)) liked.add(recipeId);
    if (type === 'rating' && stars >= 1 && stars <= 2) disliked.add(recipeId);
  });
  disliked.forEach((id) => liked.delete(id));
  return liked;
}

// Thống kê cho mỗi món, dùng để tính độ phổ biến
// extraViews: Map(recipeId -> số lượt xem ẩn danh) (không gắn với user)
function buildRecipeStats(interactions, extraViews = new Map()) {
  const stats = new Map();
  const get = (id) => {
    if (!stats.has(id)) stats.set(id, { ratingSum: 0, ratingCount: 0, favoriteCount: 0, viewCount: 0 });
    return stats.get(id);
  };
  interactions.forEach(({ recipeId, type, stars }) => {
    const item = get(recipeId);
    if (type === 'rating') {
      item.ratingSum += stars;
      item.ratingCount += 1;
    } else if (type === 'favorite') item.favoriteCount += 1;
    else if (type === 'view') item.viewCount += 1;
  });
  extraViews.forEach((count, recipeId) => {
    get(recipeId).viewCount += count;
  });
  return stats;
}

module.exports = {
  INTERACTION_POINTS,
  ratingPoints,
  buildUserItemScores,
  likedRecipeIds,
  buildRecipeStats,
};
