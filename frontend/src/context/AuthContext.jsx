import React, { createContext, useState, useEffect, useLayoutEffect, useRef } from 'react';
import axios from 'axios';

// Cấu hình axios để luôn gửi cookie
axios.defaults.withCredentials = true;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favoriteState, setFavoriteState] = useState({ owner: null, ids: [] });
  const ownerRef = useRef(null);
  useLayoutEffect(() => { ownerRef.current = user?.id ?? null; }, [user?.id]);
  const favoriteVersion = useRef(0);
  const pendingFavorites = useRef(new Set());
  const favoriteIds = favoriteState.owner === user?.id ? favoriteState.ids : [];
  useEffect(() => {
    if (!user?.id) return;
    const owner = user.id;
    const controller = new AbortController();
    const refresh = () => {
      const version = favoriteVersion.current;
      return axios.get('/api/profile', { signal: controller.signal }).then(({ data }) => {
      if (ownerRef.current === owner && version === favoriteVersion.current && data.success) setFavoriteState({ owner, ids: (data.favouriteRecipes || []).map(r => r.id) });
    }).catch(() => {});
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.removeEventListener('focus', refresh); };
  }, [user?.id]);
  const setFavorite = async (id, isFav) => {
    const owner = ownerRef.current;
    const key = owner + ':' + id;
    if (!owner) throw new Error('Vui lòng đăng nhập');
    if (pendingFavorites.current.has(key)) throw new Error('Yêu cầu đang được xử lý');
    if (favoriteState.owner !== owner) throw new Error('Chưa tải được danh sách đã lưu. Vui lòng tải lại trang.');
    favoriteVersion.current++;
    pendingFavorites.current.add(key);
    try {
      const { data } = await axios.post('/api/recipes/' + id + '/favorite', { isFav });
      if (!data.success) throw new Error(data.error || data.message);
      if (ownerRef.current === owner) setFavoriteState(previous => {
        const ids = previous.owner === owner ? previous.ids.filter(value => Number(value) !== Number(id)) : [];
        return { owner, ids: data.isFav ? [...ids, Number(id)] : ids };
      });
      return data.isFav;
    } finally { pendingFavorites.current.delete(key); }
  };

  useEffect(() => {
    // Thử lấy thông tin profile để xem đã đăng nhập chưa
    axios.get('/api/profile')
      .then(res => {
        if (res.data.success) {
          setUser(res.data.user);
        }
      })
      .catch(() => {
        // Do nothing on unauthenticated
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(response => response, error => {
      const payload = error.response?.data;
      if (payload && typeof payload === 'object') {
        const message = typeof payload.error === 'string' ? payload.error : typeof payload.message === 'string' ? payload.message : 'Yêu cầu không thành công';
        error.response.data = { ...payload, error: message, message };
        error.message = message;
      }
      if ((error.response?.status === 401 && !error.config?.url?.includes('/api/login')) || error.response?.data?.banned) {
        favoriteVersion.current++;
        setUser(null);
        setFavoriteState({ owner: null, ids: [] });
      }
      return Promise.reject(error);
    });
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (username, password, remember = false) => {
    const res = await axios.post('/api/login', { username, password, remember });
    if (res.data.success) {
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = async () => {
    // POST thay vì GET: thao tác đổi trạng thái không nên là GET (chống CSRF qua <img src>)
    await axios.post('/api/logout');
    favoriteVersion.current++;
    setFavoriteState({ owner: null, ids: [] });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, favoriteIds, setFavorite }}>
      {children}
    </AuthContext.Provider>
  );
};
