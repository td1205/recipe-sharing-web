import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';

const MainLayout = ({ children, categories = [], hideSidebar = true, className }) => {
  return (
    <div className={`main-layout ${className || ''}`}>
      <Navbar categories={categories} />
      <div className="container-full">
        <main className="content-full">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default MainLayout;
