import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginRequiredModal.css';

/**
 * Centred alert shown when a logged-out visitor triggers a gated action.
 * The page behind is dimmed; "Đăng nhập" continues to /login, "Bỏ qua" dismisses.
 */
const LoginRequiredModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const primaryButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    // Stop the page behind from scrolling while the alert is up.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    primaryButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const goToLogin = () => {
    onClose();
    navigate('/login');
  };

  return (
    <div className="login-required-overlay" onClick={onClose}>
      <div
        className="login-required-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="login-required-title" id="login-required-title">
          Chức năng này yêu cầu đăng nhập
        </h2>

        <div className="login-required-actions">
          <button
            type="button"
            ref={primaryButtonRef}
            className="login-required-btn login-required-btn-primary"
            onClick={goToLogin}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className="login-required-btn login-required-btn-secondary"
            onClick={onClose}
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRequiredModal;