const crypto = require('crypto');
const { fingerprint, normaliseRemember } = require('../utils/sessionAuth');
const { getSessionStore } = require('../config/sessionStore');

// Token Bearer cho client không dùng cookie (Flutter).
// Cơ chế: dùng lại bảng `sessions` của express-mysql-session —
// - Chỉ lưu SHA-256 của token làm session_id, DB không giữ token thô.
// - Dữ liệu phiên là JSON giống session cookie: { cookie, user, authFingerprint }.
// Nhờ đó middleware đồng bộ tài khoản bị khóa / đổi mật khẩu / đổi quyền
// (refreshSessionUser) hoạt động cho token y hệt session web.
const TOKEN_BYTES = 32; // 32 byte -> 64 ký tự hex
const TOKEN_FORMAT = /^[a-f0-9]{64}$/;
const TTL_REMEMBER_MS = 1000 * 60 * 60 * 24 * 30; // "ghi nhớ": 30 ngày
const TTL_DEFAULT_MS = 1000 * 60 * 60 * 24; // không ghi nhớ: 1 ngày

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Phát hành token mới cho một user đã xác thực (kết quả authService.login).
// Trả userdata đã lọc trường nhạy cảm (password/otp).
async function issueToken(rawUser, rawRemember) {
  const remember = normaliseRemember(rawRemember);
  const ttlMs = remember ? TTL_REMEMBER_MS : TTL_DEFAULT_MS;
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const sid = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);
  await getSessionStore().set(sid, {
    cookie: { expires: expiresAt, maxAge: ttlMs, httpOnly: true, secure: 'auto', sameSite: 'lax' },
    user: {
      id: rawUser.id,
      username: rawUser.username,
      email: rawUser.email,
      role: rawUser.role,
    },
    authFingerprint: fingerprint(rawUser.password),
  });
  return {
    token,
    expiresAt,
    user: {
      id: rawUser.id,
      username: rawUser.username,
      email: rawUser.email,
      role: rawUser.role,
    },
  };
}

// Xác thực token: trả về dữ liệu phiên, hoặc null khi sai/hết hạn.
// Store chặn hết hạn khi đọc; kiểm tra lại chặt ở đây để mọi store (kể cả
// MemoryStore trong kiểm thử) đều có hành vi thống nhất.
async function resolveToken(token) {
  if (typeof token !== 'string' || !TOKEN_FORMAT.test(token)) return null;
  const sid = hashToken(token);
  let data;
  try {
    data = await getSessionStore().get(sid);
  } catch (error) {
    console.error('Lỗi đọc token từ store:', error.code || error.name);
    return null;
  }
  if (!data || !data.user) return null;
  const expiresAt = data.cookie?.expires ? new Date(data.cookie.expires).getTime() : 0;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await getSessionStore().destroy(sid).catch(() => {});
    return null;
  }
  return { sid, user: data.user, authFingerprint: data.authFingerprint, expiresAt };
}

// Thu hồi token theo hash (dùng khi logout qua token, hoặc khi admin khóa/xóa user
// thông qua refreshSessionUser destroy session).
async function destroyTokenByHash(sid) {
  if (typeof sid !== 'string' || !/^[a-f0-9]{64}$/.test(sid)) return;
  await getSessionStore().destroy(sid);
}

function publicTokenUser(user) {
  return { id: user.id, username: user.username, email: user.email, role: user.role };
}

module.exports = {
  TOKEN_FORMAT,
  issueToken,
  resolveToken,
  destroyTokenByHash,
  publicTokenUser,
};
