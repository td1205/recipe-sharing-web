import React, { useEffect, useState } from 'react';
import './Pagination.css';

// Số nút trang hiển thị cùng lúc (trang hiện tại nằm giữa khi có thể)
const VISIBLE_PAGES = 5;

function getVisiblePages(currentPage, totalPages) {
  const half = Math.floor(VISIBLE_PAGES / 2);
  const start = Math.max(1, Math.min(currentPage - half, totalPages - VISIBLE_PAGES + 1));
  const end = Math.min(totalPages, start + VISIBLE_PAGES - 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

// Thanh phân trang dùng chung: « ‹ 7 8 [9] 10 11 › »  +  ô "Đến trang"
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const [jumpValue, setJumpValue] = useState('');

  useEffect(() => {
    setJumpValue('');
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const goTo = (page) => {
    const target = Math.min(Math.max(1, page), totalPages);
    if (target !== currentPage) onPageChange(target);
  };

  const handleJump = (event) => {
    event.preventDefault();
    const page = parseInt(jumpValue, 10);
    if (Number.isNaN(page)) return;
    goTo(page);
    setJumpValue('');
  };

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <div className="pager">
      <div className="pager-controls">
        <button
          type="button"
          className="pager-btn pager-btn-edge"
          onClick={() => goTo(1)}
          disabled={isFirst}
          aria-label="Trang đầu"
        >
          «
        </button>
        <button
          type="button"
          className="pager-btn"
          onClick={() => goTo(currentPage - 1)}
          disabled={isFirst}
          aria-label="Trang trước"
        >
          ‹
        </button>

        {getVisiblePages(currentPage, totalPages).map((page) => (
          <button
            key={page}
            type="button"
            className={`pager-btn ${page === currentPage ? 'is-active' : ''}`}
            onClick={() => goTo(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            aria-label={`Trang ${page}`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          className="pager-btn"
          onClick={() => goTo(currentPage + 1)}
          disabled={isLast}
          aria-label="Trang sau"
        >
          ›
        </button>
        <button
          type="button"
          className="pager-btn pager-btn-edge"
          onClick={() => goTo(totalPages)}
          disabled={isLast}
          aria-label="Trang cuối"
        >
          »
        </button>
      </div>

      {/* noValidate: tự đưa số ngoài khoảng về trang gần nhất thay vì để trình duyệt chặn */}
      <form className="pager-jump" onSubmit={handleJump} noValidate>
        <label htmlFor="pager-jump-input">Đến trang</label>
        <input
          id="pager-jump-input"
          type="number"
          inputMode="numeric"
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(event) => setJumpValue(event.target.value)}
          placeholder={String(currentPage)}
        />
        <span className="pager-jump-total">/ {totalPages}</span>
        <button type="submit" className="pager-jump-btn" disabled={jumpValue === ''}>
          Đi
        </button>
      </form>
    </div>
  );
};

export default Pagination;
