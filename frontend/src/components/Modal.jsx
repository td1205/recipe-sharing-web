import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

export default function Modal({ title, children, onClose, busy = false, dismissible = false, className = '', describedBy }) {
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  const outsidePress = useRef(false);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector('[data-modal-initial-focus]')?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const outside = event => {
    const bounds = ref.current.getBoundingClientRect();
    return event.target === ref.current && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  };
  return createPortal(
    <dialog ref={ref} className={`app-modal ${className}`} aria-labelledby={titleId}
      aria-describedby={describedBy} aria-modal="true" aria-busy={busy}
      onKeyDown={event => {
        if (!dismissible || event.key !== 'Tab') return;
        const controls = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')]
          .filter(element => element.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (!first) { event.preventDefault(); ref.current.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}
      onPointerDown={event => { outsidePress.current = outside(event); }}
      onClick={event => {
        if (dismissible && !busy && outsidePress.current && outside(event)) closeRef.current();
        outsidePress.current = false;
      }}
      onCancel={event => { event.preventDefault(); if (!busy) closeRef.current(); }}>
      {dismissible ? <div className="app-modal-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="app-modal-close" aria-label="Đóng hộp thoại" disabled={busy} onClick={() => closeRef.current()}>
          <span aria-hidden="true">×</span>
        </button>
      </div> : <h2 id={titleId}>{title}</h2>}
      {children}
    </dialog>, document.body
  );
}
