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
  res.render('auth/login');
}

function getRegisterPage(req, res) {
  res.render('auth/register');
}

async function handleLogin(req, res) {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);

    if (!result.success) {
      return res.render('auth/login', {
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
        return res.render('auth/login', { error: 'Lỗi hệ thống!' });
      }
      return res.redirect('/');
    });
  } catch (error) {
    console.error('Lỗi handleLogin:', error);
    return res.render('auth/login', {
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

async function handleRegister(req, res) {
  try {
    const { username, email, password, confirm_password, fullname } = req.body;

    if (password !== confirm_password) {
      return res.render('auth/register', {
        error: 'Mật khẩu xác nhận không khớp!',
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.render('auth/register', { error: passwordError });
    }

    const [user] = await userModel.getUserByUsername(username);
    if (user !== undefined) {
      return res.render('auth/register', { error: 'Tài khoản đã tồn tại!' });
    }
    const [userByEmail] = await userModel.getUserByEmail(email);
    if (userByEmail !== undefined) {
      return res.render('auth/register', { error: 'Email đã được sử dụng!' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await userModel.createUser(username, hashedPassword, email, fullname);
    return res.redirect('/login');
  } catch (error) {
    console.error('Lỗi handleRegister:', error);
    return res.render('auth/register', {
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

function logout(req, res) {
  req.session.destroy();
  return res.redirect('/login');
}

async function renderProfile(req, res) {
  try {
    const userId = req.session.user.id;
    const [user] = await userModel.getUserById(userId);
    const favouriteRecipes = await userModel.getFavouriteRecipesByUser(userId);
    res.render('auth/profile', { user, favouriteRecipes });
  } catch (error) {
    console.error('Lỗi renderProfile:', error);
    res.status(500).send('Lỗi hệ thống!');
  }
}

function getForgotPasswordPage(req, res) {
  res.render('auth/forgot-password');
}

async function handleForgotPassword(req, res) {
  try {
    const { email } = req.body;
    const [userByEmail] = await userModel.getUserByEmail(email);
    if (!userByEmail) {
      return res.render('auth/forgot-password', {
        error: 'Không tìm thấy tài khoản nào với Email này!',
      });
    }
    req.session.resetEmail = email;
    const otp = await authService.createOtp(email);
    await sendMail(email, otp);

    req.session.save((err) => {
      if (err) {
        console.error('Lỗi lưu session:', err);
        return res.render('auth/forgot-password', {
          error: 'Lỗi khi lưu phiên!',
        });
      }
      return res.redirect('/otp');
    });
  } catch (error) {
    console.error('Lỗi handleForgotPassword:', error);
    return res.render('auth/forgot-password', {
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

function getEditProfilePage(req, res) {
  res.render('auth/profile-edit', {
    editUser: req.session.user,
    isAdminEditing: false,
  });
}

async function handleEditProfile(req, res) {
  try {
    const { fullname, email } = req.body;
    const userId = req.session.user.id;
    const [userByEmail] = await userModel.getUserByEmail(email);
    if (userByEmail && userByEmail.id !== userId) {
      return res.render('auth/profile-edit', {
        error: 'Email đã được sử dụng bởi người khác!',
        editUser: req.session.user,
        isAdminEditing: false,
      });
    }
    await userModel.updateUserProfile(userId, fullname, email);
    req.session.user.fullname = fullname;
    req.session.user.email = email;
    res.redirect('/profile');
  } catch (error) {
    console.error('Lỗi handleEditProfile:', error);
    res.status(500).send('Lỗi hệ thống!');
  }
}

async function getChangePasswordPage(req, res) {
  res.render('auth/change-password');
}

async function handleChangePassword(req, res) {
  try {
    const email = req.session.resetEmail;
    const { password, confirm_password } = req.body;
    if (password !== confirm_password) {
      return res.render('auth/change-password', {
        error: 'Mật khẩu xác nhận không khớp!',
      });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.render('auth/change-password', { error: passwordError });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await userModel.updatePasswordByEmail(email, hashedPassword);
    req.session.destroy();
    return res.render('auth/login', {
      success: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.',
    });
  } catch (error) {
    console.error('Lỗi handleChangePassword:', error);
    return res.render('auth/change-password', {
      error: 'Lỗi hệ thống, vui lòng thử lại!',
    });
  }
}

async function getOTPPage(req, res) {
  res.render('auth/otp');
}

async function handleOTP(req, res) {
  try {
    const email = req.session.resetEmail;
    const otp = req.body.otp;
    const trueotp = await userModel.getOTPbyEmail(email);
    if (otp == trueotp) {
      req.session.otp = true;
      console.log('OTP=' + otp + '\nTrue OTP=' + trueotp);
      return res.redirect('/change-password');
    } else {
      return res.render('auth/otp', { error: 'Sai mã OTP!' });
    }
  } catch (error) {
    console.error('Lỗi handleOTP:', error);
    return res.render('auth/otp', { error: 'Lỗi hệ thống, vui lòng thử lại!' });
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
