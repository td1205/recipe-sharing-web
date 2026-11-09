// Run separately from Express: evaluation must not block API requests.
const { spawn } = require('node:child_process');
const { config, readStatus, modelFingerprint, runEvaluation } = require('../services/recommender/evaluationRuns');
if (process.argv.includes('--watch')) {
  if (!config().input) { console.error('Chưa cấu hình RECOMMENDER_EVALUATION_DATASET.'); process.exitCode = 1; }
  else {
    let running = false, child;
    const check = () => {
      if (running) return;
      const state = readStatus(config(), modelFingerprint());
      if (state.status === 'current') return;
      running = true;
      child = spawn(process.execPath, [__filename], { env: process.env, stdio: 'inherit', windowsHide: true });
      child.on('error', () => { running = false; console.error('Không khởi động được tiến trình đánh giá.'); });
      child.on('exit', () => { running = false; });
    };
    check();
    const timer = setInterval(check, 60000);
    const stop = () => { clearInterval(timer); /* Let active worker finish and release its lock. */ };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    console.log('Kiểm tra thay đổi mỗi phút; đánh giá lại khi source/dataset đổi hoặc kết quả đủ 24 giờ.');
  }
} else {
  try { console.log(JSON.stringify(runEvaluation(config(), { force: process.argv.includes('--force') }))); }
  catch { console.error('Đánh giá thất bại; giữ kết quả trước đó. Kiểm tra dataset, quyền truy cập và cấu hình.'); process.exitCode = 1; }
}
