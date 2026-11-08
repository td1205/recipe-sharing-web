import Modal from './Modal';
import './LoginRequiredModal.css';
export default function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Xác nhận', cancelLabel = 'Huỷ', busy = false, danger = false, onConfirm, onClose }) {
  if (!isOpen) return null;
  return <Modal title={title} onClose={onClose} busy={busy}>
    {message && <p className="app-modal-message">{message}</p>}
    <div className="app-modal-actions">
      <button type="button" autoFocus className="login-required-btn login-required-btn-secondary" disabled={busy} onClick={onClose}>{cancelLabel}</button>
      <button type="button" className={danger ? 'btn-delete' : 'login-required-btn login-required-btn-primary'} disabled={busy} onClick={onConfirm}>{busy ? 'Đang xử lý…' : confirmLabel}</button>
    </div>
  </Modal>;
}
