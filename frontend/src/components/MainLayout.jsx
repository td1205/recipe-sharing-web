import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';

const MainLayout = ({ children, categories = [], hideSidebar = true }) => {
  return (
    <>
      <Navbar categories={categories} />
      <div className="container-full">
        <main className="content-full">
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
};

export default MainLayout;
