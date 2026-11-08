import React, { useContext, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import Modal from './Modal';
import { apiErrorMessage } from '../utils/apiError';
import './ReportButton.css';

export default function ReportButton({ targetType, targetId }) {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!user) return null;
  const label = targetType === 'recipe' ? 'công thức' : 'bình luận';
  const close = () => {
    if (!busy) {
      setOpen(false);
      setReason('');
      setError('');
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      await axios.post('/api/reports', {
        target_type: targetType,
        target_id: targetId,
        reason: reason.trim(),
      });
      toast.success('Đã gửi báo cáo đến quản trị viên');
      setOpen(false);
      setReason('');
    } catch (failure) {
      setError(
        apiErrorMessage(failure, 'Không thể gửi báo cáo. Vui lòng thử lại.'),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        className="report-button"
        onClick={() => setOpen(true)}
        aria-label={`Báo cáo ${label} #${targetId}`}
      >
        Báo cáo {label}
      </button>
      {open && (
        <Modal title={`Báo cáo ${label}`} busy={busy} onClose={close}>
          <form className="report-form" onSubmit={submit}>
            <label htmlFor={`report-${targetType}-${targetId}`}>
              Lý do báo cáo
            </label>
            <textarea
              id={`report-${targetType}-${targetId}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              required
              disabled={busy}
              rows={4}
              aria-describedby="report-help"
            />
            <p id="report-help">
              Nêu rõ nội dung vi phạm. Không gửi mật khẩu, OTP hoặc thông tin
              riêng tư. Mỗi nội dung chỉ được báo cáo một lần cho mỗi tài khoản.
            </p>
            {error && <p role="alert">{error}</p>}
            <div className="app-modal-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={close}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={busy || !reason.trim()}
              >
                {busy ? 'Đang gửi…' : 'Gửi báo cáo'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
