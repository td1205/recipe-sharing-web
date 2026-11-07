const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { evaluateAveraged, evaluateByHistorySize } = require('../services/recommender/evaluation');
const { SETTINGS } = require('../services/recommender/hybrid');

function validateDataset(data) {
  if (!['real', 'simulated'].includes(data.kind) || typeof data.label !== 'string' || !data.label.trim()) throw new Error('Dataset cần kind real/simulated và label; không trộn hai loại');
  if (!Array.isArray(data.recipes) || !data.recipes.length || !Array.isArray(data.interactions) || !data.interactions.length) throw new Error('Thiếu recipes hoặc interactions; không thể đo relevance');
  const ids = new Set();
  for (const recipe of data.recipes) {
    if (!Number.isSafeInteger(recipe.id) || recipe.id <= 0 || ids.has(recipe.id) || typeof recipe.title !== 'string' || !recipe.title.trim() || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.tags)
      || [...recipe.ingredients, ...recipe.tags].some(value => typeof value !== 'string')) throw new Error('Recipe ID trùng hoặc đặc trưng không hợp lệ');
    ids.add(recipe.id);
  }
  const current = new Set();
  for (const item of data.interactions) {
    if (!Number.isSafeInteger(item.userId) || item.userId <= 0 || !ids.has(item.recipeId) || !['favorite', 'rating', 'comment', 'view'].includes(item.type) || (item.kind && item.kind !== data.kind)) throw new Error('Interaction không hợp lệ hoặc trộn nguồn dữ liệu');
    if (item.type === 'rating' && (!Number.isInteger(item.stars) || item.stars < 1 || item.stars > 5)) throw new Error('Rating không hợp lệ');
    if (['rating', 'favorite'].includes(item.type)) {
      const key = `${item.userId}:${item.recipeId}:${item.type}`;
      if (current.has(key)) throw new Error('Cần một trạng thái rating/favorite hiện tại cho mỗi user–món, không phải lịch sử trùng');
      current.add(key);
    }
  }
  return data;
}
function evaluateFile(input) {
  const bytes = fs.readFileSync(input);
  const data = validateDataset(JSON.parse(bytes));
  const options = { recipes: data.recipes, interactions: data.interactions, k: 10, diversify: true };
  const report = evaluateAveraged(options);
  if (!report.userCount) throw new Error('Không có người dùng đủ 5 món thích; không xuất số liệu rỗng');
  const modules = ['hybrid.js', 'contentModel.js', 'cfModel.js', 'popularity.js', 'interactions.js', 'text.js', 'evaluation.js'];
  const version = crypto.createHash('sha256');
  for (const file of modules) version.update(file).update(fs.readFileSync(path.join(__dirname, '../services/recommender', file)));
  return { dataset: { kind: data.kind, label: data.label, sha256: crypto.createHash('sha256').update(bytes).digest('hex') },
    model: { sha256: version.digest('hex'), settings: SETTINGS }, generatedAt: new Date().toISOString(),
    report, coldStart: evaluateByHistorySize(options), limitations: ['Seeded random leave-one-out, chưa phải temporal hoặc A/B test', 'Recall bằng HitRate vì mỗi user giữ lại đúng một positive', 'Nguồn/provenance phải được người cung cấp dataset xác nhận'] };
}
if (require.main === module) {
  try {
    const [input, output] = process.argv.slice(2);
    if (!input || !output) throw new Error('Dùng: node scripts/evaluate-recommender-offline.js INPUT.json OUTPUT.json');
    const report = evaluateFile(input);
    fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
    console.log('Đã xuất đánh giá offline; không kết nối database hoặc dịch vụ ngoài');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validateDataset, evaluateFile };
