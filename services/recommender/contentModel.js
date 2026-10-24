// ============================================================================
// CONTENT-BASED FILTERING: TF-IDF + độ tương đồng cosine
// ============================================================================
// Ý tưởng: mô tả mỗi món bằng một "túi đặc trưng" (nguyên liệu, tag, danh mục,
// từ trong tên món). Hai món có nhiều đặc trưng chung -> giống nhau.
//
// TF-IDF giúp đặc trưng HIẾM quan trọng hơn đặc trưng PHỔ BIẾN:
//   idf(t) = ln(N / df(t))     N: tổng số món, df(t): số món có đặc trưng t
//   -> "muối" có trong hầu hết các món -> idf gần 0 -> gần như không ảnh hưởng
//   -> "sả" hay "nước cốt dừa" ít món có -> idf lớn -> ảnh hưởng mạnh
//
// Trọng số của đặc trưng t trong món d:  w(t, d) = hệ_số_nhóm(t) × idf(t)
// Độ giống giữa 2 món: cosine(A, B) = (A · B) / (|A| × |B|), nằm trong [0, 1]
// ============================================================================

const { ingredientKey, titleWords, toNfcLower } = require('./text');

// Hệ số cho từng nhóm đặc trưng (nhóm quan trọng hơn thì hệ số cao hơn)
const FEATURE_WEIGHTS = {
  ingredient: 1.0, // nguyên liệu
  tag: 1.5, // tag: "hải sản", "món chay", "thịt bò"...
  category: 1.0, // danh mục / cách chế biến: Chiên, Xào, Hấp...
  titleWord: 0.5, // từ trong tên món
};

const FEATURE_LABELS = { i: 'nguyên liệu', t: 'tag', c: 'danh mục', w: 'tên món' };

function extractFeatures(recipe) {
  const features = new Map();
  const add = (key, weight) => {
    if (!features.has(key) || features.get(key) < weight) features.set(key, weight);
  };
  (recipe.ingredients || []).forEach((name) => {
    const key = ingredientKey(name);
    if (key) add(`i:${key}`, FEATURE_WEIGHTS.ingredient);
  });
  (recipe.tags || []).forEach((tag) => add(`t:${toNfcLower(tag).trim()}`, FEATURE_WEIGHTS.tag));
  if (recipe.categoryId != null) add(`c:${recipe.categoryId}`, FEATURE_WEIGHTS.category);
  titleWords(recipe.title).forEach((word) => add(`w:${word}`, FEATURE_WEIGHTS.titleWord));
  return features;
}

function normalizeVector(vector) {
  let sumSquares = 0;
  vector.forEach((value) => {
    sumSquares += value * value;
  });
  const length = Math.sqrt(sumSquares);
  if (length === 0) return vector;
  vector.forEach((value, key) => vector.set(key, value / length));
  return vector;
}

function dot(left, right) {
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  let sum = 0;
  small.forEach((value, key) => {
    const other = large.get(key);
    if (other) sum += value * other;
  });
  return sum;
}

class ContentModel {
  constructor(recipes) {
    this.ids = recipes.map((recipe) => recipe.id);
    this.indexById = new Map(this.ids.map((id, index) => [id, index]));

    // 1. Đặc trưng thô của từng món
    const rawFeatures = recipes.map(extractFeatures);

    // 2. df(t): số món chứa đặc trưng t  ->  idf(t) = ln(N / df(t))
    const documentFrequency = new Map();
    rawFeatures.forEach((features) => {
      features.forEach((_, key) => documentFrequency.set(key, (documentFrequency.get(key) || 0) + 1));
    });
    const total = recipes.length;
    this.idf = new Map();
    documentFrequency.forEach((df, key) => this.idf.set(key, Math.log(total / df)));

    // 3. Vector TF-IDF đã chuẩn hóa độ dài = 1 (để tích vô hướng = cosine)
    this.vectors = rawFeatures.map((features) => {
      const vector = new Map();
      features.forEach((weight, key) => {
        const value = weight * this.idf.get(key);
        if (value > 0) vector.set(key, value);
      });
      return normalizeVector(vector);
    });

    // 4. Chỉ mục ngược: đặc trưng -> danh sách món có đặc trưng đó (tính nhanh hơn)
    this.postings = new Map();
    this.vectors.forEach((vector, index) => {
      vector.forEach((value, key) => {
        if (!this.postings.has(key)) this.postings.set(key, []);
        this.postings.get(key).push([index, value]);
      });
    });
  }

  has(recipeId) {
    return this.indexById.has(Number(recipeId));
  }

  vectorOf(recipeId) {
    const index = this.indexById.get(Number(recipeId));
    return index === undefined ? null : this.vectors[index];
  }

  // Cosine giữa 1 vector truy vấn và TẤT CẢ các món -> Map(recipeId -> điểm)
  scoreAll(queryVector) {
    const scores = new Float64Array(this.ids.length);
    queryVector.forEach((queryValue, key) => {
      const list = this.postings.get(key);
      if (!list) return;
      for (const [index, value] of list) scores[index] += queryValue * value;
    });
    const result = new Map();
    scores.forEach((score, index) => {
      if (score > 0) result.set(this.ids[index], score);
    });
    return result;
  }

  // Món giống một món cho trước
  similarTo(recipeId) {
    const vector = this.vectorOf(recipeId);
    if (!vector) return new Map();
    const scores = this.scoreAll(vector);
    scores.delete(Number(recipeId));
    return scores;
  }

  // Hồ sơ sở thích người dùng = trung bình có trọng số các vector món họ thích
  //   profile = Σ (điểm_tương_tác(u, i) × vector(i))
  buildProfile(userItemScores) {
    const profile = new Map();
    userItemScores.forEach((weight, recipeId) => {
      if (weight <= 0) return;
      const vector = this.vectorOf(recipeId);
      if (!vector) return;
      vector.forEach((value, key) => profile.set(key, (profile.get(key) || 0) + weight * value));
    });
    return normalizeVector(profile);
  }

  similarity(leftId, rightId) {
    const left = this.vectorOf(leftId);
    const right = this.vectorOf(rightId);
    return left && right ? dot(left, right) : 0;
  }

  // Những đặc trưng chung đóng góp nhiều nhất -> dùng để giải thích gợi ý
  sharedFeatures(leftId, rightId, limit = 3) {
    const left = this.vectorOf(leftId);
    const right = this.vectorOf(rightId);
    if (!left || !right) return [];
    const shared = [];
    left.forEach((value, key) => {
      if (right.has(key) && !key.startsWith('c:')) shared.push([key, value * right.get(key)]);
    });
    return shared
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => ({ type: FEATURE_LABELS[key[0]], value: key.slice(2) }));
  }
}

module.exports = { ContentModel, extractFeatures, FEATURE_WEIGHTS };
