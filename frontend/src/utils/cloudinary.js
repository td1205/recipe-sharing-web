// Tải ảnh/video thẳng từ trình duyệt lên Cloudinary (unsigned upload preset).
// Cấu hình trong frontend/.env (xem frontend/.env.example):
//   VITE_CLOUDINARY_CLOUD_NAME=...
//   VITE_CLOUDINARY_UPLOAD_PRESET=...
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

// crypto.randomUUID chỉ có trên localhost/HTTPS; mở qua IP mạng LAN (http) thì dùng cách dự phòng
const shortId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

// Trả về { url, mediaType }. Ném Error kèm thông báo tiếng Việt khi lỗi.
export async function uploadToCloudinary(file) {
  if (!isCloudinaryConfigured) {
    throw new Error('Chưa cấu hình tải ảnh Cloudinary. Điền VITE_CLOUDINARY_CLOUD_NAME và VITE_CLOUDINARY_UPLOAD_PRESET trong frontend/.env, rồi khởi động lại Vite (npm run client).');
  }
  const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  // Tên tệp duy nhất: trùng public_id thì Cloudinary trả lại ảnh cũ thay vì ảnh vừa chọn
  formData.append('public_id', `recipe_${Date.now()}_${shortId()}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${mediaType}/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || 'Lỗi tải tệp lên');
  return { url: data.secure_url, mediaType };
}
