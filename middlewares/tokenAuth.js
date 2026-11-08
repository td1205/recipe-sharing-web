const tokenService = require('../services/tokenService');

// Xác thực Authorization: Bearer <token> cho client không dùng cookie (Flutter).
// Web vẫn dùng session cookie: khi cookie đã có user, middleware này tự nhường.
// Khi token hợp lệ, thay req.session bằng một "facade" tối thiểu đọc được từ
// các controller hiện tại (req.session.user, authFingerprint, destroy, save)
// mà không cần sửa controller nào; destroy() sẽ thu hồi đúng token trong DB.
function createTokenSessionFacade(resolved) {
  const sid = resolved.sid;
  return {
    user: tokenService.publicTokenUser(resolved.user),
    authFingerprint: resolved.authFingerprint,
    // Đánh dấu để ghi rõ phiên này đến từ token (phục vụ debug/kiểm thử).
    tokenHash: sid,
    cookie: { maxAge: resolved.expiresAt - Date.now(), expires: new Date(resolved.expiresAt) },
    // Thu hồi token thật trong MySQL (logout / bị khóa tài khoản sẽ đi qua đây).
    destroy(callback) {
      tokenService
        .destroyTokenByHash(sid)
        .then(() => callback && callback(), (error) => callback && callback(error));
    },
    // Các thao tác ghi của luồng login không áp dụng cho token: no-op để
    // request không sinh session cookie rác, token vẫn giữ nguyên hiệu lực.
    save(callback) { if (callback) callback(); },
    regenerate(callback) { if (callback) callback(); },
    reload(callback) { if (callback) callback(); },
    // express-session gọi touch() khi commit response (kéo dài tuổi cookie).
    // Token có TTL cố định phía server nên touch là no-op: bắt buộc phải có,
    // thiếu hàm này làm response treo vĩnh viễn (bắt giữ bằng integration test).
    touch() {},
  };
}

module.exports = function tokenAuth(req, res, next) {
  // Web/session cookie có ưu tiên cao hơn: không ghi đè phiên đang hoạt động.
  if (req.session && req.session.user) return next();

  const header = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  if (!header) return next(); // Không có token: đi tiếp theo luồng web/ẩn danh như cũ.

  const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(header.trim());
  if (!match) {
    return res.status(401).json({
      success: false,
      error: 'Token không hợp lệ. Định dạng đúng: Authorization: Bearer <token>.',
    });
  }

  return tokenService
    .resolveToken(match[1].toLowerCase())
    .then((resolved) => {
      if (!resolved) {
        return res.status(401).json({
          success: false,
          error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
        });
      }
      req.isTokenAuth = true;
      req.tokenHash = resolved.sid;
      // sessionID dùng cho dedupe lượt xem theo thiết bị token.
      req.sessionID = `token-${resolved.sid}`;
      req.session = createTokenSessionFacade(resolved);
      res.locals.user = req.session.user;
      return next();
    })
    .catch((error) => next(error));
};
