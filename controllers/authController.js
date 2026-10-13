const userModel = require('../repositories/userRepository');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { sendMail } = require('../utils/mailHelper');
const authService = require('../services/authService');
function validatePassword(password) {
  if (password.length < 8) {
    return 'Mật khẩu phải chứa ít nhất 8 ký tự!';
  }
  if (!/[0-9]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ số!';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ cái!';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !, @, #, $, %...)!';
  }
  return null;
}

function getLoginPage(req, res) {
  res.json({ success: true, message: 'Login page endpoint' });
}

function getRegisterPage(req, res) {
  res.json({ success: true, message: 'Register page endpoint' });
}

async function handleLogin(req, res) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error,
      });
    }
    const user = result.user;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    req.session.save((err) => {
      if (err) {
        console.error('Lỗi lưu session:', err);
        return res.status(500).json({ success: false, error: 'Lỗi hệ thống!' });
      }
      return res.json({ success: true, user: req.session.user });
    });
  } catch (error) {
    console.error('Lỗi handleLogin:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

async function handleRegister(req, res) {
  try {
    const { username, email, password, confirm_password, fullname } = req.body;

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu xác nhận không khớp!',
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, error: passwordError });
    }

    const [user] = await userModel.getUserByUsername(username);
    if (user !== undefined) {
      return res.status(400).json({ success: false, error: 'Tài khoản đã tồn tại!' });
    }
    const [userByEmail] = await userModel.getUserByEmail(email);
    if (userByEmail !== undefined) {
      return res.status(400).json({ success: false, error: 'Email đã được sử dụng!' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await userModel.createUser(username, hashedPassword, email, fullname);
    return res.json({ success: true, message: 'Đăng ký thành công' });
  } catch (error) {
    console.error('Lỗi handleRegister:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

function logout(req, res) {
  req.session.destroy();
  return res.json({ success: true, message: 'Logged out' });
}

async function renderProfile(req, res) {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = req.session.user.id;
    const [user] = await userModel.getUserById(userId);
    const favouriteRecipes = await userModel.getFavouriteRecipesByUser(userId);
    const myRecipes = await userModel.getRecipesByUser(userId);
    res.json({ success: true, user, favouriteRecipes, myRecipes });
  } catch (error) {
    console.error('Lỗi renderProfile:', error);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống!' });
  }
}

function getForgotPasswordPage(req, res) {
  res.json({ success: true, message: 'Forgot password page endpoint' });
}

async function handleForgotPassword(req, res) {
  try {
    const { email } = req.body;
    const [userByEmail] = await userModel.getUserByEmail(email);
    if (!userByEmail) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản nào với Email này!',
      });
    }
    req.session.resetEmail = email;
    const otp = await authService.createOtp(email);
    await sendMail(email, otp);

    req.session.save((err) => {
      if (err) {
        console.error('Lỗi lưu session:', err);
        return res.status(500).json({
          success: false,
          error: 'Lỗi khi lưu phiên!',
        });
      }
      return res.json({ success: true, message: 'OTP sent' });
    });
  } catch (error) {
    console.error('Lỗi handleForgotPassword:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

function getEditProfilePage(req, res) {
  res.json({
    success: true,
    editUser: req.session.user,
    isAdminEditing: false,
  });
}

async function handleEditProfile(req, res) {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { fullname, email, bio } = req.body;
    let avatar_url = req.session.user.avatar_url || null;

    if (req.file) {
      avatar_url = '/avatars/' + req.file.filename;
    }

    const userId = req.session.user.id;
    const [userByEmail] = await userModel.getUserByEmail(email);
    if (userByEmail && userByEmail.id !== userId) {
      return res.status(400).json({
        success: false,
        error: 'Email đã được sử dụng bởi người khác!',
      });
    }
    await userModel.updateUserProfile(userId, fullname, email, avatar_url, bio);
    req.session.user.fullname = fullname;
    req.session.user.email = email;
    req.session.user.avatar_url = avatar_url;
    req.session.user.bio = bio;
    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error('Lỗi handleEditProfile:', error);
    res.status(500).json({ success: false, error: 'Lỗi hệ thống!' });
  }
}

async function getChangePasswordPage(req, res) {
  res.json({ success: true, message: 'Change password page' });
}

async function handleChangePassword(req, res) {
  try {
    const email = req.session.resetEmail;
    if (!email) return res.status(400).json({ success: false, error: 'No reset email in session' });
    const { password, confirm_password } = req.body;
    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu xác nhận không khớp!',
      });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, error: passwordError });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await userModel.updatePasswordByEmail(email, hashedPassword);
    req.session.destroy();
    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.',
    });
  } catch (error) {
    console.error('Lỗi handleChangePassword:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

async function getOTPPage(req, res) {
  res.json({ success: true, message: 'OTP page' });
}

async function handleOTP(req, res) {
  try {
    const email = req.session.resetEmail;
    const otp = req.body.otp;
    const trueotp = await userModel.getOTPbyEmail(email);
    if (otp == trueotp) {
      req.session.otp = true;
      return res.json({ success: true, message: 'OTP correct' });
    } else {
      return res.status(400).json({ success: false, error: 'Sai mã OTP!' });
    }
  } catch (error) {
    console.error('Lỗi handleOTP:', error);
    return res.status(500).json({ success: false, error: 'Lỗi hệ thống, vui lòng thử lại!' });
  }
}

module.exports = {
  getOTPPage,
  handleOTP,
  getEditProfilePage,
  handleEditProfile,
  getLoginPage,
  getRegisterPage,
  handleLogin,
  handleRegister,
  logout,
  renderProfile,
  getForgotPasswordPage,
  handleForgotPassword,
  getChangePasswordPage,
  handleChangePassword,
};
