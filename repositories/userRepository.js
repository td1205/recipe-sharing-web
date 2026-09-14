const prisma = require('../config/prisma');

const User = {};

async function getUserByUsername(username) {
  const user = await prisma.users.findUnique({ where: { username } });
  return user ? [user] : [];
}

async function getUserByEmail(email) {
  const user = await prisma.users.findUnique({ where: { email } });
  return user ? [user] : [];
}

async function getUserById(id) {
  const user = await prisma.users.findUnique({ where: { id: parseInt(id) } });
  return user ? [user] : [];
}

async function createUser(username, password, email, fullname) {
  const user = await prisma.users.create({
    data: { username, password, email, fullname },
  });
  return [user];
}

async function getFavouriteRecipesByUser(userId) {
  const favorites = await prisma.favorites.findMany({
    where: { user_id: parseInt(userId) },
    include: { recipes: true },
  });
  return favorites.map((f) => f.recipes);
}

async function updatePasswordByEmail(email, hashedPassword) {
  return await prisma.users.update({
    where: { email },
    data: { password: hashedPassword },
  });
}

async function updateUserInfo(id, fullname, email) {
  return await prisma.users.update({
    where: { id: parseInt(id) },
    data: { fullname, email },
  });
}

async function updateUserProfile(id, fullname, email) {
  return await prisma.users.update({
    where: { id: parseInt(id) },
    data: { fullname, email },
  });
}

async function updateOTP(email, otp) {
  return await prisma.users.update({
    where: { email },
    data: { otp },
  });
}

async function getOTPbyEmail(email) {
  const user = await prisma.users.findUnique({ where: { email } });
  return user ? user.otp : null;
}

module.exports = {
  updateUserProfile,
  getUserByUsername,
  getUserByEmail,
  createUser,
  getUserById,
  getFavouriteRecipesByUser,
  updatePasswordByEmail,
  updateUserInfo,
  updateOTP,
  getOTPbyEmail,
};
