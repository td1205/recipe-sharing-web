const prisma = require('../config/prisma');
const validation = require('../utils/apiValidation');
const { SAFE_USER_SELECT, PUBLIC_USER_SELECT } = require('../utils/userSelect');
const { adminListQuery, escapeLike } = require('../utils/adminListQuery');

function choice(value, allowed, name) {
  const result = validation.text(value, name, 30, false);
  if (result && !allowed.includes(result))
    throw Object.assign(new Error(`${name} không hợp lệ`), { status: 400 });
  return result;
}
async function getPage(kind, query) {
  const common = {
    newest: { created_at: 'desc' },
    oldest: { created_at: 'asc' },
    id_asc: { id: 'asc' },
    id_desc: { id: 'desc' },
  };
  const configs = {
    users: {
      sorts: {
        ...common,
        name: { username: 'asc' },
        name_desc: { username: 'desc' },
        leastRecipes: { recipes: { _count: 'asc' } },
        mostRecipes: { recipes: { _count: 'desc' } },
        leastComments: { comments: { _count: 'asc' } },
        mostComments: { comments: { _count: 'desc' } },
      },
      select: {
        ...SAFE_USER_SELECT,
        _count: { select: { recipes: true, comments: true } },
      },
    },
    comments: {
      sorts: {
        ...common,
        newest: { created_at: { sort: 'desc', nulls: 'last' } },
        oldest: { created_at: { sort: 'asc', nulls: 'last' } },
        user_asc: { users: { username: 'asc' } },
        user_desc: { users: { username: 'desc' } },
        recipe_asc: { recipes: { title: 'asc' } },
        recipe_desc: { recipes: { title: 'desc' } },
      },
      include: {
        users: { select: PUBLIC_USER_SELECT },
        recipes: { select: { id: true, title: true } },
      },
    },
    categories: {
      defaultSort: 'name',
      sorts: {
        id_asc: common.id_asc,
        id_desc: common.id_desc,
        name: { name: 'asc' },
        name_desc: { name: 'desc' },
        count_asc: { recipes: { _count: 'asc' } },
        count: { recipes: { _count: 'desc' } },
      },
      include: { _count: { select: { recipes: true } } },
    },
  };
  const config = configs[kind];
  if (!config) throw new Error('Unsupported admin list');
  const q = adminListQuery(
    query,
    Object.keys(config.sorts),
    config.defaultSort,
  );
  const where = {};
  if (kind === 'users') {
    const role = choice(query.role, ['user', 'admin'], 'Vai trò');
    const status = choice(query.status, ['active', 'banned'], 'Trạng thái');
    if (role) where.role = role === 'user' ? { in: ['user'] } : role;
    if (role === 'user') where.OR = [{ role: 'user' }, { role: null }];
    if (status)
      where.AND = [
        status === 'banned'
          ? { is_banned: true }
          : { OR: [{ is_banned: false }, { is_banned: null }] },
      ];
    if (role === 'user') delete where.role;
  }
  if (q.search) {
    const contains = escapeLike(q.search);
    const fields =
      kind === 'users'
        ? [
            { username: { contains } },
            { fullname: { contains } },
            { email: { contains } },
          ]
        : kind === 'categories'
          ? [{ name: { contains } }, { description: { contains } }]
          : [
              { content: { contains } },
              { users: { username: { contains } } },
              { recipes: { title: { contains } } },
            ];
    where.AND = [...(where.AND || []), { OR: fields }];
  }
  return prisma.$transaction(
    async (tx) => {
      const total = await tx[kind].count({ where });
      const page = Math.min(q.page, Math.max(1, Math.ceil(total / q.limit)));
      const items = await tx[kind].findMany({
        where,
        orderBy: [config.sorts[q.sort], { id: 'asc' }],
        take: q.limit,
        skip: (page - 1) * q.limit,
        ...(config.select
          ? { select: config.select }
          : { include: config.include }),
      });
      return { items, total, page, limit: q.limit };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
module.exports = { getPage };
