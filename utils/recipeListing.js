// In-memory reference oracle for legacy listing regression tests; production paging uses recipeListingRepository SQL.
function listPage(recipes, query) {
  const normalize = value => String(value || '').trim().toLocaleLowerCase('vi-VN');
  const time = recipe => Number(recipe.prep_time || 0) + Number(recipe.cook_time || 0);
  let list = recipes.filter(recipe => {
    const category = normalize(query.category);
    if (category && !['công thức', 'tất cả', 'tất cả công thức'].includes(category)
      && String(recipe.category_id) !== String(query.category) && normalize(recipe.category_name) !== category) return false;
    if (query.meal_time && String(recipe.meal_time_id) !== String(query.meal_time) && normalize(recipe.meal_time_name) !== normalize(query.meal_time)) return false;
    const duration = time(recipe);
    if ((query.duration || query.max_cook_time) && duration <= 0) return false;
    if (query.duration === 'under_30' && duration > 30) return false;
    if (query.duration === '30_60' && (duration <= 30 || duration > 60)) return false;
    if (query.duration === 'over_60' && duration <= 60) return false;
    if (!query.duration && Number(query.max_cook_time) > 0 && duration > Number(query.max_cook_time)) return false;
    if (Number(recipe.avg_rating || 0) < (Number(query.min_rating) || 0)) return false;
    if (query.tag && !recipe.tag_names.some(name => normalize(name) === normalize(query.tag))) return false;
    const searchable = query.view === 'admin'
      ? [recipe.title, recipe.author_name]
      : [recipe.title, recipe.description, ...(recipe.ingredient_names || []), ...(recipe.tag_names || []), recipe.category_name];
    return !query.search || normalize(searchable.join(' ')).includes(normalize(query.search));
  });
  list = list.sort((a, b) => {
    switch (query.sort) {
      case 'oldest': return new Date(a.created_at) - new Date(b.created_at) || a.id - b.id;
      case 'popular': return query.view === 'admin' ? b.total_ratings - a.total_ratings || b.id - a.id : b.view_count - a.view_count || b.id - a.id;
      case 'rating': case 'rating_desc': return b.avg_rating - a.avg_rating || b.total_ratings - a.total_ratings || b.id - a.id;
      case 'time_asc': return (time(a) || Infinity) - (time(b) || Infinity) || a.id - b.id;
      case 'title': case 'title_asc': return a.title.localeCompare(b.title, 'vi') || a.id - b.id;
      default: return new Date(b.created_at) - new Date(a.created_at) || b.id - a.id;
    }
  });
  const limit = Math.max(1, Math.min(100, Math.floor(Number(query.limit) || 16)));
  const total = list.length;
  const page = Math.max(1, Math.min(Math.max(1, Math.ceil(total / limit)), Math.floor(Number(query.page) || 1)));
  return { recipes: list.slice((page - 1) * limit, page * limit), total, page, limit };
}
module.exports = { listPage };
