import { apiErrorMessage } from './apiError.js';

export class AdminResponseError extends Error {}
const object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const date = (value) =>
  value === null ||
  (typeof value === 'string' && Number.isFinite(Date.parse(value)));
function invalid() {
  throw new AdminResponseError(
    'Dữ liệu quản trị không hợp lệ. Vui lòng thử lại.',
  );
}

export function validateAdminResponse(data, kind = 'list') {
  if (!object(data)) invalid();
  if (data.success === false)
    throw new AdminResponseError(
      apiErrorMessage(
        { response: { data } },
        'Không thể tải dữ liệu quản trị.',
      ),
    );
  if (data.success !== true) invalid();
  if (kind === 'model') {
    const model = data.model;
    if (
      !object(model) ||
      !['not_built', 'building', 'stale', 'ready'].includes(model.status) ||
      !date(model.builtAt) ||
      !date(model.lastFailedAt) ||
      !integer(model.rebuildIntervalMs) ||
      model.rebuildIntervalMs === 0 ||
      !Array.isArray(model.algorithms) ||
      !model.algorithms.every((item) => typeof item === 'string') ||
      !object(model.settings) ||
      !Object.values(model.settings).every(
        (value) => typeof value === 'number' && Number.isFinite(value),
      )
    )
      invalid();
    if (
      model.counts !== null &&
      (!object(model.counts) ||
        !['recipes', 'interactions', 'usersWithHistory'].every((key) =>
          integer(model.counts[key]),
        ))
    )
      invalid();
    if (model.topPopular != null && (
      !Array.isArray(model.topPopular) || model.topPopular.length > 10 ||
      !model.topPopular.every((item, index, items) => object(item) && integer(item.id) && item.id > 0 &&
        typeof item.title === 'string' && item.title.trim() && Number.isFinite(item.score) &&
        item.score >= 0 && item.score <= 1 && (index === 0 || items[index - 1].score >= item.score)) ||
      new Set(model.topPopular.map(item => item.id)).size !== model.topPopular.length
    )) invalid();
    const evaluation = data.evaluation;
    if (evaluation != null) {
      if (!object(evaluation) || !['current', 'stale', 'not_run', 'not_configured', 'unavailable'].includes(evaluation.status) ||
          !Array.isArray(evaluation.reasons) || !evaluation.reasons.every(text => typeof text === 'string')) invalid();
      const result = evaluation.result;
      if (result != null && (!object(result) || !object(result.dataset) || !['real', 'simulated', 'unverified'].includes(result.dataset.kind) ||
          typeof result.dataset.label !== 'string' || !date(result.generatedAt) || result.generatedAt === null ||
          typeof result.runId !== 'string' || !object(result.model) || !/^[a-f0-9]{64}$/.test(result.model.sha256) ||
          !/^[a-f0-9]{64}$/.test(result.dataset.sha256) || !Array.isArray(result.limitations) || !result.limitations.every(text => typeof text === 'string') ||
          !object(result.report) || !integer(result.report.userCount) || result.report.userCount < 1 || result.report.k !== 10 ||
          !integer(result.report.runs) || result.report.runs < 1 || !Array.isArray(result.report.results) ||
          !['popular', 'content', 'cf', 'hybrid'].every(key => result.report.results.filter(row => row?.key === key).length === 1) ||
          !result.report.results.every(row => object(row) && ['hitRate', 'precision', 'recall', 'ndcg'].every(key => Number.isFinite(row[key]) && row[key] >= 0 && row[key] <= 1)))) invalid();
      if (['current', 'stale'].includes(evaluation.status) && !result) invalid();
    }
    return data;
  }
  const items = data.items ?? data.recipes;
  if (
    !Array.isArray(items) ||
    !items.every((item) => object(item) && integer(item.id) && item.id > 0) ||
    !integer(data.total) ||
    !integer(data.page) ||
    data.page < 1 ||
    !integer(data.limit) ||
    data.limit < 1 ||
    data.limit > 100 ||
    data.page > Math.max(1, Math.ceil(data.total / data.limit)) ||
    items.length !==
      Math.min(data.limit, data.total - (data.page - 1) * data.limit)
  )
    invalid();
  return { ...data, items };
}
