import React from 'react';

const ErrorState = ({
  title = 'Không thể tải dữ liệu',
  message = 'Đã xảy ra lỗi. Vui lòng thử lại.',
  onRetry,
}) => (
  <section className="page-error-state" role="alert" aria-live="polite">
    <h1>{title}</h1>
    <p>{message}</p>
    {onRetry && (
      <button type="button" className="btn-primary" onClick={onRetry}>
        Thử lại
      </button>
    )}
  </section>
);

export default ErrorState;
