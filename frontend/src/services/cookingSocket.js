import { io } from 'socket.io-client';

let socket;

function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: false,
      withCredentials: true,
      auth: { clientType: 'web' },
      reconnectionAttempts: 2,
    });
  }
  return socket;
}

export function sendRecipeToPhone(recipeId) {
  return new Promise((resolve, reject) => {
    const client = getSocket();
    const timeout = window.setTimeout(() => reject(new Error('Kết nối đồng bộ quá lâu.')), 7000);
    const send = () => {
      client.timeout(5000).emit('cooking:open', { recipeId }, (error, response) => {
        window.clearTimeout(timeout);
        if (error) return reject(new Error('Điện thoại không phản hồi.'));
        if (!response?.success) return reject(new Error(response?.error || 'Không thể gửi công thức.'));
        return resolve();
      });
    };
    if (client.connected) return send();
    client.once('connect', send);
    client.once('connect_error', (error) => {
      window.clearTimeout(timeout);
      reject(new Error(error.message === 'UNAUTHORIZED' ? 'Vui lòng đăng nhập lại.' : 'Không thể kết nối đồng bộ.'));
    });
    client.connect();
  });
}

export function subscribeToFavoriteChanges(onChanged) {
  const client = getSocket();
  client.on('favorites:changed', onChanged);
  if (!client.connected) client.connect();
  return () => client.off('favorites:changed', onChanged);
}

export function subscribeToRecipeChanges(onChanged) {
  const client = getSocket();
  client.on('recipes:changed', onChanged);
  if (!client.connected) client.connect();
  return () => client.off('recipes:changed', onChanged);
}
export function subscribeToShoppingListChanges(onChanged) {
  const client = getSocket(); client.on('shopping-list:changed', onChanged); if (!client.connected) client.connect();
  return () => client.off('shopping-list:changed', onChanged);
}

export function subscribeToCookingProgress(recipeId, onChanged) {
  const client = getSocket();
  const numericRecipeId = Number(recipeId);
  const listener = (payload) => {
    if (Number(payload?.recipeId) === numericRecipeId) onChanged(payload);
  };
  const fetchCurrent = () => {
    client.timeout(5000).emit('cooking:progress:get', { recipeId: numericRecipeId }, (error, response) => {
      if (!error && response?.success && response.progress) onChanged(response.progress);
    });
  };
  client.on('cooking:progress', listener);
  if (client.connected) fetchCurrent();
  else {
    client.once('connect', fetchCurrent);
    client.connect();
  }
  return () => {
    client.off('cooking:progress', listener);
    client.off('connect', fetchCurrent);
  };
}

export function disconnectCookingSocket() {
  socket?.disconnect();
  socket = undefined;
}
