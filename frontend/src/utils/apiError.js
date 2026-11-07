export function apiErrorMessage(error, fallback = 'Yêu cầu không thành công. Vui lòng thử lại.') {
  const data = error?.response?.data;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  return fallback;
}
