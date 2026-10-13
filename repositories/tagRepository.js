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
  getTagByName,
  createTag,
  getUserVoteCountForRecipe,
  hasUserVotedForTag,
  addVote,
  removeVote
};
