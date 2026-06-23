import React, { useEffect, useState } from 'react';
import { Bell, ShieldCheck, Mail, AlertTriangle, CheckCircle, Package } from 'lucide-react';

const Header = ({ currentTab, token }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds for real-time dashboard alert updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleMarkRead = async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return { title: 'Dashboard Analytics', subtitle: 'Overview of platform performance and operations' };
      case 'products': return { title: 'Products Catalog', subtitle: 'Manage listings, pricing, and dynamic specifications' };
      case 'categories': return { title: 'Category Tree', subtitle: 'Organize items in infinite category hierarchies' };
      case 'orders': return { title: 'Order Fulfillment', subtitle: 'Process user payments, track dispatches, and print labels' };
      case 'customers': return { title: 'Customer Profiles', subtitle: 'View customer directories and status authorizations' };
      case 'inventory': return { title: 'Inventory Adjuster', subtitle: 'Audit inventory entries and restock store products' };
      default: return { title: 'Management Suite', subtitle: 'Admin settings panel' };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <div className="header">
      <div className="header-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="header-actions" style={{ position: 'relative' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowNotifications(!showNotifications)}
          style={{ padding: '10px', borderRadius: '50%', position: 'relative' }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px', backgroundColor: 'var(--danger)',
              color: 'white', fontSize: '9px', fontWeight: 'bold', width: '18px', height: '18px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center'
            }}>
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Popover Drawer */}
        {showNotifications && (
          <div className="card" style={{
            position: 'absolute', top: '55px', right: 0, width: '360px', zIndex: 1000,
            padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
            maxHeight: '400px', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>System Alerts ({unreadCount})</span>
              <span onClick={() => setShowNotifications(false)} style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>Close</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>No notifications.</p>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n._id} 
                    onClick={() => !n.isRead && handleMarkRead(n._id)}
                    style={{
                      display: 'flex', gap: '10px', padding: '10px', borderRadius: '8px',
                      backgroundColor: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                      cursor: n.isRead ? 'default' : 'pointer', border: '1px solid rgba(255,255,255,0.02)'
                    }}
                  >
                    <div style={{ alignSelf: 'flex-start', color: n.title.includes('Stock') ? 'var(--warning)' : 'var(--success)', marginTop: '2px' }}>
                      {n.title.includes('Stock') ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: n.isRead ? 'var(--text-muted)' : 'var(--text-main)' }}>{n.title}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n.message}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-dark)' }}>{new Date(n.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
