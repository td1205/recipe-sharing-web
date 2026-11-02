import React, { useEffect, useRef } from 'react';
import './LoginRequiredModal.css';

/**
 * Hộp thoại xác nhận dùng chung (vd xoá công thức). Dùng lại giao diện của LoginRequiredModal.
 * Esc hoặc bấm ra ngoài để huỷ; nút "Huỷ" được focus sẵn để tránh xoá nhầm khi nhấn Enter.
 */
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  return (
    <div className="login-required-overlay" onClick={() => !busy && onClose()}>
      <div
        className="login-required-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={message ? 'confirm-dialog-message' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="login-required-title" id="confirm-dialog-title" style={message ? { marginBottom: 'var(--space-3)' } : undefined}>
          {title}
        </h2>
        {message && (
          <p id="confirm-dialog-message" style={{ margin: '0 0 var(--space-5)', color: 'var(--color-text-muted)' }}>
            {message}
          </p>
        )}
        <div className="login-required-actions">
          <button
            type="button"
            className="login-required-btn login-required-btn-primary"
            style={danger ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : undefined}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Đang xử lý...' : confirmLabel}
          </button>
          <button
            type="button"
            ref={cancelRef}
            className="login-required-btn login-required-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
