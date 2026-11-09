const { Server } = require('socket.io');
const tokenService = require('./tokenService');
const recipeRepository = require('../repositories/recipeRepository');

const roomForUser = (userId) => `cooking:user:${Number(userId)}`;

function normalizeCookingProgress(payload, totalSteps) {
  const recipeId = Number(payload?.recipeId);
  const completedSteps = Number(payload?.completedSteps);
  const currentStep = payload?.currentStep == null ? null : Number(payload.currentStep);
  if (!Number.isSafeInteger(recipeId) || recipeId <= 0
    || !Number.isSafeInteger(totalSteps) || totalSteps <= 0
    || !Number.isSafeInteger(completedSteps) || completedSteps < 0 || completedSteps > totalSteps) {
    return null;
  }
  const expectedCurrentStep = completedSteps < totalSteps ? completedSteps + 1 : null;
  if (currentStep !== expectedCurrentStep) return null;
  return { recipeId, completedSteps, currentStep, totalSteps };
}

function developmentOrigin(origin) {
  if (!origin || process.env.NODE_ENV === 'production' || process.env.APP_ORIGIN) return false;
  try {
    const url = new URL(origin);
    return (url.protocol === 'http:' || url.protocol === 'https:') && ['5173', '5174', '5175'].includes(url.port);
  } catch {
    return false;
  }
}

function createCookingSocket(httpServer, {
  sessionMiddleware,
  resolveToken = tokenService.resolveToken,
  getRecipeById = recipeRepository.getRecipeById,
  getStepsByRecipeId = recipeRepository.getStepsByRecipeId,
} = {}) {
  const cookingProgress = new Map();
  const io = new Server(httpServer, {
    cors: {
      credentials: true,
      origin(origin, callback) {
        if (!origin || origin === process.env.APP_ORIGIN || developmentOrigin(origin)) return callback(null, true);
        return callback(new Error('Nguồn kết nối không hợp lệ'));
      },
    },
  });

  // Web dùng express-session cookie; Flutter gửi token Bearer trong handshake auth.
  if (sessionMiddleware) io.engine.use(sessionMiddleware);

  io.use(async (socket, next) => {
    try {
      const sessionUser = socket.request.session?.user;
      if (sessionUser?.id) {
        socket.data.user = sessionUser;
      } else {
        const authHeader = typeof socket.handshake.headers.authorization === 'string'
          ? socket.handshake.headers.authorization
          : '';
        const token = socket.handshake.auth?.token || /^Bearer\s+(.+)$/i.exec(authHeader)?.[1];
        const resolved = await resolveToken(typeof token === 'string' ? token : '');
        if (!resolved?.user?.id) return next(new Error('UNAUTHORIZED'));
        socket.data.user = tokenService.publicTokenUser(resolved.user);
      }
      socket.data.clientType = socket.handshake.auth?.clientType === 'mobile' ? 'mobile' : 'web';
      return next();
    } catch (error) {
      return next(error);
    }
  });

  io.on('connection', (socket) => {
    const room = roomForUser(socket.data.user.id);
    socket.join(room);

    socket.on('cooking:open', async (payload, acknowledge) => {
      const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
      const recipeId = Number(payload?.recipeId);
      if (!Number.isSafeInteger(recipeId) || recipeId <= 0) {
        return reply({ success: false, error: 'Công thức không hợp lệ.' });
      }

      try {
        // REST GET /api/recipes/:id hiện là public; dùng cùng repository để từ chối món đã xóa/không tồn tại.
        const recipe = await getRecipeById(recipeId);
        if (!recipe) return reply({ success: false, error: 'Không tìm thấy công thức hoặc bạn không có quyền truy cập.' });

        const peers = await io.in(room).fetchSockets();
        const hasMobile = peers.some((peer) => peer.id !== socket.id && peer.data.clientType === 'mobile');
        if (!hasMobile) return reply({ success: false, error: 'Chưa có điện thoại nào đang kết nối.' });

        socket.to(room).emit('cooking:open', { recipeId });
        return reply({ success: true });
      } catch (error) {
        console.error('Lỗi đồng bộ công thức:', error.code || error.name);
        return reply({ success: false, error: 'Không thể gửi công thức lúc này.' });
      }
    });

    socket.on('cooking:progress:get', async (payload, acknowledge) => {
      const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
      const recipeId = Number(payload?.recipeId);
      if (!Number.isSafeInteger(recipeId) || recipeId <= 0) {
        return reply({ success: false, error: 'Công thức không hợp lệ.' });
      }
      return reply({
        success: true,
        progress: cookingProgress.get(`${socket.data.user.id}:${recipeId}`) || null,
      });
    });

    socket.on('cooking:progress', async (payload, acknowledge) => {
      const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
      if (socket.data.clientType !== 'mobile') {
        return reply({ success: false, error: 'Chỉ ứng dụng di động được cập nhật tiến độ nấu.' });
      }

      const recipeId = Number(payload?.recipeId);
      if (!Number.isSafeInteger(recipeId) || recipeId <= 0) {
        return reply({ success: false, error: 'Tiến độ nấu không hợp lệ.' });
      }

      try {
        const recipe = await getRecipeById(recipeId);
        if (!recipe) return reply({ success: false, error: 'Không tìm thấy công thức.' });
        const steps = await getStepsByRecipeId(recipeId);
        const normalized = normalizeCookingProgress(payload, steps.length);
        if (!normalized) {
          return reply({ success: false, error: 'Thứ tự bước nấu không hợp lệ.' });
        }

        const progress = { ...normalized, updatedAt: new Date().toISOString() };
        cookingProgress.set(`${socket.data.user.id}:${recipeId}`, progress);
        socket.to(room).emit('cooking:progress', progress);
        return reply({ success: true, progress });
      } catch (error) {
        console.error('Lỗi đồng bộ tiến độ nấu:', error.code || error.name);
        return reply({ success: false, error: 'Không thể cập nhật tiến độ nấu lúc này.' });
      }
    });
  });

  return {
    io,
    emitFavoritesChanged(userId) {
      io.to(roomForUser(userId)).emit('favorites:changed');
    },
    emitRecipesChanged(userId, payload) {
      io.to(roomForUser(userId)).emit('recipes:changed', payload);
    },
    emitShoppingListChanged(userId, payload) {
      io.to(roomForUser(userId)).emit('shopping-list:changed', payload);
    },
  };
}

module.exports = { createCookingSocket, normalizeCookingProgress, roomForUser };
