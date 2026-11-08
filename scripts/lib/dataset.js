// Đọc file dữ liệu ViFoodRec đã chuẩn bị (data/vifoodrec/recipes.json.gz)
// và chọn mẫu phân tầng theo danh mục.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { seededRandom } = require('../../services/recommender/evaluation');

const DEFAULT_DATASET = path.join(__dirname, '../../data/vifoodrec/recipes.json.gz');

function loadDataset(file = DEFAULT_DATASET) {
  const buffer = fs.readFileSync(file);
  const text = file.endsWith('.gz') ? zlib.gunzipSync(buffer).toString('utf8') : buffer.toString('utf8');
  return JSON.parse(text);
}

function shuffle(list, random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Lấy `limit` món, chia theo tỉ lệ từng danh mục (để danh mục nhỏ không bị mất)
function selectRecipes(recipes, limit, seed = 2024) {
  if (!limit || limit >= recipes.length) return recipes;
  const random = seededRandom(seed);
  const byCategory = new Map();
  recipes.forEach((recipe) => {
    if (!byCategory.has(recipe.category)) byCategory.set(recipe.category, []);
    byCategory.get(recipe.category).push(recipe);
  });
  const selected = [];
  byCategory.forEach((list) => {
    const quota = Math.max(1, Math.round((list.length / recipes.length) * limit));
    selected.push(...shuffle(list, random).slice(0, quota));
  });
  return shuffle(selected, random).slice(0, limit);
}

module.exports = { loadDataset, selectRecipes, shuffle, DEFAULT_DATASET };
