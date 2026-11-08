const prisma = require('../config/prisma');

class ModerationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function problem(status, message) {
  return new ModerationError(status, message);
}
async function activeAdmin(tx, id) {
  const [actor] =
    await tx.$queryRaw`SELECT id, role, is_banned FROM users WHERE id = ${id} FOR UPDATE`;
  if (!actor || actor.role !== 'admin' || actor.is_banned)
    throw problem(403, 'Không có quyền quản trị');
}

async function createReport(userId, targetType, targetId, reason) {
  return prisma.$transaction(
    async (tx) => {
      // Per-account row lock serializes quota checks across concurrent requests/processes.
      const [user] =
        await tx.$queryRaw`SELECT id, is_banned FROM users WHERE id = ${userId} FOR UPDATE`;
      if (!user || user.is_banned)
        throw problem(403, 'Tài khoản không thể gửi báo cáo');
      const target = await tx[
        targetType === 'recipe' ? 'recipes' : 'comments'
      ].findUnique({ where: { id: targetId }, select: { id: true } });
      if (!target) throw problem(404, 'Nội dung không còn tồn tại');
      const previous = await tx.content_reports.findUnique({
        where: {
          reporter_id_target_type_target_id: {
            reporter_id: userId,
            target_type: targetType,
            target_id: targetId,
          },
        },
      });
      if (previous) throw problem(409, 'Bạn đã báo cáo nội dung này');
      const count = await tx.content_reports.count({
        where: {
          reporter_id: userId,
          created_at: { gte: new Date(Date.now() - 3600000) },
        },
      });
      if (count >= 10)
        throw problem(429, 'Tối đa 10 báo cáo mỗi giờ. Vui lòng thử lại sau.');
      return tx.content_reports.create({
        data: {
          reporter_id: userId,
          target_type: targetType,
          target_id: targetId,
          recipe_id: targetType === 'recipe' ? targetId : null,
          comment_id: targetType === 'comment' ? targetId : null,
          reason,
        },
      });
    },
    { isolationLevel: 'ReadCommitted' },
  );
}

async function resolveReport(id, status, adminId) {
  return prisma.$transaction(
    async (tx) => {
      await activeAdmin(tx, adminId);
      const result = await tx.content_reports.updateMany({
        where: { id, status: 'Pending' },
        data: { status, resolved_by: adminId, resolved_at: new Date() },
      });
      if (!result.count) {
        const exists = await tx.content_reports.findUnique({
          where: { id },
          select: { id: true },
        });
        throw problem(
          exists ? 409 : 404,
          exists
            ? 'Báo cáo đã được xử lý. Vui lòng tải lại.'
            : 'Không tìm thấy báo cáo',
        );
      }
      await tx.admin_audit_logs.create({
        data: {
          admin_id: adminId,
          action: status === 'Resolved' ? 'report.resolve' : 'report.reject',
          target_type: 'report',
          target_id: id,
        },
      });
    },
    { isolationLevel: 'ReadCommitted' },
  );
}

async function listReports({ page, limit, search, status, type }) {
  const numeric = /^\d+$/.test(search) && Number(search) <= 2147483647;
  const where = {
    ...(status && { status }),
    ...(type && { target_type: type }),
    ...(search && {
      OR: [
        { reason: { contains: search } },
        ...(numeric
          ? [{ target_id: Number(search) }, { id: Number(search) }]
          : []),
      ],
    }),
  };
  return prisma.$transaction(
    async (tx) => {
      const total = await tx.content_reports.count({ where });
      page = Math.min(page, Math.max(1, Math.ceil(total / limit)));
      const items = await tx.content_reports.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reporter: { select: { id: true, username: true } },
          resolver: { select: { id: true, username: true } },
          recipe: { select: { id: true, title: true } },
          comment: { select: { id: true, recipe_id: true, content: true } },
        },
      });
      return { items, total, page, limit };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}

async function listLogs({ page, limit, search, action, type, adminId }) {
  const numeric = /^\d+$/.test(search) && Number(search) <= 2147483647;
  const where = {
    ...(action && { action }),
    ...(type && { target_type: type }),
    ...(adminId && { admin_id: adminId }),
    ...(search && {
      OR: [
        { action: { contains: search } },
        ...(numeric
          ? [{ target_id: Number(search) }, { admin_id: Number(search) }]
          : []),
      ],
    }),
  };
  return prisma.$transaction(
    async (tx) => {
      const total = await tx.admin_audit_logs.count({ where });
      page = Math.min(page, Math.max(1, Math.ceil(total / limit)));
      const items = await tx.admin_audit_logs.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      });
      return { items, total, page, limit };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}

async function deleteContent(type, id, adminId) {
  return prisma.$transaction(
    async (tx) => {
      await activeAdmin(tx, adminId);
      await tx[type === 'recipe' ? 'recipes' : 'comments'].delete({
        where: { id },
      });
      await tx.admin_audit_logs.create({
        data: {
          admin_id: adminId,
          action: `${type}.delete`,
          target_type: type,
          target_id: id,
        },
      });
    },
    { isolationLevel: 'ReadCommitted' },
  );
}
module.exports = {
  ModerationError,
  createReport,
  resolveReport,
  listReports,
  listLogs,
  deleteContent,
};
