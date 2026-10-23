import React, { useEffect, useRef, useState } from 'react';
import './ImageSearchModal.css';

/**
 * Alert opened by the navbar camera button.
 * The visitor can drag a file onto the panel or pick one via "Tải lên";
 * "Huỷ" closes it. `onPick` receives the chosen File and starts the scan.
 */
const ImageSearchModal = ({ isOpen, onClose, onPick }) => {
  const uploadButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsDraggingFile(false);
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    // Stop the page behind from scrolling while the alert is up.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    uploadButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const emit = (fileList) => {
    const file = fileList && fileList[0];
    if (!file || !file.type.startsWith('image/')) return;
    onPick(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDraggingFile(false);
    emit(event.dataTransfer.files);
  };

  const handleInputChange = (event) => {
    emit(event.target.files);
    // Allow re-picking the same file twice in a row.
    event.target.value = '';
  };

  return (
    <div className="visual-search-overlay" onClick={onClose}>
      <div
        className="visual-search-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="visual-search-title"
        onClick={(event) => event.stopPropagation()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={handleDrop}
        data-dragging={isDraggingFile ? 'true' : undefined}
      >
        <div className="visual-search-brackets" aria-hidden="true"></div>

        <i className="fa-solid fa-camera visual-search-icon" aria-hidden="true"></i>

        <h2 className="visual-search-title" id="visual-search-title">
          Kéo thả/Tải lên ảnh để tìm kiếm thông minh
        </h2>

        <div className="visual-search-actions">
          <button
            type="button"
            ref={uploadButtonRef}
            className="visual-search-btn visual-search-btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            Tải lên
          </button>
          <button
            type="button"
            className="visual-search-btn visual-search-btn-secondary"
            onClick={onClose}
          >
            Huỷ
          </button>
        </div>

        <input
          ref={fileInputRef}
          className="visual-search-input"
          type="file"
          accept="image/*"
          aria-label="Tải lên ảnh để tìm kiếm"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
};

export default ImageSearchModal;