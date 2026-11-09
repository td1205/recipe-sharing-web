// Offline results only. No database access and no evaluation in HTTP requests.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const MODEL_FILES = ['hybrid.js', 'contentModel.js', 'cfModel.js', 'popularity.js', 'interactions.js', 'text.js', 'evaluation.js'];
const DAY_MS = 24 * 60 * 60 * 1000;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function modelFingerprint() {
  const digest = crypto.createHash('sha256');
  for (const file of MODEL_FILES) digest.update(file).update(fs.readFileSync(path.join(__dirname, file)));
  return digest.digest('hex');
}
// Identity of the modules actually loaded by this process, not a later edit on disk.
const runtimeFingerprint = modelFingerprint();
function config(env = process.env) {
  const defaultInput = path.resolve('.local/recommender-evaluation/input-current.json');
  return {
    input: env.RECOMMENDER_EVALUATION_DATASET ? path.resolve(env.RECOMMENDER_EVALUATION_DATASET) : fs.existsSync(defaultInput) ? defaultInput : null,
    directory: path.resolve(env.RECOMMENDER_EVALUATION_DIR || '.local/recommender-evaluation'),
  };
}
function validateResult(result) {
  const metrics = ['hitRate', 'precision', 'recall', 'ndcg'];
  if (result?.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(result.model?.sha256 || '') ||
      !/^[a-f0-9]{64}$/.test(result.dataset?.sha256 || '') || !['real', 'simulated', 'unverified'].includes(result.dataset?.kind) ||
      typeof result.dataset?.label !== 'string' || !result.dataset.label.trim() ||
      !Number.isFinite(Date.parse(result.generatedAt)) || !Number.isSafeInteger(result.report?.userCount) || result.report.userCount < 1 ||
      !Number.isSafeInteger(result.dataset.recipes) || result.dataset.recipes < 1 ||
      !Number.isSafeInteger(result.dataset.interactions) || result.dataset.interactions < 1 ||
      typeof result.runId !== 'string' || !Array.isArray(result.limitations) || !result.limitations.every(text => typeof text === 'string') ||
      !Number.isSafeInteger(result.report.runs) || result.report.runs < 1 ||
      result.report.protocol?.split !== 'seeded-random-leave-one-out' || result.report.protocol?.diversify !== true ||
      result.report?.k !== 10 || !Array.isArray(result.report?.results) ||
      !['popular', 'content', 'cf', 'hybrid'].every(key => result.report.results.filter(row => row.key === key).length === 1) ||
      !result.report.results.every(row => metrics.every(metric => Number.isFinite(row[metric]) && row[metric] >= 0 && row[metric] <= 1))) {
    throw new Error('Invalid saved evaluation result');
  }
  return result;
}
function readStatus(options = config(), expectedModel = runtimeFingerprint, now = Date.now()) {
  let result = null;
  try { result = validateResult(JSON.parse(fs.readFileSync(path.join(options.directory, 'latest.json'), 'utf8'))); }
  catch (error) {
    if (error.code !== 'ENOENT') return { status: 'unavailable', result: null, reasons: ['Không đọc được kết quả đã lưu.'], intervalHours: 24 };
  }
  const reasons = [];
  if (!options.input) reasons.push('Chưa cấu hình dataset đánh giá.');
  else {
    try {
      const datasetHash = hash(fs.readFileSync(options.input));
      if (result && result.dataset.sha256 !== datasetHash) reasons.push('Dataset đã thay đổi.');
    } catch { reasons.push('Dataset đánh giá không đọc được.'); }
  }
  if (!result) return { status: options.input ? 'not_run' : 'not_configured', result: null, reasons, intervalHours: 24 };
  if (result.model.sha256 !== expectedModel) reasons.push('Thuật toán hoặc cấu hình đã thay đổi.');
  if (now - Date.parse(result.generatedAt) >= DAY_MS) reasons.push('Đã đến lịch đánh giá hằng ngày.');
  return { status: reasons.length ? 'stale' : 'current', result, reasons, intervalHours: 24 };
}
function runEvaluation(options = config(), { force = false } = {}) {
  if (!options.input) throw new Error('Set RECOMMENDER_EVALUATION_DATASET to a verified offline JSON dataset');
  fs.mkdirSync(options.directory, { recursive: true });
  const lock = path.join(options.directory, 'running.lock');
  let handle;
  try { handle = fs.openSync(lock, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') return { status: 'already_running' }; throw error; }
  try {
    fs.writeFileSync(handle, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    const fingerprint = modelFingerprint();
    const existing = readStatus(options, fingerprint);
    if (!force && existing.status === 'current') return { status: 'unchanged' };
    const beforeDataset = hash(fs.readFileSync(options.input));
    const { evaluateFile } = require('../../scripts/evaluate-recommender-offline');
    const result = evaluateFile(options.input);
    if (result.dataset.kind === 'unverified') result.limitations.push('Snapshot chưa phân tách nguồn tương tác thật/mô phỏng; không suy rộng thành hiệu quả trên người dùng thật.');
    result.limitations.push('Chỉ đánh giá tương tác có mã người dùng; không đưa lượt xem ẩn danh vào giao thức offline này.');
    if (result.model.sha256 !== fingerprint || modelFingerprint() !== fingerprint ||
        result.dataset.sha256 !== beforeDataset || hash(fs.readFileSync(options.input)) !== beforeDataset) {
      throw new Error('Source or dataset changed during evaluation; result not published');
    }
    let commit = null, worktreeDirty = null;
    try {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      worktreeDirty = !!execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
    } catch { /* Fingerprint remains the source identity when Git is unavailable. */ }
    const runId = crypto.randomUUID();
    const saved = validateResult({ ...result, schemaVersion: 1, runId, source: { commit, worktreeDirty },
    });
    const bytes = JSON.stringify(saved, null, 2);
    fs.writeFileSync(path.join(options.directory, `${runId}.json`), bytes, { flag: 'wx', mode: 0o600 });
    const temporary = path.join(options.directory, `${runId}.tmp`);
    fs.writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, path.join(options.directory, 'latest.json'));
    return { status: 'published', runId };
  } finally { fs.closeSync(handle); fs.unlinkSync(lock); }
}
module.exports = { config, modelFingerprint, readStatus, runEvaluation, validateResult, DAY_MS };
