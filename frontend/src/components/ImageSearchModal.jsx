import React, { useEffect, useRef, useState } from 'react';
import './ImageSearchModal.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — matches the backend multer limit

/**
 * Alert opened by the navbar camera button.
 * The visitor drags a file onto the panel or picks one via "Tải lên"; the scan
 * runs inside the modal so the visitor sees progress and can cancel it.
 * `onResult(keyword)` is called on success, right before the modal closes.
 */
const ImageSearchModal = ({ isOpen, onClose, onResult }) => {
  const uploadButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Count elapsed seconds while scanning so the user sees progress.
  useEffect(() => {
    if (!isScanning) { setElapsedSeconds(0); return undefined; }
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isScanning]);

  // Reset state every time the modal opens/closes.
  useEffect(() => {
    if (!isOpen) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsScanning(false);
      setErrorMessage('');
      setIsDraggingFile(false);
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (abortRef.current) abortRef.current.abort();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    uploadButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  // Revoke the object URL when the preview changes.
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  if (!isOpen) return null;

  const validate = (file) => {
    if (!file) return 'Vui lòng chọn một ảnh.';
    if (!file.type.startsWith('image/')) return 'Chỉ chấp nhận file ảnh (JPG, PNG, WEBP).';
    if (file.size > MAX_FILE_SIZE) return 'Ảnh tối đa 5MB.';
    return '';
  };

  const startScan = async (file) => {
    const err = validate(file);
    if (err) { setErrorMessage(err); return; }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage('');
    setIsScanning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/ai/scan-image', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Không thể nhận diện hình ảnh.');
      }
      if (!data.keyword) throw new Error('Thiếu từ khoá trong phản hồi.');
      onResult(data.keyword);
      onClose();
    } catch (error) {
      if (error.name === 'AbortError') return; // cancelled by the user
      setErrorMessage(error.message || 'Không thể nhận diện hình ảnh.');
    } finally {
      setIsScanning(false);
      abortRef.current = null;
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDraggingFile(false);
    if (isScanning) return;
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) startScan(file);
  };

  const handleInputChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) startScan(file);
    event.target.value = ''; // allow re-picking the same file
  };

  const handleCancel = () => {
    if (abortRef.current) abortRef.current.abort();
    onClose();
  };

  return (
    <div className="visual-search-overlay" onClick={isScanning ? undefined : onClose}>
      <div
        className="visual-search-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="visual-search-title"
        onClick={(event) => event.stopPropagation()}
        onDragOver={(event) => { event.preventDefault(); if (!isScanning) setIsDraggingFile(true); }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={handleDrop}
        data-dragging={isDraggingFile ? 'true' : undefined}
        data-scanning={isScanning ? 'true' : undefined}
      >
        <div className="visual-search-brackets" aria-hidden="true"></div>

        {previewUrl ? (
          <img className="visual-search-preview" src={previewUrl} alt="Ảnh đã chọn" />
        ) : (
          <i className="fa-solid fa-camera visual-search-icon" aria-hidden="true"></i>
        )}

        <h2 className="visual-search-title" id="visual-search-title">
          {isScanning ? 'Đang quét hình ảnh...' : 'Kéo thả/Tải lên ảnh để tìm kiếm thông minh'}
        </h2>

        {isScanning && (
          <p className="visual-search-status">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
            {' '}Đang nhận diện món ăn, vui lòng chờ...
            {elapsedSeconds > 3 && (
              <span className="visual-search-elapsed"> ({elapsedSeconds}s)</span>
            )}
          </p>
        )}

        {errorMessage && !isScanning && (
          <p className="visual-search-error" role="alert">{errorMessage}</p>
        )}

        <div className="visual-search-actions">
          {!isScanning && (
            <>
              <button
                type="button"
                ref={uploadButtonRef}
                className="visual-search-btn visual-search-btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                Chọn ảnh khác
              </button>
              <button
                type="button"
                className="visual-search-btn visual-search-btn-secondary"
                onClick={onClose}
              >
                Đóng
              </button>
            </>
          )}
          {isScanning && (
            <button
              type="button"
              className="visual-search-btn visual-search-btn-secondary"
              onClick={handleCancel}
            >
              Huỷ quét
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          className="visual-search-input"
          type="file"
          accept="image/*"
          aria-label="Tải lên ảnh để tìm kiếm"
          onChange={handleInputChange}
          disabled={isScanning}
        />
      </div>
    </div>
  );
};

export default ImageSearchModal;