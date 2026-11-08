const collator = new Intl.Collator('vi', {
  numeric: true,
  sensitivity: 'base',
});

const pair = (asc, desc, label, getValue, type = 'number') => [
  {
    value: asc,
    label: `${label} ${type === 'text' ? 'A–Z' : 'tăng dần'}`,
    getValue,
    type,
    direction: 1,
  },
  {
    value: desc,
    label: `${label} ${type === 'text' ? 'Z–A' : 'giảm dần'}`,
    getValue,
    type,
    direction: -1,
  },
];
const dates = [
  {
    value: 'newest',
    label: 'Mới nhất trước',
    getValue: (row) => row.created_at,
    type: 'date',
    direction: -1,
  },
  {
    value: 'oldest',
    label: 'Cũ nhất trước',
    getValue: (row) => row.created_at,
    type: 'date',
    direction: 1,
  },
];
const ids = pair('id_asc', 'id_desc', 'ID', (row) => row.id);
export const userSortOptions = [
  ...dates,
  ...ids,
  ...pair('name', 'name_desc', 'Tên đăng nhập', (row) => row.username, 'text'),
  ...pair(
    'leastRecipes',
    'mostRecipes',
    'Số công thức',
    (row) => row._count?.recipes ?? 0,
  ),
  ...pair(
    'leastComments',
    'mostComments',
    'Số bình luận',
    (row) => row._count?.comments ?? 0,
  ),
];
export const categorySortOptions = [
  ...pair('name', 'name_desc', 'Tên', (row) => row.name, 'text'),
  ...ids,
  ...pair('count_asc', 'count', 'Số món', (row) => row._count?.recipes ?? 0),
];
export const commentSortOptions = [
  ...dates,
  ...ids,
  ...pair(
    'user_asc',
    'user_desc',
    'Người viết',
    (row) => row.users?.username,
    'text',
  ),
  ...pair(
    'recipe_asc',
    'recipe_desc',
    'Công thức',
    (row) => row.recipes?.title,
    'text',
  ),
];
// Recipe ordering is performed by the API before pagination.
export const recipeSortOptions = [
  ...dates,
  ...ids,
  ...pair('title', 'title_desc', 'Tên', (row) => row.title, 'text'),
  ...pair('rating_asc', 'rating', 'Điểm đánh giá', (row) => row.avg_rating),
  ...pair(
    'ratings_asc',
    'popular',
    'Số lượt đánh giá',
    (row) => row.total_ratings,
  ),
  ...pair('views_asc', 'views_desc', 'Lượt xem', (row) => row.view_count),
];

export function sortAdminRows(rows, sort, options) {
  const option = options.find((item) => item.value === sort) || options[0];
  const normalized = (row) => {
    const value = option.getValue(row);
    if (value == null || value === '') return null;
    if (option.type === 'text') return String(value);
    const number = option.type === 'date' ? Date.parse(value) : Number(value);
    return Number.isFinite(number) ? number : null;
  };
  return [...rows].sort((a, b) => {
    const av = normalized(a),
      bv = normalized(b);
    // Missing values remain last in either direction; ID breaks ties consistently.
    const order =
      av === null
        ? bv === null
          ? 0
          : 1
        : bv === null
          ? -1
          : option.direction *
            (option.type === 'text' ? collator.compare(av, bv) : av - bv);
    return order || Number(a.id) - Number(b.id);
  });
}
