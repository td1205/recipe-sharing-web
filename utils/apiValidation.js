function text(value, name, max, required = true) {
  if (!required && (value === undefined || value === null)) return '';
  if (typeof value !== 'string' || (required && !value.trim()) || value.trim().length > max) {
    throw Object.assign(new Error(`${name} không hợp lệ (tối đa ${max} ký tự)`), { status: 400 });
  }
  return value.trim();
}
function email(value) {
  const result = text(value, 'Email', 100);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw Object.assign(new Error('Email không hợp lệ'), { status: 400 });
  return result;
}
function id(value) {
  if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw Object.assign(new Error('ID không hợp lệ'), { status: 400 });
  }
  return Number(value);
}
function apiError(res, error, fallback = 'Lỗi hệ thống, vui lòng thử lại!') {
  const mapped = { P2002: [409, 'Dữ liệu đã tồn tại'], P2003: [400, 'Tham chiếu dữ liệu không hợp lệ'], P2025: [404, 'Không tìm thấy dữ liệu'], P2034: [409, 'Dữ liệu vừa thay đổi, vui lòng thử lại'], P1001: [503, 'Dịch vụ dữ liệu tạm thời không khả dụng'], P1002: [503, 'Dịch vụ dữ liệu tạm thời không khả dụng'], P1017: [503, 'Dịch vụ dữ liệu tạm thời không khả dụng'] }[error.code]
    || (error.code === 'P2010' ? { '1062': [409, 'Dữ liệu đã tồn tại'], '1452': [400, 'Tham chiếu dữ liệu không hợp lệ'], '1213': [409, 'Dữ liệu vừa thay đổi, vui lòng thử lại'], '1205': [409, 'Dữ liệu đang bận, vui lòng thử lại'] }[String(error.meta?.code)] : null);
  const [status, message] = mapped || (error.status === 400 ? [400, error.message] : [500, fallback]);
  return res.status(status).json({ success: false, error: message, message });
}
function integer(value, name, fallback, min, max) {
  if (value === undefined || value === null || value === '') return fallback;
  if (!['string', 'number'].includes(typeof value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw Object.assign(new Error(`${name} không hợp lệ`), { status: 400 });
  }
  return Number(value);
}
function listingQuery(query = {}) {
  const q = {};
  for (const [key, max] of Object.entries({ search: 200, category: 100, meal_time: 100, tag: 50, duration: 20, sort: 20, view: 10 })) {
    q[key] = text(query[key], key, max, false);
  }
  q.page = integer(query.page, 'page', 1, 1, 1000000);
  q.limit = integer(query.limit, 'limit', 16, 1, 100);
  q.max_cook_time = integer(query.max_cook_time, 'max_cook_time', null, 1, 2880);
  if (query.min_rating !== undefined && query.min_rating !== '') {
    if (!['string', 'number'].includes(typeof query.min_rating) || !/^\d(?:\.\d+)?$/.test(String(query.min_rating)) || Number(query.min_rating) > 5) throw Object.assign(new Error('min_rating không hợp lệ'), { status: 400 });
    q.min_rating = Number(query.min_rating);
  }
  q.sort ||= 'newest';
  q.search = q.search.normalize('NFC');
  const sorts = ['newest', 'oldest', 'popular', 'rating', 'rating_desc', 'time_asc', 'title', 'title_asc'];
  if (q.view === 'admin') sorts.push('id_asc', 'id_desc', 'title_desc', 'rating_asc', 'ratings_asc', 'views_asc', 'views_desc');
  if (!sorts.includes(q.sort)
    || (q.duration && !['under_30', '30_60', 'over_60'].includes(q.duration))
    || (q.view && q.view !== 'admin')) throw Object.assign(new Error('Bộ lọc không hợp lệ'), { status: 400 });
  return q;
}
module.exports = { text, email, id, integer, listingQuery, apiError };
