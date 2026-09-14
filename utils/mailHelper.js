const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function sendMail(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'MÃ XÁC NHẬN ĐỔI MẬT KHẨU',
    text: `Mã OTP của bạn là: ${otp}. Mã này sẽ dùng để lấy lại mật khẩu.`,
  };
  await transporter.sendMail(mailOptions);
  console.log('Đã gửi email OTP thành công tới:', email);
}

module.exports = { sendMail };
