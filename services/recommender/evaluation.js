// ============================================================================
// ĐÁNH GIÁ THUẬT TOÁN GỢI Ý (offline, kiểu leave-one-out)
// ============================================================================
// Với mỗi người dùng có >= 5 món đã "thích" (yêu thích hoặc >= 4 sao):
//   1. Giấu đi 1 món họ thích (chọn ngẫu nhiên, có seed để lặp lại được).
//   2. Huấn luyện mô hình trên phần dữ liệu còn lại.
//   3. Gợi ý top-K món, xem món bị giấu có nằm trong danh sách không.
//
// Chỉ số (trung bình trên tất cả người dùng được kiểm tra):
//   HitRate@K   = tỉ lệ người dùng mà món bị giấu nằm trong top-K
//                 (= Recall@K vì mỗi người chỉ giấu 1 món)
//   Precision@K = số món đúng trong top-K / K  (= HitRate / K ở đây)
//   NDCG@K      = 1 / log2(vị_trí + 1) nếu trúng, 0 nếu trượt
//                 -> trúng ở vị trí 1 được 1 điểm, vị trí 3 được 0.5 điểm...
// ============================================================================

const { buildModels, recommendForUser } = require('./hybrid');
const { likedRecipeIds } = require('./interactions');

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groupByUser(interactions) {
  const users = new Map();
  interactions.forEach((interaction) => {
    if (interaction.userId == null) return;
    if (!users.has(interaction.userId)) users.set(interaction.userId, []);
    users.get(interaction.userId).push(interaction);
  });
  return users;
}

const METHODS = [
  { key: 'random', label: 'Ngẫu nhiên (mốc so sánh)' },
  { key: 'popular', label: 'Độ phổ biến' },
  { key: 'content', label: 'Content-based (TF-IDF)' },
  { key: 'cf', label: 'Item-based CF' },
  { key: 'hybrid', label: 'Hybrid 0.3 content + 0.7 CF' },
  { key: 'auto', label: 'Hệ thống (switching)' },
];

// coldStartItems: nếu đặt (vd 3), mỗi người dùng được kiểm tra chỉ giữ lại N món
// ngẫu nhiên trong lịch sử -> mô phỏng NGƯỜI DÙNG MỚI có rất ít dữ liệu.
function evaluate({ recipes, interactions, k = 10, minLiked = 5, seed = 42, maxUsers = Infinity, coldStartItems = null }) {
  const random = seededRandom(seed);
  const byUser = groupByUser(interactions);

  // 1. Chọn món bị giấu cho từng người dùng
  const heldOut = new Map();
  [...byUser.entries()].forEach(([userId, list]) => {
    if (heldOut.size >= maxUsers) return;
    const liked = [...likedRecipeIds(list)];
    if (liked.length < minLiked) return;
    heldOut.set(userId, liked[Math.floor(random() * liked.length)]);
  });

  // 2. Dữ liệu huấn luyện = bỏ mọi tương tác của người dùng với món bị giấu
  let training = interactions.filter(
    (item) => !(heldOut.has(item.userId) && heldOut.get(item.userId) === item.recipeId),
  );
  if (coldStartItems) {
    const kept = new Map();
    heldOut.forEach((targetId, userId) => {
      const liked = [...likedRecipeIds(byUser.get(userId))].filter((id) => id !== targetId);
      const keep = new Set();
      while (keep.size < Math.min(coldStartItems, liked.length)) {
        keep.add(liked[Math.floor(random() * liked.length)]);
      }
      kept.set(userId, keep);
    });
    training = training.filter((item) => !kept.has(item.userId) || kept.get(item.userId).has(item.recipeId));
  }
  const models = buildModels({ recipes, interactions: training });
  const allIds = recipes.map((recipe) => recipe.id);

  // 3. Gợi ý và chấm điểm
  const totals = Object.fromEntries(METHODS.map((method) => [method.key, { hit: 0, ndcg: 0 }]));
  heldOut.forEach((targetId, userId) => {
    const userItems = models.userItemScores.get(userId) || new Map();
    METHODS.forEach(({ key }) => {
      let list;
      if (key === 'random') {
        const pool = allIds.filter((id) => !userItems.has(id));
        list = [];
        while (list.length < k && pool.length > 0) {
          list.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
        }
      } else {
        list = recommendForUser(models, userItems, { limit: k, strategy: key, diversify: false }).map(
          (item) => item.recipeId,
        );
      }
      const position = list.indexOf(targetId);
      if (position >= 0) {
        totals[key].hit += 1;
        totals[key].ndcg += 1 / Math.log2(position + 2);
      }
    });
  });

  const userCount = heldOut.size;
  return {
    k,
    userCount,
    recipeCount: recipes.length,
    interactionCount: interactions.length,
    results: METHODS.map(({ key, label }) => ({
      key,
      label,
      hitRate: userCount ? totals[key].hit / userCount : 0,
      precision: userCount ? totals[key].hit / userCount / k : 0,
      ndcg: userCount ? totals[key].ndcg / userCount : 0,
    })),
  };
}

// Chạy evaluate() với nhiều seed rồi lấy trung bình -> kết quả ổn định hơn
function evaluateAveraged(options, seeds = [1, 2, 3, 4, 5]) {
  const runs = seeds.map((seed) => evaluate({ ...options, seed }));
  const first = runs[0];
  return {
    ...first,
    runs: runs.length,
    results: first.results.map((row, index) => {
      const mean = (field) => runs.reduce((sum, run) => sum + run.results[index][field], 0) / runs.length;
      return { ...row, hitRate: mean('hitRate'), precision: mean('precision'), ndcg: mean('ndcg') };
    }),
  };
}

// Bảng HitRate theo số món đã biết về người dùng (1, 2, 3... món)
function evaluateByHistorySize(options, sizes = [1, 2, 3, 4], seeds = [1, 2, 3, 4, 5]) {
  return sizes.map((size) => ({
    size,
    report: evaluateAveraged({ ...options, coldStartItems: size }, seeds),
  }));
}

function formatHistoryTable(rows, k) {
  const keys = ['popular', 'content', 'cf', 'hybrid', 'auto'];
  const labels = rows[0].report.results.filter((row) => keys.includes(row.key)).map((row) => row.label);
  const lines = [
    `| Số món đã biết | ${labels.join(' | ')} |`,
    `|---|${keys.map(() => '---').join('|')}|`,
    ...rows.map(({ size, report }) => {
      const cells = keys.map((key) => {
        const row = report.results.find((item) => item.key === key);
        return `${(row.hitRate * 100).toFixed(1)}%`;
      });
      return `| ${size} món | ${cells.join(' | ')} |`;
    }),
  ];
  return `HitRate@${k}:\n\n${lines.join('\n')}`;
}

function formatTable(report) {
  const pct = (value) => `${(value * 100).toFixed(1)}%`;
  const lines = [
    `| Phương pháp | HitRate@${report.k} (= Recall@${report.k}) | Precision@${report.k} | NDCG@${report.k} |`,
    '|---|---|---|---|',
    ...report.results.map(
      (row) => `| ${row.label} | ${pct(row.hitRate)} | ${pct(row.precision)} | ${row.ndcg.toFixed(3)} |`,
    ),
  ];
  return lines.join('\n');
}

module.exports = {
  evaluate,
  evaluateAveraged,
  evaluateByHistorySize,
  formatTable,
  formatHistoryTable,
  seededRandom,
  METHODS,
};
