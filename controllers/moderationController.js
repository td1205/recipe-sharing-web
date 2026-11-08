const validation = require('../utils/apiValidation');
const moderation = require('../repositories/moderationRepository');
const recommender = require('../services/recommender');
const { adminListQuery } = require('../utils/adminListQuery');
const actions = [
  'user.ban',
  'user.unban',
  'user.role',
  'user.edit',
  'user.delete',
  'recipe.delete',
  'comment.delete',
  'report.resolve',
  'report.reject',
];
function choice(value, allowed, name, optional = false) {
  const result = validation.text(value, name, 50, !optional);
  if ((!optional || result) && !allowed.includes(result))
    throw Object.assign(new Error(`${name} không hợp lệ`), { status: 400 });
  return result;
}
function paging(query) {
  return adminListQuery(query, ['newest', 'oldest', 'id_asc', 'id_desc']);
}
function id(value) {
  const result = validation.id(value);
  if (result > 2147483647)
    throw Object.assign(new Error('ID không hợp lệ'), { status: 400 });
  return result;
}
const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (['P2021', 'P2022'].includes(error.code)) {
      const message = 'Chức năng quản lý báo cáo và nhật ký chưa sẵn sàng. Cần hoàn tất cập nhật cơ sở dữ liệu trên môi trường này.';
      return res.status(503).json({ success: false, code: 'MODERATION_SCHEMA_NOT_READY', error: message, message });
    }
    if (error instanceof moderation.ModerationError) {
      if (error.status === 429) res.set('Retry-After', '3600');
      return res
        .status(error.status)
        .json({ success: false, error: error.message, message: error.message });
    }
    return validation.apiError(res, error);
  }
};
module.exports = {
  create: handle(async (req, res) => {
    const type = choice(
      req.body?.target_type,
      ['recipe', 'comment'],
      'Đối tượng',
    );
    const report = await moderation.createReport(
      req.session.user.id,
      type,
      id(req.body?.target_id),
      validation.text(req.body?.reason, 'Lý do', 1000),
    );
    res
      .status(201)
      .json({
        success: true,
        report: { id: report.id, status: report.status },
      });
  }),
  reports: handle(async (req, res) =>
    res.json({
      success: true,
      ...(await moderation.listReports({
        ...paging(req.query),
        status: choice(
          req.query.status,
          ['Pending', 'Resolved', 'Rejected'],
          'Trạng thái',
          true,
        ),
        type: choice(req.query.type, ['recipe', 'comment'], 'Đối tượng', true),
      })),
    }),
  ),
  resolve: handle(async (req, res) => {
    await moderation.resolveReport(
      id(req.params.id),
      choice(req.body?.status, ['Resolved', 'Rejected'], 'Trạng thái'),
      req.session.user.id,
    );
    res.json({ success: true });
  }),
  logs: handle(async (req, res) =>
    res.json({
      success: true,
      ...(await moderation.listLogs({
        ...paging(req.query),
        action: choice(req.query.action, actions, 'Hành động', true),
        type: choice(
          req.query.type,
          ['user', 'recipe', 'comment', 'report'],
          'Đối tượng',
          true,
        ),
        adminId: req.query.admin_id ? id(req.query.admin_id) : null,
      })),
    }),
  ),
  model: handle(async (_req, res) =>
    res.json({ success: true, model: recommender.getStatus() }),
  ),
};
