// ============================================================================
// ĐỘ PHỔ BIẾN (dùng cho người dùng mới chưa có lịch sử - "cold start")
// ============================================================================
// 1. Điểm sao trung bình kiểu Bayes (tránh món chỉ có 1 lượt 5 sao đứng đầu):
//
//        v × R + m × C
//   B = ---------------      v: số lượt đánh giá của món, R: điểm trung bình của món
//            v + m           C: điểm trung bình toàn hệ thống, m = 5 (lượt "ảo")
//
// 2. Điểm phổ biến (mỗi thành phần chuẩn hóa về [0, 1]):
//   popularity = 0.4 × B/5 + 0.3 × log(1+yêu thích)/log(1+max) + 0.3 × log(1+xem)/log(1+max)
//   Dùng log để món có 1000 lượt xem không áp đảo hoàn toàn món có 100 lượt.
// ============================================================================

const PRIOR_WEIGHT = 5;
const WEIGHTS = { rating: 0.4, favorites: 0.3, views: 0.3 };

function logNormalize(value, maximum) {
  return maximum > 0 ? Math.log1p(value) / Math.log1p(maximum) : 0;
}

// stats: Map(recipeId -> { ratingSum, ratingCount, favoriteCount, viewCount })
// recipeIds: tất cả món (món chưa có tương tác vẫn có điểm sao "trung tính")
function computePopularity(recipeIds, stats) {
  let totalSum = 0;
  let totalCount = 0;
  let maxFavorites = 0;
  let maxViews = 0;
  stats.forEach((item) => {
    totalSum += item.ratingSum;
    totalCount += item.ratingCount;
    maxFavorites = Math.max(maxFavorites, item.favoriteCount);
    maxViews = Math.max(maxViews, item.viewCount);
  });
  const globalMean = totalCount > 0 ? totalSum / totalCount : 3.5;

  const scores = new Map();
  recipeIds.forEach((id) => {
    const item = stats.get(id) || { ratingSum: 0, ratingCount: 0, favoriteCount: 0, viewCount: 0 };
    const bayesian = (item.ratingSum + PRIOR_WEIGHT * globalMean) / (item.ratingCount + PRIOR_WEIGHT);
    const score =
      WEIGHTS.rating * (bayesian / 5) +
      WEIGHTS.favorites * logNormalize(item.favoriteCount, maxFavorites) +
      WEIGHTS.views * logNormalize(item.viewCount, maxViews);
    scores.set(id, score);
  });
  return scores;
}

module.exports = { computePopularity };
