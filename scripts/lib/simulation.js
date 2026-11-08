// ============================================================================
// SINH NGƯỜI DÙNG MÔ PHỎNG CÓ "GU" RÕ RÀNG
// ============================================================================
// Mục đích: web mới chưa có người dùng thật, nên cần dữ liệu tương tác để
// thuật toán CF có cái để học và để đo chất lượng gợi ý.
//
// Khác với ratings.csv của ViFoodRec (điểm ngẫu nhiên hoàn toàn), ở đây mỗi
// người dùng có 1-2 "gu" (persona) và hành xử nhất quán với gu đó:
//   - 75% món họ xem thuộc gu của họ, 25% là món bất kỳ (khám phá).
//   - Món đúng gu: dễ được yêu thích, chấm 4-5 sao.
//   - Món không đúng gu: hiếm khi yêu thích, chấm 2-4 sao.
//   - Mỗi món có một "độ hấp dẫn" ẩn: món hấp dẫn được nhiều người chọn hơn
//     -> tạo ra món "hot" và các cặp món hay được thích cùng nhau (tín hiệu CF).
//
// Lưu ý khi báo cáo: đây là dữ liệu MÔ PHỎNG, cần nói rõ khi trình bày kết quả.
// ============================================================================

const { seededRandom } = require('../../services/recommender/evaluation');

const hasTag = (recipe, tag) => (recipe.tags || []).includes(tag);
const inCategories = (recipe, names) => names.includes(recipe.categoryName);

const PERSONAS = [
  { key: 'chay', label: 'Người ăn chay', match: (r) => hasTag(r, 'món chay') },
  { key: 'haisan', label: 'Tín đồ hải sản', match: (r) => hasTag(r, 'hải sản') || hasTag(r, 'cá') },
  { key: 'nuonglau', label: 'Mê đồ nướng & lẩu', match: (r) => inCategories(r, ['Món Nướng', 'Món Lẩu']) },
  { key: 'healthy', label: 'Ăn uống lành mạnh', match: (r) => inCategories(r, ['Gỏi & Salad', 'Món Hấp', 'Món Luộc']) },
  { key: 'ngot', label: 'Hảo ngọt', match: (r) => inCategories(r, ['Bánh & Tráng miệng', 'Đồ uống']) },
  { key: 'comnha', label: 'Cơm nhà truyền thống', match: (r) => inCategories(r, ['Món Kho', 'Món Canh']) },
  { key: 'bo', label: 'Fan thịt bò', match: (r) => hasTag(r, 'thịt bò') },
  { key: 'ga', label: 'Fan món gà', match: (r) => hasTag(r, 'thịt gà') },
  { key: 'chien', label: 'Đồ chiên giòn', match: (r) => inCategories(r, ['Món Chiên']) },
  { key: 'bunpho', label: 'Bún, phở, mì', match: (r) => inCategories(r, ['Cơm, Bún, Phở & Mì']) },
];

// Chọn k phần tử không lặp, xác suất tỉ lệ với trọng số
function weightedSample(items, weights, k, random) {
  const pool = items.map((item, index) => ({ item, weight: weights[index] }));
  const chosen = [];
  let total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  while (chosen.length < k && pool.length > 0 && total > 0) {
    let target = random() * total;
    let index = 0;
    while (index < pool.length - 1 && target >= pool[index].weight) {
      target -= pool[index].weight;
      index += 1;
    }
    const [entry] = pool.splice(index, 1);
    total -= entry.weight;
    chosen.push(entry.item);
  }
  return chosen;
}

// recipes: [{ id, title, categoryName, tags: [tên tag] }]
// -> { users: [{ index, personas: [...] }], interactions: [{ userIndex, recipeId, type, stars?, date }] }
function simulate(recipes, { userCount = 120, seed = 7, minViews = 25, maxViews = 70, days = 60 } = {}) {
  const random = seededRandom(seed);
  const appeal = new Map(recipes.map((recipe) => [recipe.id, random()]));
  const pickWeight = (recipe) => 0.05 + appeal.get(recipe.id) ** 3;
  const now = Date.now();
  const randomDate = () => new Date(now - random() * days * 24 * 3600 * 1000);

  const users = [];
  const interactions = [];
  for (let index = 0; index < userCount; index += 1) {
    const primary = PERSONAS[index % PERSONAS.length];
    const personas = [primary];
    if (random() < 0.35) {
      const secondary = PERSONAS[Math.floor(random() * PERSONAS.length)];
      if (secondary !== primary) personas.push(secondary);
    }
    users.push({ index, personas: personas.map((persona) => persona.key), labels: personas.map((p) => p.label) });

    const matches = (recipe) => personas.some((persona) => persona.match(recipe));
    const pool = recipes.filter(matches);
    const viewCount = minViews + Math.floor(random() * (maxViews - minViews + 1));
    const inPersonaCount = Math.min(pool.length, Math.round(viewCount * 0.75));
    const fromPool = weightedSample(pool, pool.map(pickWeight), inPersonaCount, random);
    const chosenIds = new Set(fromPool.map((recipe) => recipe.id));
    const others = recipes.filter((recipe) => !chosenIds.has(recipe.id));
    const explore = weightedSample(others, others.map(pickWeight), viewCount - fromPool.length, random);

    [...fromPool, ...explore].forEach((recipe) => {
      const likesIt = matches(recipe);
      const quality = appeal.get(recipe.id);
      const viewedAt = randomDate();
      interactions.push({ userIndex: index, recipeId: recipe.id, type: 'view', date: viewedAt });

      const favoriteChance = likesIt ? 0.25 + 0.5 * quality : 0.03 + 0.1 * quality;
      if (random() < favoriteChance) {
        interactions.push({ userIndex: index, recipeId: recipe.id, type: 'favorite', date: viewedAt });
      }
      if (random() < 0.35) {
        const noise = (random() - 0.5) * 1.4;
        const stars = Math.max(1, Math.min(5, Math.round((likesIt ? 3.8 : 2.6) + 1.4 * quality + noise)));
        interactions.push({ userIndex: index, recipeId: recipe.id, type: 'rating', stars, date: viewedAt });
      }
    });
  }
  return { users, interactions };
}

module.exports = { simulate, PERSONAS };
