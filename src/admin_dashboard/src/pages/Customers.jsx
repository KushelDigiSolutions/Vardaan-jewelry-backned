import React, { useEffect, useState } from 'react';
import { UserCheck, UserX, RefreshCw, Mail, Edit2, Trash2, X, Eye, MapPin, Calendar, Shield, Home } from 'lucide-react';

const Customers = ({ token }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Customer States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // View Customer States
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    const actStr = currentStatus ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actStr} this customer account?`)) return;

    try {
      const res = await fetch(`/api/customers/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        fetchCustomers();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (cust) => {
    setEditCustomerId(cust._id);
    setEditName(cust.name);
    setEditEmail(cust.email);
    setShowEditModal(true);
  };

  const handleViewClick = (cust) => {
    setViewCustomer(cust);
    setShowViewModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/customers/${editCustomerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, email: editEmail })
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        setShowEditModal(false);
        fetchCustomers();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error updating customer');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this customer? This action is irreversible.')) return;
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        fetchCustomers();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting customer');
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h3 className="chart-title" style={{ marginBottom: 0 }}>Registered Customer Directory</h3>
        <button className="btn btn-secondary" onClick={fetchCustomers}>
          <RefreshCw size={14} /> Reload
        </button>
      </div>

      <div className="card" style={{ padding: '0px' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Email Address</th>
                <th>Addresses Saved</th>
                <th>Member Since</th>
                <th>Account Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading customers profile directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No customers registered yet.
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {c.avatar ? (
                          <img
                            src={c.avatar}
                            alt={c.name}
                            style={{
                              width: '34px', height: '34px', borderRadius: '50%',
                              border: '2px solid rgba(16,185,129,0.3)',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                            onError={e => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=0d9488&color=fff&size=64`;
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '50%',
                            backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '14px',
                            border: '2px solid rgba(16,185,129,0.25)', flexShrink: 0
                          }}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontWeight: '600' }}>{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={12} style={{ color: 'var(--text-muted)' }} /> {c.email}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{c.addresses?.length || 0} addresses</span>
                    </td>
                    <td>{new Date(c.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <span className={`badge badge-${c.isActive ? 'success' : 'danger'}`}>
                        {c.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        {/* View Button */}
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleViewClick(c)}
                          style={{ padding: '6px' }}
                          title="View Details"
                        >
                          <Eye size={12} />
                        </button>

                        <button
                          className={`btn ${c.isActive ? 'btn-danger' : 'btn-primary'}`}
                          style={{ padding: '6px 12px', fontSize: '11px', display: 'inline-flex' }}
                          onClick={() => handleToggleStatus(c._id, c.isActive)}
                          title={c.isActive ? 'Suspend' : 'Activate'}
                        >
                          {c.isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                        </button>
                        
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleEditClick(c)} 
                          style={{ padding: '6px' }}
                          title="Edit Profile"
                        >
                          <Edit2 size={12} />
                        </button>
                        
                        <button 
                          className="btn btn-secondary btn-danger" 
                          onClick={() => handleDeleteCustomer(c._id)} 
                          style={{ padding: '6px' }}
                          title="Delete Customer"
                        >
                          <Trash2 size={12} />
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

      {/* ===== View Customer Modal ===== */}
      {showViewModal && viewCustomer && (
        <div className="modal-backdrop" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%' }}>
            <div className="modal-header">
              <h2>Customer Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}><X size={20} /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Avatar + Name + Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {viewCustomer.avatar ? (
                  <img
                    src={viewCustomer.avatar}
                    alt={viewCustomer.name}
                    style={{
                      width: '80px', height: '80px', borderRadius: '50%',
                      border: '3px solid rgba(16,185,129,0.4)',
                      objectFit: 'cover',
                      flexShrink: 0,
                      boxShadow: '0 4px 20px rgba(16,185,129,0.25)'
                    }}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(viewCustomer.name)}&background=0d9488&color=fff&size=160`;
                    }}
                  />
                ) : (
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(16,185,129,0.1))',
                    color: 'var(--primary)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '30px', fontWeight: 'bold',
                    border: '3px solid rgba(16,185,129,0.35)', flexShrink: 0,
                    boxShadow: '0 4px 20px rgba(16,185,129,0.15)'
                  }}>
                    {viewCustomer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {viewCustomer.name}
                  </div>
                  <span className={`badge badge-${viewCustomer.isActive ? 'success' : 'danger'}`}>
                    {viewCustomer.isActive ? '● Active' : '● Suspended'}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--border-color)' }} />

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Mail size={10} /> Email
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {viewCustomer.email}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={10} /> Member Since
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    {new Date(viewCustomer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Shield size={10} /> Account ID
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {viewCustomer._id}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={10} /> Addresses
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    {viewCustomer.addresses?.length || 0} saved
                  </span>
                </div>
              </div>

              {/* Saved Addresses List */}
              {viewCustomer.addresses && viewCustomer.addresses.length > 0 && (
                <>
                  <div style={{ borderTop: '1px solid var(--border-color)' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Home size={11} /> Saved Addresses
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {viewCustomer.addresses.map((addr, idx) => (
                        <div key={idx} style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          lineHeight: '1.6'
                        }}>
                          <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                            {addr.fullName || viewCustomer.name}
                            {addr.phone && <span style={{ fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>📞 {addr.phone}</span>}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {[addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode, addr.country]
                              .filter(Boolean).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={() => { setShowViewModal(false); handleEditClick(viewCustomer); }}>
                <Edit2 size={13} style={{ marginRight: '6px' }} /> Edit Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit Customer Modal ===== */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Customer Profile</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCustomer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Enter customer name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    placeholder="name@email.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
