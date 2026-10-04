const fs = require('fs');
let txt = fs.readFileSync('frontend/src/tasty.css', 'utf8');

const sbmStyles = `
/* MEGA MENU BROWSE */
.steam-browse-mega {
  position: absolute;
  top: 35px;
  left: 0;
  background: #171d25;
  width: 800px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.5);
  display: flex;
  z-index: 100;
  border: 1px solid #3d4450;
  padding: 10px;
  gap: 20px;
  cursor: default;
}

.sbm-col-left {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  background: #1b2838;
}

.sbm-main-link {
  display: flex;
  flex-direction: column;
  padding: 15px 20px;
  text-decoration: none;
  border-bottom: 1px solid #2a475e;
}

.sbm-main-link:hover {
  background: #2a475e;
}

.sbm-main-link .sbm-title {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  text-shadow: none;
}

.sbm-main-link .sbm-desc {
  color: #8f98a0;
  font-size: 11px;
  margin-top: 5px;
  text-shadow: none;
}

.sbm-col-mid {
  flex: 1.5;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 15px;
}

.sbm-card-popular {
  display: flex;
  width: 100%;
  height: 140px;
  background: linear-gradient(135deg, #a73599 0%, #d87bb0 100%);
  text-decoration: none;
  color: #171a21;
  font-weight: bold;
  font-size: 14px;
  justify-content: center;
  align-items: center;
  position: relative;
  text-shadow: none;
}

.sbm-card-popular span {
  background: #fff;
  padding: 5px 10px;
  text-transform: uppercase;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.sbm-card-popular:hover {
  filter: brightness(1.1);
}

.sbm-col-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 15px;
}

.sbm-side-group {
  display: flex;
  flex-direction: column;
}

.sbm-side-title {
  color: #8f98a0;
  font-size: 10px;
  text-transform: uppercase;
  margin-bottom: 5px;
  letter-spacing: 1px;
  text-shadow: none;
}

.sbm-side-item {
  color: #e5e4dc;
  text-decoration: none;
  font-size: 12px;
  padding: 4px 0;
  text-shadow: none;
}

.sbm-side-item:hover {
  color: #fff;
  text-decoration: underline;
  background: transparent;
}
`;

fs.writeFileSync('frontend/src/tasty.css', txt + '\\n' + sbmStyles);
console.log('Appended Mega Menu styles');
