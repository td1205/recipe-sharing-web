import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NewRecipes from './pages/NewRecipes';
import PopularRecipes from './pages/PopularRecipes';
import RecipeDetail from './pages/RecipeDetail';
import RecipeCreate from './pages/RecipeCreate';
import RecipeEdit from './pages/RecipeEdit';
import RecipeList from './pages/RecipeList';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import PublicProfile from './pages/PublicProfile';
import NotFound from './pages/NotFound';

import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import OTP from './pages/OTP';
import CookWithIngredients from './pages/CookWithIngredients';
import About from './pages/About';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCategories from './pages/admin/Categories';
import AdminUsers from './pages/admin/Users';
import AdminComments from './pages/admin/Comments';

import { Toaster } from 'react-hot-toast';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/otp" element={<OTP />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/new-recipes" element={<NewRecipes />} />
          <Route path="/popular" element={<PopularRecipes />} />
          <Route path="/popular-recipes" element={<PopularRecipes />} />
          <Route path="/recipes" element={<RecipeList />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/recipes/create" element={<ProtectedRoute><RecipeCreate /></ProtectedRoute>} />
          <Route path="/recipes/edit/:id" element={<ProtectedRoute><RecipeEdit /></ProtectedRoute>} />
          
          <Route path="/cook-with-ingredients" element={<CookWithIngredients />} />
          <Route path="/about" element={<About />} />

          
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<PublicProfile />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="comments" element={<AdminComments />} />

            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Mọi đường dẫn không tồn tại -> trang 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
