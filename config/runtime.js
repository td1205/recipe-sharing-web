function validateRuntime(env) {
  const missing = ['DATABASE_URL', 'DB_HOST', 'DB_USER', 'DB_NAME', 'SESSION_SECRET'].filter(key => !env[key]);
  if (missing.length) throw new Error(`Thiếu cấu hình: ${missing.join(', ')}`);
  let database;
  try { database = new URL(env.DATABASE_URL); } catch { throw new Error('DATABASE_URL không hợp lệ'); }
  if (database.protocol !== 'mysql:' || !database.hostname || database.pathname.length < 2) throw new Error('DATABASE_URL phải trỏ tới MySQL database cụ thể');
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT không hợp lệ');
  if (env.NODE_ENV === 'production' && env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET cần ít nhất 32 ký tự trong production');
  if (env.DB_PORT && (!/^\d+$/.test(env.DB_PORT) || Number(env.DB_PORT) < 1 || Number(env.DB_PORT) > 65535)) throw new Error('DB_PORT không hợp lệ');
  if (env.NODE_ENV === 'production') {
    let origin;
    try { origin = new URL(env.APP_ORIGIN); } catch { throw new Error('Production cần APP_ORIGIN HTTPS hợp lệ'); }
    if (origin.protocol !== 'https:' || origin.origin !== env.APP_ORIGIN || origin.username || origin.password) throw new Error('Production cần APP_ORIGIN HTTPS không chứa path hoặc credentials');
    if (env.TRUST_PROXY && /^(true|\d+)$/i.test(env.TRUST_PROXY)) throw new Error('TRUST_PROXY phải là IP/subnet được tin cậy');
  }
  return { port };
}
module.exports = { validateRuntime };
