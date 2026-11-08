const nodemailer = require('nodemailer');

// Lỗi riêng để controller trả thông báo rõ ràng thay vì "Lỗi hệ thống"
class MailError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MailError';
    this.code = code; // MAIL_NOT_CONFIGURED | MAIL_AUTH_FAILED | MAIL_SEND_FAILED
  }
}

function isMailConfigured() {
  return Boolean(String(process.env.EMAIL_USER || '').trim() && String(process.env.EMAIL_APP_PASSWORD || '').trim());
}

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER.trim(),
        // App password Google hiển thị có dấu cách, bỏ đi cho chắc
        pass: process.env.EMAIL_APP_PASSWORD.replace(/\s+/g, ''),
      },
    });
  }
  return transporter;
}

async function sendMail(email, otp) {
  if (!isMailConfigured()) {
    throw new MailError(
      'MAIL_NOT_CONFIGURED',
      'Chức năng gửi email chưa được cấu hình (thiếu EMAIL_USER hoặc EMAIL_APP_PASSWORD trong file .env).',
    );
  }
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_USER.trim(),
      to: email,
      subject: 'MÃ XÁC NHẬN ĐỔI MẬT KHẨU',
      text: `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 5 phút và chỉ dùng được một lần.`,
    });
  } catch (err) {
    console.error('Lỗi gửi email:', err.message);
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      throw new MailError('MAIL_AUTH_FAILED', 'Tài khoản gửi email bị từ chối đăng nhập, hãy kiểm tra lại App password.');
    }
    throw new MailError('MAIL_SEND_FAILED', 'Không gửi được email OTP, vui lòng thử lại sau.');
  }
}

module.exports = { sendMail, isMailConfigured, MailError };
