import React, { useContext, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import MainLayout from './MainLayout';
import SkeletonLoader from './SkeletonLoader';

const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const isDenied = Boolean(user && user.role !== 'admin');

  useEffect(() => {
    if (isDenied) {
      toast.error('Bạn không có quyền truy cập trang quản trị.', {
        id: 'admin-access-denied',
      });
    }
  }, [isDenied]);

  if (loading) {
    return (
      <MainLayout hideSidebar>
        <SkeletonLoader />
      </MainLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isDenied) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
};

export default AdminRoute;
