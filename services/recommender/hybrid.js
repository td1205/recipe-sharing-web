// ============================================================================
// KẾT HỢP CÁC THUẬT TOÁN (HYBRID - kiểu "chuyển trạng thái" / switching)
// ============================================================================
// Chọn thuật toán theo lượng dữ liệu đã biết về người dùng:
//
//   Số món đã tương tác (điểm > 0)   Thuật toán dùng
//   ------------------------------   ------------------------------------------
//   0  (người dùng mới / khách)      Độ phổ biến (popularity)
//   1 - 2                            Content-based (TF-IDF)
//   >= 3                             Hybrid = 0.3 × Content + 0.7 × CF
//
// Lý do: CF cần đủ lịch sử mới đoán tốt; content-based dùng được ngay từ món
// đầu tiên; người chưa có lịch sử thì gợi ý món được cộng đồng yêu thích.
// Ngưỡng 3 món được chọn từ thực nghiệm (scripts/evaluate-recommender.js, bảng
// "theo số món đã biết"): với 1-2 món content tốt nhất, từ 3 món hybrid tốt hơn.
//
// Để danh sách không bị một loại món chiếm hết: mỗi danh mục tối đa 4 món.
// Hai món bằng điểm -> ưu tiên món phổ biến hơn.
// ============================================================================

const { ContentModel } = require('./contentModel');
const { CFModel } = require('./cfModel');
const { computePopularity } = require('./popularity');
const { buildUserItemScores, buildRecipeStats } = require('./interactions');
const { ingredientKey, isPantryStaple, ingredientMatches, toNfcLower } = require('./text');

const SETTINGS = {
  minItemsForCF: 3, // từ 3 món đã tương tác trở lên thì dùng thêm CF
  // Trọng số hybrid ở trang chủ: đã thử 0.5/0.5, 0.3/0.7, 0.2/0.8 bằng
  // scripts/evaluate-recommender.js. CF cho kết quả tốt hơn khi đủ dữ liệu nên
  // được trọng số cao hơn; vẫn giữ 30% content để gợi ý được cả món MỚI
  // (chưa ai tương tác thì CF không biết đến).
  contentWeight: 0.3,
  cfWeight: 0.7,
  similarContentWeight: 0.7, // trang chi tiết: "món tương tự" thiên về nội dung
  similarCfWeight: 0.3,
  maxPerCategory: 4, // đa dạng: tối đa 4 món cùng danh mục
};

// ---------------------------------------------------------------------------
// Xây dựng mô hình từ dữ liệu
// recipes: [{ id, title, categoryId, ingredients: [tên], tags: [tên] }]
// interactions: [{ userId, recipeId, type, stars? }]
// anonymousViews: Map(recipeId -> lượt xem của khách chưa đăng nhập)
// ---------------------------------------------------------------------------
function buildModels({ recipes, interactions, anonymousViews = new Map() }) {
  const userItemScores = buildUserItemScores(interactions);
  const popularity = computePopularity(
    recipes.map((recipe) => recipe.id),
    buildRecipeStats(interactions, anonymousViews),
  );
  return {
    content: new ContentModel(recipes),
    cf: new CFModel(userItemScores),
    popularity,
    popularRanking: [...popularity.keys()].sort((a, b) => popularity.get(b) - popularity.get(a)),
    recipeById: new Map(recipes.map((recipe) => [recipe.id, recipe])),
    ingredientKeys: new Map(
      recipes.map((recipe) => [
        recipe.id,
        [...new Set((recipe.ingredients || []).map(ingredientKey).filter(Boolean))],
      ]),
    ),
    userItemScores,
    builtAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Tiện ích
// ---------------------------------------------------------------------------
function maxValue(map, pick = (value) => value) {
  let maximum = 0;
  map.forEach((value) => {
    maximum = Math.max(maximum, pick(value));
  });
  return maximum;
}

function titleOf(models, recipeId) {
  return models.recipeById.get(Number(recipeId))?.title || 'món bạn đã xem';
}

// Sắp xếp giảm dần theo điểm, hòa điểm thì ưu tiên món phổ biến hơn,
// và giới hạn số món mỗi danh mục để danh sách đa dạng.
function rankAndDiversify(models, candidates, limit, maxPerCategory) {
  const sorted = [...candidates].sort(
    (a, b) =>
      b.score - a.score ||
      (models.popularity.get(b.recipeId) || 0) - (models.popularity.get(a.recipeId) || 0),
  );
  const selected = [];
  const perCategory = new Map();
  const chosen = new Set();
  for (const item of sorted) {
    if (selected.length >= limit) break;
    const categoryId = models.recipeById.get(item.recipeId)?.categoryId;
    const count = perCategory.get(categoryId) || 0;
    if (maxPerCategory && count >= maxPerCategory) continue;
    perCategory.set(categoryId, count + 1);
    selected.push(item);
    chosen.add(item.recipeId);
  }
  // nếu chưa đủ (ít danh mục) thì bổ sung, bỏ qua giới hạn danh mục
  for (const item of sorted) {
    if (selected.length >= limit) break;
    if (!chosen.has(item.recipeId)) selected.push(item);
  }
  return selected;
}

function fillWithPopular(models, results, limit, excluded, filter = null) {
  const used = new Set(results.map((item) => item.recipeId));
  for (const recipeId of models.popularRanking) {
    if (results.length >= limit) break;
    if (used.has(recipeId) || excluded.has(recipeId)) continue;
    if (filter && !filter(models.recipeById.get(recipeId))) continue;
    results.push({
      recipeId,
      score: models.popularity.get(recipeId),
      strategy: 'popular',
      reason: 'Đang được nhiều người yêu thích',
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// 1. Gợi ý cho người dùng (trang chủ: "Dành riêng cho bạn")
// userItems: Map(recipeId -> điểm quan tâm) của người dùng
// options.strategy: 'auto' (mặc định, theo bảng ở đầu file) | 'popular' | 'content' | 'cf' | 'hybrid'
// ---------------------------------------------------------------------------
function chooseStrategy(userItems) {
  const interacted = [...userItems.values()].filter((score) => score > 0).length;
  if (interacted === 0) return 'popular';
  if (interacted < SETTINGS.minItemsForCF) return 'content';
  return 'hybrid';
}

function recommendForUser(models, userItems = new Map(), options = {}) {
  const limit = options.limit || 16;
  const strategy = !options.strategy || options.strategy === 'auto' ? chooseStrategy(userItems) : options.strategy;
  const excluded = new Set([...userItems.keys(), ...(options.exclude || [])].map(Number));
  const maxPerCategory = options.diversify === false ? 0 : SETTINGS.maxPerCategory;

  if (strategy === 'popular') {
    return fillWithPopular(models, [], limit, excluded);
  }

  const contentScores =
    strategy === 'cf' ? new Map() : models.content.scoreAll(models.content.buildProfile(userItems));
  const cfScores = strategy === 'content' ? new Map() : models.cf.scoreForUser(userItems);
  const maxContent = maxValue(contentScores);
  const maxCf = maxValue(cfScores, (value) => value.score);

  const weights =
    strategy === 'content'
      ? { content: 1, cf: 0 }
      : strategy === 'cf'
        ? { content: 0, cf: 1 }
        : { content: SETTINGS.contentWeight, cf: SETTINGS.cfWeight };

  const candidates = new Map();
  const addCandidate = (recipeId) => {
    if (excluded.has(recipeId) || candidates.has(recipeId)) return;
    const contentPart = maxContent > 0 ? (contentScores.get(recipeId) || 0) / maxContent : 0;
    const cfEntry = cfScores.get(recipeId);
    const cfPart = maxCf > 0 && cfEntry ? cfEntry.score / maxCf : 0;
    const score = weights.content * contentPart + weights.cf * cfPart;
    if (score > 0) {
      candidates.set(recipeId, {
        recipeId,
        score,
        strategy,
        components: { content: contentPart, cf: cfPart },
        cfBecause: cfEntry?.because,
      });
    }
  };
  contentScores.forEach((_, recipeId) => addCandidate(recipeId));
  cfScores.forEach((_, recipeId) => addCandidate(recipeId));

  const ranked = rankAndDiversify(models, candidates.values(), limit, maxPerCategory);

  // Lý do gợi ý (để hiển thị và giải thích)
  const likedIds = [...userItems.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([recipeId]) => recipeId);
  ranked.forEach((item) => {
    const cfWins = weights.cf * item.components.cf > weights.content * item.components.content;
    if (cfWins && item.cfBecause) {
      item.reason = `Người thích "${titleOf(models, item.cfBecause)}" cũng thích món này`;
    } else {
      let bestId = null;
      let best = 0;
      likedIds.forEach((likedId) => {
        const similarity = models.content.similarity(likedId, item.recipeId);
        if (similarity > best) {
          best = similarity;
          bestId = likedId;
        }
      });
      item.reason = bestId ? `Giống món bạn quan tâm: "${titleOf(models, bestId)}"` : 'Phù hợp với sở thích của bạn';
    }
    delete item.cfBecause;
  });

  return fillWithPopular(models, ranked, limit, excluded);
}

// ---------------------------------------------------------------------------
// 2. Món tương tự (trang chi tiết món)
//   score = 0.7 × content_similarity + 0.3 × cf_similarity   (nếu có dữ liệu CF)
//   score = content_similarity                              (nếu chưa có)
// ---------------------------------------------------------------------------
function similarRecipes(models, recipeId, options = {}) {
  const limit = options.limit || 16;
  const id = Number(recipeId);
  const excluded = new Set([id, ...(options.exclude || []).map(Number)]);
  if (!models.content.has(id)) return fillWithPopular(models, [], limit, excluded);

  const contentScores = models.content.similarTo(id);
  const cfScores = models.cf.has(id) ? models.cf.similarTo(id) : new Map();
  const maxContent = maxValue(contentScores);
  const maxCf = maxValue(cfScores);
  const useCf = maxCf > 0;
  const contentWeight = useCf ? SETTINGS.similarContentWeight : 1;
  const cfWeight = useCf ? SETTINGS.similarCfWeight : 0;

  const candidates = [];
  new Set([...contentScores.keys(), ...cfScores.keys()]).forEach((otherId) => {
    if (excluded.has(otherId)) return;
    const contentPart = maxContent > 0 ? (contentScores.get(otherId) || 0) / maxContent : 0;
    const cfPart = useCf ? (cfScores.get(otherId) || 0) / maxCf : 0;
    candidates.push({
      recipeId: otherId,
      score: contentWeight * contentPart + cfWeight * cfPart,
      strategy: useCf ? 'hybrid' : 'content',
      components: { content: contentPart, cf: cfPart },
    });
  });

  const ranked = rankAndDiversify(models, candidates, limit, 0);
  ranked.forEach((item) => {
    if (cfWeight * item.components.cf > contentWeight * item.components.content) {
      item.reason = 'Người thích món này cũng thích';
    } else {
      const shared = models.content.sharedFeatures(id, item.recipeId, 2).map((feature) => feature.value);
      item.reason = shared.length > 0 ? `Cùng có: ${shared.join(', ')}` : 'Cùng danh mục';
    }
  });
  return fillWithPopular(models, ranked, limit, excluded);
}

// ---------------------------------------------------------------------------
// 3. "Nấu gì với nguyên liệu có sẵn?"  (gợi ý dựa trên tri thức - knowledge-based)
//   Bỏ qua gia vị nhà nào cũng có (muối, đường, nước mắm, tỏi...).
//   độ_phủ   = số nguyên liệu chính khớp / số nguyên liệu chính của món   (thiếu ít)
//   tận_dụng = số nguyên liệu bạn nhập được dùng / số nguyên liệu bạn nhập (dùng nhiều)
//   điểm = 0.5 × độ_phủ + 0.5 × tận_dụng ; hòa điểm thì ưu tiên món phổ biến hơn
// ---------------------------------------------------------------------------
function recipesByIngredients(models, ingredientNames, options = {}) {
  const limit = options.limit || 20;
  const queries = [
    ...new Set(
      (ingredientNames || [])
        .map((name) => ingredientKey(name) || toNfcLower(name).trim())
        .filter(Boolean),
    ),
  ];
  if (queries.length === 0) return [];

  const results = [];
  models.ingredientKeys.forEach((keys, recipeId) => {
    const needed = keys.filter((key) => !isPantryStaple(key));
    if (needed.length === 0) return;
    const matched = needed.filter((key) => queries.some((query) => ingredientMatches(key, query)));
    if (matched.length === 0) return;
    const usedQueries = queries.filter((query) => needed.some((key) => ingredientMatches(key, query)));
    const coverage = matched.length / needed.length;
    const usage = usedQueries.length / queries.length;
    results.push({
      recipeId,
      score: 0.5 * coverage + 0.5 * usage,
      coverage,
      usage,
      matchedCount: matched.length,
      neededCount: needed.length,
      matched,
      missing: needed.filter((key) => !matched.includes(key)).slice(0, 5),
      strategy: 'ingredients',
    });
  });

  results.sort(
    (a, b) =>
      b.score - a.score ||
      (models.popularity.get(b.recipeId) || 0) - (models.popularity.get(a.recipeId) || 0),
  );
  return results.slice(0, limit).map((item) => ({
    ...item,
    reason:
      item.missing.length === 0
        ? `Bạn có đủ ${item.neededCount} nguyên liệu chính`
        : `Có ${item.matchedCount}/${item.neededCount} nguyên liệu chính, còn thiếu: ${item.missing.join(', ')}`,
  }));
}

// Món phổ biến, có thể lọc theo bữa / ăn chay / thời gian nấu (tab ở trang chủ)
const POPULAR_FILTERS = {
  breakfast: (recipe) => recipe.mealTime === 'Sáng',
  lunch: (recipe) => recipe.mealTime === 'Trưa',
  dinner: (recipe) => recipe.mealTime === 'Tối',
  vegetarian: (recipe) =>
    (recipe.tags || []).some((tag) => toNfcLower(tag) === 'món chay') || /\bchay\b/i.test(recipe.title || ''),
  quick: (recipe) => Number(recipe.cookTime) > 0 && Number(recipe.cookTime) < 30,
};

function popularRecipes(models, options = {}) {
  const filter = options.filter ? POPULAR_FILTERS[options.filter] : null;
  return fillWithPopular(models, [], options.limit || 16, new Set((options.exclude || []).map(Number)), filter);
}

module.exports = {
  SETTINGS,
  buildModels,
  chooseStrategy,
  recommendForUser,
  similarRecipes,
  recipesByIngredients,
  popularRecipes,
  POPULAR_FILTERS,
};
