import React, { useState, useEffect } from 'react';
import { Search, Mail, Phone, Calendar, X } from 'lucide-react';

const Contacts = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Modal state
  const [activeMessage, setActiveMessage] = useState(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error('Error fetching contact messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleToggleResolve = async (id) => {
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setMessages(prev => prev.map(m => m._id === id ? { ...m, isResolved: !m.isResolved } : m));
        // If modal is open, sync modal state
        if (activeMessage && activeMessage._id === id) {
          setActiveMessage(prev => ({ ...prev, isResolved: !prev.isResolved }));
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Filter messages based on search and status dropdown
  const filteredMessages = messages.filter(m => {
    const nameStr = m.name || '';
    const emailStr = m.email || '';
    const phoneStr = m.phone || '';
    const subjectStr = m.subject || '';
    const messageStr = m.message || '';

    const matchesSearch = 
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emailStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phoneStr.includes(searchTerm) ||
      subjectStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      messageStr.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      selectedStatus === 'all' ? true :
      selectedStatus === 'resolved' ? m.isResolved : !m.isResolved;

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Search and Filters Toolbar */}
      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, email, phone or message keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-wrapper">
          <select
            className="form-control"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '0px' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer Details</th>
                <th>Contact Info</th>
                <th>Inquiry Subject</th>
                <th>Date Received</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Retrieving inquiries from database...
                  </td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No contact messages found.
                  </td>
                </tr>
              ) : (
                filteredMessages.map(m => (
                  <tr key={m._id} style={{ verticalAlign: 'middle' }}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>{m.name}</span>
                        {m.phone && <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Phone size={12} /> {m.phone}</span>}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} style={{ color: 'var(--text-dark)' }} />
                        <a href={`mailto:${m.email}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>{m.email}</a>
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '300px' }}>
                        <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.subject}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{m.message}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <Calendar size={14} />
                        {new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${m.isResolved ? 'success' : 'warning'}`}>
                        {m.isResolved ? 'Resolved' : 'Pending Review'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setActiveMessage(m)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          View Inquiry
                        </button>
                        <button
                          className={`btn ${m.isResolved ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleToggleResolve(m._id)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          {m.isResolved ? 'Mark Pending' : 'Mark Resolved'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Modal */}
      {activeMessage && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2>Private Concierge Inquiry</h2>
              <button className="modal-close" onClick={() => setActiveMessage(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* User details header card */}
              <div style={{ backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{activeMessage.name}</h3>
                  <span className={`badge badge-${activeMessage.isResolved ? 'success' : 'warning'}`}>
                    {activeMessage.isResolved ? 'Resolved' : 'Pending Review'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> Email: {activeMessage.email}</span>
                  {activeMessage.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> Phone: {activeMessage.phone}</span>}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={12} /> Received: {new Date(activeMessage.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Inquiry Subject & message block */}
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dark)', fontWeight: 'bold', tracking: '0.5px' }}>Subject Topic</span>
                <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '4px', marginBottom: '12px', color: 'var(--text-main)' }}>{activeMessage.subject}</h4>
                
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dark)', fontWeight: 'bold', tracking: '0.5px' }}>Detailed Message Inquiry</span>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.015)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                  {activeMessage.message}
                </p>
              </div>

            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setActiveMessage(null)}>Close</button>
              <button 
                type="button" 
                className={`btn ${activeMessage.isResolved ? 'btn-secondary' : 'btn-primary'}`} 
                onClick={() => handleToggleResolve(activeMessage._id)}
              >
                {activeMessage.isResolved ? 'Mark Pending Review' : 'Mark as Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Contacts;
