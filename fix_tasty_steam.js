const fs = require('fs');
let txt = fs.readFileSync('frontend/src/tasty.css', 'utf8');

// Remove old navbar styles by matching `.tasty-header` up to `.hero-section`
// Wait, regex might fail. I'll just append it for now, and since .steam-header uses entirely different classes, the old classes won't conflict because we changed Navbar.jsx!
const steamStyles = `
/* ========================================================
   STEAM CLONE NAVBAR STYLES
   ======================================================== */
.steam-header {
  font-family: 'Inter', -apple-system, sans-serif;
  width: 100%;
}

.steam-global-header {
  background-color: #171a21;
  height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.steam-global-container {
  width: 940px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 30px;
}

.steam-global-left {
  display: flex;
  align-items: center;
}

.steam-logo {
  color: #c6d4df;
  font-size: 24px;
  font-weight: bold;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.steam-logo i {
  font-size: 32px;
}

.steam-global-right {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #b8b6b4;
  font-size: 12px;
}

.steam-btn-icon {
  border: none;
  color: white;
  padding: 4px 10px;
  border-radius: 2px;
  cursor: pointer;
}

.steam-user-menu {
  position: relative;
  cursor: pointer;
  color: #c6d4df;
  padding-bottom: 20px;
}

.steam-user-menu:hover {
  color: #fff;
}

.steam-dropdown {
  position: absolute;
  top: 25px;
  right: 0;
  background: #3d4450;
  box-shadow: 0 4px 8px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  min-width: 150px;
  z-index: 100;
  padding: 5px 0;
}

.steam-dropdown a {
  color: #b8b6b4;
  text-decoration: none;
  padding: 8px 15px;
  font-size: 12px;
}

.steam-dropdown a:hover {
  background: #dcdedf;
  color: #171a21;
}

.steam-login-actions {
  color: #b8b6b4;
}

.steam-login-text {
  color: #b8b6b4;
  text-decoration: none;
  text-transform: lowercase;
}
.steam-login-text:hover { color: #fff; }
.steam-divider { margin: 0 5px; }

/* Store Nav Header */
.steam-store-header-bg {
  background: linear-gradient(90deg, rgba(34,53,74,1) 0%, rgba(27,40,56,1) 100%);
  display: flex;
  justify-content: center;
  height: 35px;
  box-shadow: 0 0 3px rgba(0,0,0,0.4);
}

.steam-store-header-container {
  width: 940px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.steam-store-nav {
  display: flex;
  height: 100%;
}

.steam-nav-item {
  color: #e5e4dc;
  font-size: 13px;
  font-weight: 500;
  padding: 0 15px;
  display: flex;
  align-items: center;
  cursor: pointer;
  text-decoration: none;
  position: relative;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

.steam-nav-item:hover {
  background: #3d5c7c;
  color: #ffffff;
}

.steam-dropdown-menu {
  position: absolute;
  top: 35px;
  left: 0;
  background: #3d4450;
  min-width: 160px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  z-index: 100;
  padding: 5px 0;
}

.steam-dropdown-menu.multi-col {
  flex-direction: row;
  min-width: 400px;
  padding: 10px;
  gap: 20px;
}

.steam-col {
  display: flex;
  flex-direction: column;
}

.steam-col strong {
  color: #66c0f4;
  margin-bottom: 5px;
  font-size: 13px;
  text-transform: uppercase;
}

.steam-dropdown-menu a {
  color: #b8b6b4;
  text-decoration: none;
  padding: 6px 15px;
  font-size: 12px;
  text-shadow: none;
}

.steam-dropdown-menu.multi-col a {
  padding: 4px 0;
}

.steam-dropdown-menu a:hover {
  background: #dcdedf;
  color: #171a21;
}

.steam-store-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.steam-search {
  background: #316282;
  border-radius: 3px;
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 5px;
  border: 1px solid rgba(0,0,0,0.3);
  box-shadow: inset 0 0 3px rgba(0,0,0,0.5);
}

.steam-search input {
  background: transparent;
  border: none;
  color: #fff;
  outline: none;
  font-size: 13px;
  width: 160px;
  padding-left: 5px;
}

.steam-search input::placeholder {
  color: #0e1c25;
  font-style: italic;
}

.steam-search-btn, .steam-ai-btn {
  background: transparent;
  border: none;
  color: #66c0f4;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}
.steam-ai-btn { color: #b8b6b4; }

.steam-wishlist-btn {
  background: rgba(103, 193, 245, 0.2);
  color: #67c1f5;
  text-decoration: none;
  padding: 0 10px;
  height: 28px;
  display: flex;
  align-items: center;
  font-size: 12px;
  border-radius: 2px;
}

.steam-wishlist-btn:hover {
  background: rgba(103, 193, 245, 0.4);
  color: #fff;
}
`;

fs.writeFileSync('frontend/src/tasty.css', txt + '\n' + steamStyles);
console.log('Appended steam styles directly');
