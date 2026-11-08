import React, { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import AdminPageHeader from '../../components/AdminPageHeader';
import SkeletonLoader from '../../components/SkeletonLoader';
import useAdminResource from '../../hooks/useAdminResource';

const descriptions = {
  Popularity:
    'Xếp hạng theo mức độ phổ biến; dùng khi chưa có lịch sử phù hợp.',
  CBF: 'So khớp nội dung công thức bằng TF-IDF và hồ sơ sở thích.',
  'Item-CF': 'Lọc cộng tác giữa các món dựa trên tương tác người dùng.',
  Hybrid: 'Kết hợp CBF và Item-CF theo lượng lịch sử tương tác, có fallback.',
};
const statuses = {
  not_built: 'Chưa dựng mô hình',
  building: 'Đang dựng mô hình',
  stale: 'Mô hình đã cũ',
  ready: 'Sẵn sàng',
};
export default function Recommender() {
  const [revision, setRevision] = useState(0);
  const { loading, error, data } = useAdminResource(
    '/api/admin/recommender',
    {},
    revision,
    'model',
  );
  const model = data?.model;
  return (
    <AdminLayout title="Hệ thống gợi ý">
      <div className="admin-shell">
        <AdminPageHeader
          title="Hệ thống gợi ý"
          subtitle="Trạng thái bộ nhớ của tiến trình đang phục vụ yêu cầu. Làm mới chỉ đọc trạng thái, không dựng lại mô hình."
          actions={
            <button
              className="admin-range-btn"
              disabled={loading}
              onClick={() => setRevision((value) => value + 1)}
            >
              Làm mới trạng thái
            </button>
          }
        />
        {loading ? (
          <SkeletonLoader />
        ) : error ? (
          <div role="alert" className="admin-alert-error">
            {error}
          </div>
        ) : (
          model && (
            <>
              <div className="admin-kpi-grid">
                {[
                  ['Trạng thái', statuses[model.status]],
                  [
                    'Công thức trong mô hình',
                    model.counts?.recipes ?? 'Chưa có dữ liệu',
                  ],
                  [
                    'Tương tác nguồn',
                    model.counts?.interactions ?? 'Chưa có dữ liệu',
                  ],
                  [
                    'Người dùng có lịch sử',
                    model.counts?.usersWithHistory ?? 'Chưa có dữ liệu',
                  ],
                ].map(([label, value]) => (
                  <div className="admin-kpi" key={label}>
                    <div className="admin-kpi-label">{label}</div>
                    <div className="admin-model-value">
                      {typeof value === 'number'
                        ? value.toLocaleString('vi-VN')
                        : value}
                    </div>
                  </div>
                ))}
              </div>
              <p>
                Cập nhật thành công:{' '}
                {model.builtAt
                  ? new Date(model.builtAt).toLocaleString('vi-VN')
                  : 'Chưa dựng mô hình trong tiến trình này'}
                .
              </p>
              <p>
                Chu kỳ làm mới: {model.rebuildIntervalMs / 60000} phút, được
                kiểm tra khi có yêu cầu gợi ý.
              </p>
              {model.lastFailedAt && (
                <p role="status" className="admin-alert-error">
                  Lần dựng lỗi gần nhất:{' '}
                  {new Date(model.lastFailedAt).toLocaleString('vi-VN')}. Hệ
                  thống giữ mô hình cũ nếu có.
                </p>
              )}
              <div className="admin-table-box">
                <table className="admin-card-table">
                  <caption className="admin-sr-only">
                    Các thuật toán đã triển khai
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Thuật toán</th>
                      <th scope="col">Vai trò</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.algorithms.map((name) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td className="admin-text-wrap">
                          {descriptions[name]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h2 className="admin-section-title">Thông số hiện tại</h2>
              <dl className="admin-settings">
                {Object.entries(model.settings).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
              <p className="admin-page-sub">
                Số lượng phản ánh dữ liệu tại lần dựng thành công gần nhất.
                Trang này không cung cấp Precision/NDCG vì chưa có kết quả đánh
                giá gắn với mô hình hiện tại.
              </p>
            </>
          )
        )}
      </div>
    </AdminLayout>
  );
}
