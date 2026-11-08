const validation = require('./apiValidation');
function adminListQuery(query, sorts, defaultSort = 'newest') {
  const sort = validation.text(query.sort, 'sort', 30, false) || defaultSort;
  if (!sorts.includes(sort))
    throw Object.assign(new Error('Sắp xếp không hợp lệ'), { status: 400 });
  return {
    page: validation.integer(query.page, 'page', 1, 1, 1000000),
    limit: validation.integer(query.limit, 'limit', 20, 1, 100),
    search: validation
      .text(query.search, 'search', 200, false)
      .normalize('NFC'),
    sort,
  };
}
const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');
function listOrder(sort) {
  const direction = ['oldest', 'id_asc'].includes(sort) ? 'asc' : 'desc';
  return sort.startsWith('id_')
    ? [{ id: direction }]
    : [{ created_at: direction }, { id: direction }];
}
module.exports = { adminListQuery, escapeLike, listOrder };
