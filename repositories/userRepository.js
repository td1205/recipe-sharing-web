const prisma = require('../config/prisma');
const { SAFE_USER_SELECT } = require('../utils/userSelect');

const User = {};

async function getUserByUsername(username) {
  const user = await prisma.users.findUnique({ where: { username } });
  return user ? [user] : [];
}

async function getUserByEmail(email) {
  const user = await prisma.users.findUnique({ where: { email } });
  return user ? [user] : [];
}

// Chỉ trả về các trường an toàn (không có password/otp) vì kết quả được
// gửi thẳng về client ở trang hồ sơ và trang admin.
async function getUserById(id) {
  const user = await prisma.users.findUnique({
    where: { id: parseInt(id) },
    select: SAFE_USER_SELECT,
  });
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
    include: { 
      recipes: {
        include: { recipe_media: true }
      } 
    },
  });
  
  return favorites.map((f) => {
    let video_url = null;
    if (f.recipes.recipe_media) {
      const videoMedia = f.recipes.recipe_media.find(m => m.media_type === 'video');
      if (videoMedia) video_url = videoMedia.media_url;
    }
    return { ...f.recipes, video_url };
  });
}

async function getRecipesByUser(userId) {
  const recipes = await prisma.recipes.findMany({
    where: { user_id: parseInt(userId) },
    include: { recipe_media: true },
    orderBy: { created_at: 'desc' },
  });

  return recipes.map((r) => {
    let video_url = null;
    if (r.recipe_media) {
      const videoMedia = r.recipe_media.find(m => m.media_type === 'video');
      if (videoMedia) video_url = videoMedia.media_url;
    }
    return { ...r, video_url };
  });
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

async function updateUserProfile(id, fullname, email, avatar_url, bio) {
  return await prisma.users.update({
    where: { id: parseInt(id) },
    data: { fullname, email, avatar_url, bio },
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
  getRecipesByUser,
};
