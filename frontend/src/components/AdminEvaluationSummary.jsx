const labels = { popular: 'Popularity', content: 'Content-Based', cf: 'Item-CF', hybrid: 'Hybrid' };
const statuses = { current: 'Kết quả hiện hành', stale: 'Cần đánh giá lại', not_run: 'Chưa chạy đánh giá',
  not_configured: 'Chưa cấu hình dữ liệu đánh giá', unavailable: 'Không đọc được kết quả' };
const percentage = value => `${(value * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
export default function AdminEvaluationSummary({ evaluation }) {
  const result = evaluation?.result;
  const rows = result?.report.results.filter(row => labels[row.key]) || [];
  return (
    <section className="admin-ranking" aria-labelledby="evaluation-title">
      <h2 id="evaluation-title" className="admin-section-title">Đánh giá thuật toán offline</h2>
      <p role="status"><strong>{statuses[evaluation?.status] || 'Chưa có kết quả đánh giá'}</strong></p>
      {evaluation?.reasons?.map(reason => <p className="admin-page-sub" key={reason}>{reason}</p>)}
      {result ? <>
        <p className="admin-page-sub">
          Lần chạy: {new Date(result.generatedAt).toLocaleString('vi-VN')}. Dữ liệu: {result.dataset.label}
          {' '}({result.dataset.kind === 'real' ? 'tương tác thật' : result.dataset.kind === 'simulated' ? 'tương tác mô phỏng' : 'nguồn tương tác chưa phân tách thật/mô phỏng'}).
          {' '}{result.dataset.recipes?.toLocaleString('vi-VN')} công thức;
          {' '}{result.report.userCount.toLocaleString('vi-VN')} người dùng đủ điều kiện; {result.report.runs} seed.
          {' '}Chia tập ngẫu nhiên leave-one-out, Top-{result.report.k}, có đa dạng hóa.
        </p>
        <p className="admin-page-sub">Biểu đồ HitRate@10: tỷ lệ tìm lại món đã giấu trong 10 gợi ý. Không phải mức độ an toàn hoặc tỷ lệ hài lòng người dùng.</p>
        <ol className="admin-ranking-list" aria-label="So sánh HitRate@10 giữa các thuật toán">
          {rows.map(row => <li key={row.key}><div className="admin-ranking-item">
            <div className="admin-ranking-heading"><span>{labels[row.key]}</span><span className="admin-ranking-score">{percentage(row.hitRate)}</span></div>
            <div className="admin-ranking-track" aria-hidden="true"><span style={{ width: `${row.hitRate * 100}%` }} /></div>
          </div></li>)}
        </ol>
        <div className="admin-table-box" tabIndex={0} role="region" aria-label="Bảng chỉ số đánh giá thuật toán">
          <table className="admin-card-table">
            <caption className="admin-sr-only">Chỉ số trung bình trên cùng dữ liệu và seed</caption>
            <thead><tr><th scope="col">Mô hình</th><th scope="col">HitRate@10</th><th scope="col">Precision@10</th><th scope="col">Recall@10</th><th scope="col">NDCG@10</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.key}><th scope="row">{labels[row.key]}</th><td>{percentage(row.hitRate)}</td><td>{percentage(row.precision)}</td><td>{percentage(row.recall)}</td><td>{row.ndcg.toLocaleString('vi-VN', { maximumFractionDigits: 4 })}</td></tr>)}</tbody>
          </table>
        </div>
        <details className="admin-model-details"><summary>Phiên bản và giới hạn thực nghiệm</summary>
          <p className="admin-page-sub">Run ID: {result.runId}. Commit: {result.source?.commit || 'Không xác định'}{result.source?.worktreeDirty ? ' (có thay đổi chưa commit)' : ''}.</p>
          <p className="admin-page-sub">Nguồn thuật toán: {result.model.sha256.slice(0, 12)}; dataset: {result.dataset.sha256.slice(0, 12)}.</p>
          {result.limitations.map(text => <p className="admin-page-sub" key={text}>{text}</p>)}
        </details>
      </> : <p className="admin-page-sub">Chưa có số liệu. Tác vụ đánh giá chạy riêng; mở hoặc làm mới trang không chạy thực nghiệm.</p>}
      <p className="admin-page-sub">Tác vụ nền kiểm tra thay đổi mỗi phút, đánh giá lại sau 24 giờ hoặc khi thuật toán/dataset đổi. Lịch chỉ hoạt động khi tiến trình đánh giá được bật; tương tác mới chỉ được đưa vào khi cập nhật snapshot dataset.</p>
    </section>
  );
}
