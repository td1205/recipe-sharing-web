import { useEffect, useId, useRef } from 'react';
import './Modal.css';

export default function Modal({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className="app-modal" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); if (!busy) closeRef.current(); }}>
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}
