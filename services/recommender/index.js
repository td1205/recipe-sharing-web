// ============================================================================
// HỆ GỢI Ý - điểm vào duy nhất cho controller
// ============================================================================
// - Mô hình (TF-IDF, ma trận CF, độ phổ biến) được dựng từ database và lưu
//   trong bộ nhớ, tự dựng lại sau mỗi 10 phút -> không phải tải toàn bộ dữ
//   liệu ở mỗi request.
// - Lịch sử của người dùng đang xem được đọc MỚI mỗi lần, nên vừa thả tim /
//   chấm sao là gợi ý thay đổi ngay.
// ============================================================================

const repository = require('../../repositories/recommendationRepository');
const { buildUserItemScores } = require('./interactions');
const hybrid = require('./hybrid');

const REBUILD_INTERVAL_MS = 10 * 60 * 1000;

const state = { models: null, builtAt: 0, building: null };

async function buildFromDatabase() {
  const startedAt = Date.now();
  const [recipes, { interactions, anonymousViews }] = await Promise.all([
    repository.loadRecipeFeatures(),
    repository.loadInteractions(),
  ]);
  const models = hybrid.buildModels({ recipes, interactions, anonymousViews });
  console.log(
    `[recommender] Đã dựng mô hình: ${recipes.length} món, ${interactions.length} tương tác, ` +
      `${models.cf.userCount} người dùng (${Date.now() - startedAt}ms)`,
  );
  return models;
}

// Trả về mô hình hiện có; nếu đã cũ thì dựng lại ở nền (vẫn trả bản cũ cho nhanh)
async function getModels({ forceRebuild = false } = {}) {
  const isStale = Date.now() - state.builtAt > REBUILD_INTERVAL_MS;
  if ((forceRebuild || isStale || !state.models) && !state.building) {
    state.building = buildFromDatabase()
      .then((models) => {
        state.models = models;
        state.builtAt = Date.now();
        return models;
      })
      .finally(() => {
        state.building = null;
      });
  }
  if (state.models && !forceRebuild) return state.models;
  return state.building;
}

async function loadUserItems(userId) {
  if (!userId) return new Map();
  const { interactions } = await repository.loadInteractions({ userId });
  return buildUserItemScores(interactions).get(Number(userId)) || new Map();
}

// Gắn lý do gợi ý vào thẻ món ăn để frontend hiển thị
async function toRecipeCards(results) {
  const cards = await repository.getRecipeCardsByIds(results.map((item) => item.recipeId));
  const byId = new Map(results.map((item) => [item.recipeId, item]));
  return cards.map((card) => ({
    ...card,
    recommendation_score: byId.get(card.id)?.score,
    recommendation_strategy: byId.get(card.id)?.strategy,
    recommendation_reason: byId.get(card.id)?.reason,
  }));
}

// Trang chủ: "Dành riêng cho bạn"
async function recommendForUser(userId, limit = 16) {
  const [models, userItems] = await Promise.all([getModels(), loadUserItems(userId)]);
  return toRecipeCards(hybrid.recommendForUser(models, userItems, { limit }));
}

// Trang chi tiết: "Gợi ý cho bạn" (món tương tự)
async function similarRecipes(recipeId, limit = 16) {
  let models = await getModels();
  // Món vừa được tạo sau lần dựng mô hình gần nhất -> dựng lại
  if (!models.content.has(recipeId)) models = await getModels({ forceRebuild: true });
  return toRecipeCards(hybrid.similarRecipes(models, recipeId, { limit }));
}

// "Nấu gì với nguyên liệu có sẵn?"
async function recipesByIngredients(ingredientNames, limit = 20) {
  const models = await getModels();
  const results = hybrid.recipesByIngredients(models, ingredientNames, { limit });
  const cards = await toRecipeCards(results);
  const byId = new Map(results.map((item) => [item.recipeId, item]));
  return cards.map((card) => ({
    ...card,
    matched_ingredients: byId.get(card.id)?.matched,
    missing_ingredients: byId.get(card.id)?.missing,
    ingredient_coverage: byId.get(card.id)?.coverage,
  }));
}

// Món phổ biến (dùng mô hình đã tính sẵn, không phải tải lại toàn bộ dữ liệu)
// filter: null | 'breakfast' | 'lunch' | 'dinner' | 'vegetarian' | 'quick'
async function popularRecipes(limit = 16, filter = null) {
  const models = await getModels();
  return toRecipeCards(hybrid.popularRecipes(models, { limit, filter }));
}

// Giải thích vì sao người dùng nhận được danh sách này (dùng khi demo/thuyết trình)
async function explainForUser(userId) {
  const [models, userItems] = await Promise.all([getModels(), loadUserItems(userId)]);
  const interacted = [...userItems.values()].filter((score) => score > 0).length;
  return {
    interactedRecipes: interacted,
    strategy: hybrid.chooseStrategy(userItems),
    settings: hybrid.SETTINGS,
    model: {
      recipes: models.content.ids.length,
      usersWithHistory: models.cf.userCount,
      builtAt: models.builtAt,
    },
  };
}

module.exports = {
  getModels,
  recommendForUser,
  similarRecipes,
  recipesByIngredients,
  popularRecipes,
  explainForUser,
  POPULAR_FILTERS: Object.keys(hybrid.POPULAR_FILTERS),
};
