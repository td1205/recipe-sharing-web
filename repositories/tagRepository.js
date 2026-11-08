const prisma = require('../config/prisma');

async function getTagByName(name) {
  const tags = await prisma.$queryRaw`SELECT * FROM tags WHERE name = ${name} LIMIT 1`;
  return tags.length > 0 ? tags[0] : null;
}

async function createTag(name) {
  await prisma.$executeRaw`INSERT INTO tags (name, type) VALUES (${name}, 'community')`;
  return await getTagByName(name);
}

async function getUserVoteCountForRecipe(userId, recipeId) {
  const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM user_tag_votes WHERE user_id = ${parseInt(userId)} AND recipe_id = ${parseInt(recipeId)}`;
  return result.length > 0 ? Number(result[0].count) : 0;
}

async function hasUserVotedForTag(userId, recipeId, tagId) {
  const vote = await prisma.$queryRaw`SELECT * FROM user_tag_votes WHERE user_id = ${parseInt(userId)} AND recipe_id = ${parseInt(recipeId)} AND tag_id = ${parseInt(tagId)} LIMIT 1`;
  return vote.length > 0;
}

async function addVote(userId, recipeId, tagId) {
  return await prisma.$executeRaw`INSERT IGNORE INTO user_tag_votes (user_id, recipe_id, tag_id) VALUES (${parseInt(userId)}, ${parseInt(recipeId)}, ${parseInt(tagId)})`;
}

async function removeVote(userId, recipeId, tagId) {
  return await prisma.$executeRaw`DELETE FROM user_tag_votes WHERE user_id = ${parseInt(userId)} AND recipe_id = ${parseInt(recipeId)} AND tag_id = ${parseInt(tagId)}`;
}

module.exports = {
  async toggleVote(userId, recipeId, name) {
    const user_id = Number(userId), recipe_id = Number(recipeId);
    return prisma.$transaction(async (tx) => {
      const recipes = await tx.$queryRaw`SELECT id FROM recipes WHERE id = ${recipe_id} FOR UPDATE`;
      if (!recipes.length) throw Object.assign(new Error('Không tìm thấy công thức'), { code: 'P2025' });
      const existingTag = await tx.tags.findUnique({ where: { name } });
      const where = { user_id, recipe_id };
      if (existingTag) {
        const removed = await tx.user_tag_votes.deleteMany({ where: { ...where, tag_id: existingTag.id } });
        if (removed.count) return { isAdded: false };
      }
      if (await tx.user_tag_votes.count({ where }) >= 5) {
        throw Object.assign(new Error('Bạn chỉ được gắn tối đa 5 tag cho món ăn này!'), { status: 400 });
      }
      const tag = await tx.tags.upsert({ where: { name }, create: { name, type: 'community' }, update: {} });
      await tx.user_tag_votes.create({ data: { ...where, tag_id: tag.id } });
      return { isAdded: true, tag: { id: tag.id, name: tag.name } };
    }, { isolationLevel: 'ReadCommitted' });
  },
  getTagByName,
  createTag,
  getUserVoteCountForRecipe,
  hasUserVotedForTag,
  addVote,
  removeVote
};
