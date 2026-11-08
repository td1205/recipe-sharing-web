const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { PUBLIC_USER_SELECT } = require('../utils/userSelect');
const { listingQuery } = require('../utils/apiValidation');

function buildListing(query) {
  const q = listingQuery(query);
  const conditions = [Prisma.sql`1 = 1`];
  const like = value => `%${value.replace(/[=%_]/g, '=$&')}%`;
  if (q.category && !['công thức', 'tất cả', 'tất cả công thức'].includes(q.category.toLocaleLowerCase('vi-VN'))) {
    conditions.push(/^\d+$/.test(q.category) ? Prisma.sql`r.category_id = ${Number(q.category)}` : Prisma.sql`c.name = ${q.category}`);
  }
  if (q.meal_time) conditions.push(/^\d+$/.test(q.meal_time) ? Prisma.sql`r.meal_time_id = ${Number(q.meal_time)}` : Prisma.sql`m.name = ${q.meal_time}`);
  const duration = Prisma.sql`(r.prep_time + r.cook_time)`;
  if (q.duration || q.max_cook_time) conditions.push(Prisma.sql`${duration} > 0`);
  if (q.duration === 'under_30') conditions.push(Prisma.sql`${duration} <= 30`);
  if (q.duration === '30_60') conditions.push(Prisma.sql`${duration} > 30 AND ${duration} <= 60`);
  if (q.duration === 'over_60') conditions.push(Prisma.sql`${duration} > 60`);
  if (!q.duration && q.max_cook_time) conditions.push(Prisma.sql`${duration} <= ${q.max_cook_time}`);
  if (q.min_rating) conditions.push(Prisma.sql`COALESCE(a.avg_rating, 0) >= ${q.min_rating}`);
  if (q.tag) conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM tags t WHERE t.name = ${q.tag} AND (
    EXISTS (SELECT 1 FROM recipe_tags rt WHERE rt.recipe_id = r.id AND rt.tag_id = t.id)
    OR EXISTS (SELECT 1 FROM user_tag_votes tv WHERE tv.recipe_id = r.id AND tv.tag_id = t.id)))`);
  if (q.search) {
    const pattern = like(q.search);
    conditions.push(q.view === 'admin'
      ? Prisma.sql`(r.title LIKE ${pattern} ESCAPE '=' OR COALESCE(NULLIF(u.fullname, ''), u.username) LIKE ${pattern} ESCAPE '=')`
      : Prisma.sql`(r.title LIKE ${pattern} ESCAPE '=' OR r.description LIKE ${pattern} ESCAPE '='
        OR c.name LIKE ${pattern} ESCAPE '='
        OR EXISTS (SELECT 1 FROM ingredients i WHERE i.recipe_id = r.id AND i.name LIKE ${pattern} ESCAPE '=')
        OR EXISTS (SELECT 1 FROM tags t WHERE t.name LIKE ${pattern} ESCAPE '=' AND (
          EXISTS (SELECT 1 FROM recipe_tags rt WHERE rt.recipe_id = r.id AND rt.tag_id = t.id)
          OR EXISTS (SELECT 1 FROM user_tag_votes tv WHERE tv.recipe_id = r.id AND tv.tag_id = t.id))))`);
  }
  const order = {
    newest: Prisma.sql`r.created_at DESC, r.id DESC`, oldest: Prisma.sql`r.created_at ASC, r.id ASC`,
    title: Prisma.sql`r.title ASC, r.id ASC`, title_asc: Prisma.sql`r.title ASC, r.id ASC`,
    rating: Prisma.sql`COALESCE(a.avg_rating,0) DESC, COALESCE(a.total_ratings,0) DESC, r.id DESC`,
    rating_desc: Prisma.sql`COALESCE(a.avg_rating,0) DESC, COALESCE(a.total_ratings,0) DESC, r.id DESC`,
    time_asc: Prisma.sql`CASE WHEN ${duration} > 0 THEN ${duration} ELSE 2147483647 END ASC, r.id ASC`,
    popular: q.view === 'admin' ? Prisma.sql`COALESCE(a.total_ratings,0) DESC, r.id DESC` : Prisma.sql`COALESCE(v.view_count,0) DESC, r.id DESC`,
  }[q.sort];
  const from = Prisma.sql`FROM recipes r LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN categories c ON c.id = r.category_id LEFT JOIN meal_times m ON m.id = r.meal_time_id
    LEFT JOIN (SELECT recipe_id, AVG(star_count) avg_rating, COUNT(*) total_ratings FROM ratings GROUP BY recipe_id) a ON a.recipe_id = r.id
    LEFT JOIN (SELECT recipe_id, COUNT(*) view_count FROM recipe_views GROUP BY recipe_id) v ON v.recipe_id = r.id
    WHERE ${Prisma.join(conditions, ' AND ')}`;
  return { q, from, order };
}
async function getPage(query) {
  const { q, from, order } = buildListing(query);
  return prisma.$transaction(async tx => {
    const [count] = await tx.$queryRaw(Prisma.sql`SELECT COUNT(*) total ${from}`);
    const total = Number(count.total);
    const page = Math.min(q.page, Math.max(1, Math.ceil(total / q.limit)));
    const ranked = await tx.$queryRaw(Prisma.sql`SELECT r.id, COALESCE(a.avg_rating,0) avg_rating,
      COALESCE(a.total_ratings,0) total_ratings, COALESCE(v.view_count,0) view_count
      ${from} ORDER BY ${order} LIMIT ${q.limit} OFFSET ${(page - 1) * q.limit}`);
    const rows = ranked.length ? await tx.recipes.findMany({
      where: { id: { in: ranked.map(row => row.id) } },
      include: { users: { select: PUBLIC_USER_SELECT }, categories: true, meal_times: true,
        ingredients: { select: { name: true } }, recipe_tags: { select: { tags: { select: { name: true } } } },
        user_tag_votes: { select: { tags: { select: { name: true } } } } },
    }) : [];
    const byId = new Map(rows.map(row => [row.id, row]));
    return { total, page, limit: q.limit, recipes: ranked.map(rank => {
      const r = byId.get(rank.id);
      return { id: r.id, title: r.title, description: r.description, image_url: r.image_url,
        prep_time: r.prep_time, cook_time: r.cook_time, created_at: r.created_at, category_id: r.category_id,
        meal_time_id: r.meal_time_id, author_name: r.users?.fullname || r.users?.username,
        category_name: r.categories?.name, meal_time_name: r.meal_times?.name,
        ingredient_names: r.ingredients.map(i => i.name),
        tag_names: [...new Set([...r.recipe_tags, ...r.user_tag_votes].map(t => t.tags.name))],
        avg_rating: Number(rank.avg_rating), total_ratings: Number(rank.total_ratings), view_count: Number(rank.view_count) };
    }) };
  }, { isolationLevel: 'RepeatableRead' });
}
module.exports = { buildListing, getPage };
