import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Cấu hình axios để luôn gửi cookie
axios.defaults.withCredentials = true;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Thử lấy thông tin profile để xem đã đăng nhập chưa
    axios.get('/api/profile')
      .then(res => {
        if (res.data.success) {
          setUser(res.data.user);
        }
      })
      .catch(err => {
        // Do nothing on unauthenticated
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (username, password) => {
    const res = await axios.post('/api/login', { username, password });
    if (res.data.success) {
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = async () => {
    // POST thay vì GET: thao tác đổi trạng thái không nên là GET (chống CSRF qua <img src>)
    await axios.post('/api/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
