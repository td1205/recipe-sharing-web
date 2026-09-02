const userModel = require('../models/userModel');
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}
function isAdmin(req, res, next) {
  if (req.session.user) {
    if (req.session.user.role === 'admin') {
      next();
    } else {
      res.redirect('/');
    }
  } else {
    res.redirect('/login');
  }
}
function isEmail(req, res, next) {
  if (req.session.resetEmail) {
    next();
  } else {
    res.redirect('/auth/forgot-password');
  }
}
function isOTP(req, res, next) {
  if (req.session.otp) {
    next();
  } else {
    res.redirect('/auth/otp');
  }
}
module.exports = { isAuthenticated, isAdmin, isEmail, isOTP };
