// ============================================================================
// ITEM-BASED COLLABORATIVE FILTERING
// ============================================================================
// Ý tưởng: "Người thích món A cũng thường thích món B".
// Không cần biết nội dung món ăn, chỉ dựa vào hành vi của cộng đồng.
//
// Ma trận R: hàng = người dùng, cột = món, ô r(u, i) = điểm quan tâm (> 0)
// Độ giống giữa 2 món i và j = cosine giữa 2 CỘT của ma trận:
//
//                    Σ_u r(u,i) × r(u,j)
//   sim(i, j) = ------------------------------
//               √(Σ_u r(u,i)²) × √(Σ_u r(u,j)²)
//
// Điểm gợi ý món j cho người dùng u:
//   score(u, j) = Σ_{i ∈ món u đã tương tác} sim(i, j) × r(u, i)
// ============================================================================

class CFModel {
  // userItemScores: Map(userId -> Map(recipeId -> điểm)); chỉ dùng điểm > 0
  constructor(userItemScores) {
    this.userItems = new Map();
    this.itemUsers = new Map();
    userItemScores.forEach((items, userId) => {
      items.forEach((score, recipeId) => {
        if (score <= 0) return;
        if (!this.userItems.has(userId)) this.userItems.set(userId, new Map());
        this.userItems.get(userId).set(recipeId, score);
        if (!this.itemUsers.has(recipeId)) this.itemUsers.set(recipeId, new Map());
        this.itemUsers.get(recipeId).set(userId, score);
      });
    });

    // độ dài vector cột của mỗi món: √(Σ_u r(u,i)²)
    this.itemNorms = new Map();
    this.itemUsers.forEach((users, recipeId) => {
      let sum = 0;
      users.forEach((score) => {
        sum += score * score;
      });
      this.itemNorms.set(recipeId, Math.sqrt(sum));
    });
    this.cache = new Map();
  }

  get userCount() {
    return this.userItems.size;
  }

  has(recipeId) {
    return this.itemUsers.has(Number(recipeId));
  }

  // sim(i, j) với mọi món j có ít nhất 1 người dùng chung với i
  similarTo(recipeId) {
    const id = Number(recipeId);
    if (this.cache.has(id)) return this.cache.get(id);
    const users = this.itemUsers.get(id);
    const result = new Map();
    if (users) {
      const dotProducts = new Map();
      users.forEach((scoreI, userId) => {
        this.userItems.get(userId).forEach((scoreJ, otherId) => {
          if (otherId === id) return;
          dotProducts.set(otherId, (dotProducts.get(otherId) || 0) + scoreI * scoreJ);
        });
      });
      const normI = this.itemNorms.get(id);
      dotProducts.forEach((value, otherId) => {
        result.set(otherId, value / (normI * this.itemNorms.get(otherId)));
      });
    }
    if (this.cache.size > 5000) this.cache.clear();
    this.cache.set(id, result);
    return result;
  }

  // userItems: Map(recipeId -> điểm) của 1 người dùng
  // -> Map(recipeId -> { score, because }) ; because = món đóng góp nhiều nhất
  scoreForUser(userItems) {
    const scores = new Map();
    userItems.forEach((weight, recipeId) => {
      if (weight <= 0) return;
      this.similarTo(recipeId).forEach((similarity, otherId) => {
        const contribution = similarity * weight;
        const current = scores.get(otherId) || { score: 0, because: null, best: 0 };
        current.score += contribution;
        if (contribution > current.best) {
          current.best = contribution;
          current.because = Number(recipeId);
        }
        scores.set(otherId, current);
      });
    });
    return scores;
  }
}

module.exports = { CFModel };
