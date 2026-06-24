import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Login from './pages/Login.jsx';

// Pages
import DashboardHome from './pages/DashboardHome.jsx';
import Products from './pages/Products.jsx';
import Categories from './pages/Categories.jsx';
import Orders from './pages/Orders.jsx';
import Customers from './pages/Customers.jsx';
import Inventory from './pages/Inventory.jsx';
import Coupons from './pages/Coupons.jsx';
import Returns from './pages/Returns.jsx';
import Contacts from './pages/Contacts.jsx';

function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || null);
  const [adminUser, setAdminUser] = useState(
    JSON.parse(localStorage.getItem('admin_user')) || null
  );
  const [currentTab, setCurrentTab] = useState('dashboard');

  const handleLoginSuccess = (userToken, userData) => {
    localStorage.setItem('admin_token', userToken);
    localStorage.setItem('admin_user', JSON.stringify(userData));
    setToken(userToken);
    setAdminUser(userData);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setAdminUser(null);
  };

  // Auth gate check
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardHome token={token} onViewChange={setCurrentTab} />;
      case 'products':
        return <Products token={token} />;
      case 'categories':
        return <Categories token={token} />;
      case 'orders':
        return <Orders token={token} />;
      case 'customers':
        return <Customers token={token} />;
      case 'inventory':
        return <Inventory token={token} />;
      case 'coupons':
        return <Coupons token={token} />;
      case 'returns':
        return <Returns token={token} />;
      case 'contacts':
        return <Contacts token={token} />;
      default:
        return <DashboardHome token={token} onViewChange={setCurrentTab} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        adminUser={adminUser}
        onLogout={handleLogout}
      />
      <div className="main-content">
        <Header currentTab={currentTab} token={token} />
        <div style={{ flexGrow: 1 }}>
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
}

export default App;
