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
