function readiness({ probeDatabase, probeSessions, isDraining = () => false, timeoutMs = 2000 }) {
  return async (_req, res) => {
    if (isDraining()) return res.status(503).json({ success: false, error: 'Máy chủ đang dừng', message: 'Máy chủ đang dừng' });
    let timer;
    try {
      await Promise.race([
        Promise.all([probeDatabase(), probeSessions()]),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('READINESS_TIMEOUT')), timeoutMs); }),
      ]);
      return res.json({ success: true });
    } catch {
      return res.status(503).json({ success: false, error: 'Dịch vụ chưa sẵn sàng', message: 'Dịch vụ chưa sẵn sàng' });
    } finally { clearTimeout(timer); }
  };
}
module.exports = { readiness };
