const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const Article = {
  async getAll() {
    return await prisma.articles.findMany({
      include: {
        users: {
          select: { fullname: true, username: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  },

  async getById(id) {
    return await prisma.articles.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          select: { fullname: true, username: true }
        }
      }
    });
  },

  async create(data) {
    return await prisma.articles.create({
      data: {
        title: data.title,
        content: data.content,
        image_url: data.image_url,
        author_id: data.author_id,
      }
    });
  },

  async update(id, data) {
    return await prisma.articles.update({
      where: { id: parseInt(id) },
      data: {
        title: data.title,
        content: data.content,
        image_url: data.image_url,
      }
    });
  },

  async delete(id) {
    return await prisma.articles.delete({
      where: { id: parseInt(id) }
    });
  },

  async incrementViews(id) {
    return await prisma.articles.update({
      where: { id: parseInt(id) },
      data: {
        views: { increment: 1 }
      }
    });
  }
};

module.exports = Article;
