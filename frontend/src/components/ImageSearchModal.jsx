import React, { useEffect, useRef, useState } from 'react';
import './ImageSearchModal.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — matches the backend multer limit
const SCAN_TIMEOUT_MS = 35000; // tự hủy nếu AI phản hồi quá lâu
const MAX_IMAGE_DIMENSION = 1280; // thu nhỏ ảnh trước khi gửi để quét nhanh hơn

function formatRetryDelay(seconds) {
  const total = Math.max(1, Math.ceil(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.ceil((total % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  return `${Math.max(1, minutes)} phút`;
}

async function prepareImageForScan(file) {
  // Ảnh nhỏ vừa phải thì gửi nguyên bản (giữ định dạng gốc).
  if (file.size <= 900 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], (file.name || 'scan').replace(/\.[^.]+$/, '') + '.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file; // trình duyệt không hỗ trợ/ảnh lỗi -> gửi nguyên bản
  }
}

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
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, SCAN_TIMEOUT_MS);

    try {
      const scanFile = await prepareImageForScan(file);
      if (controller.signal.aborted) throw Object.assign(new Error('timeout'), { name: 'AbortError' });
      const formData = new FormData();
      formData.append('image', scanFile);
      const response = await fetch('/api/ai/scan-image', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        const requestError = new Error(data.error || 'Không thể nhận diện hình ảnh.');
        requestError.code = data.code;
        requestError.retryAfterSeconds = data.retryAfterSeconds;
        throw requestError;
      }
      if (!data.keyword) throw new Error('Thiếu từ khoá trong phản hồi.');
      onResult(data.keyword);
      onClose();
    } catch (error) {
      if (error.name === 'AbortError') {
        if (timedOut) {
          setErrorMessage('Quét quá lâu (hết thời gian chờ). Hãy thử ảnh rõ hơn, ảnh nhỏ hơn hoặc thử lại sau.');
        }
        return; // user cancel or timeout handled
      }
      if (error.code === 'QUOTA_EXCEEDED' && Number(error.retryAfterSeconds) > 0) {
        setErrorMessage(`Hạn mức AI đã hết. Vui lòng thử lại sau khoảng ${formatRetryDelay(error.retryAfterSeconds)}.`);
      } else {
        setErrorMessage(error.message || 'Không thể nhận diện hình ảnh.');
      }
    } finally {
      clearTimeout(timeoutId);
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
