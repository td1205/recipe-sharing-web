import React from 'react';
import SkeletonLoader from './SkeletonLoader';

export default function AdminDataPanel({
  resource,
  onRetry,
  onPage,
  children,
}) {
  const { loading, error, data } = resource;
  if (loading)
    return (
      <div aria-busy="true" aria-label="Đang tải dữ liệu">
        <SkeletonLoader />
      </div>
    );
  if (error)
    return (
      <div className="admin-alert-error" role="alert">
        {error}{' '}
        <button className="admin-range-btn" onClick={onRetry}>
          Thử lại
        </button>
      </div>
    );
  if (!data) return null;
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  return (
    <>
      <p className="admin-page-sub" role="status">
        {data.total.toLocaleString('vi-VN')} kết quả
      </p>
      <div
        className="admin-table-box"
        role="region"
        aria-label="Bảng dữ liệu quản trị"
        tabIndex={0}
      >
        {children}
      </div>
      {!data.items.length && (
        <p className="admin-empty-cell">Không có dữ liệu phù hợp.</p>
      )}
      <nav className="admin-pagination" aria-label="Phân trang">
        <span>
          Trang {data.page}/{totalPages}
        </span>
        <div className="admin-toolbar-filters">
          <button
            className="admin-range-btn"
            disabled={data.page <= 1}
            onClick={() => onPage(data.page - 1)}
          >
            ← Trước
          </button>
          <button
            className="admin-range-btn"
            disabled={data.page >= totalPages}
            onClick={() => onPage(data.page + 1)}
          >
            Sau →
          </button>
        </div>
      </nav>
    </>
  );
}
