import React, { useEffect, useState } from 'react';
import { UserCheck, UserX, RefreshCw, Mail, Edit2, Trash2, X } from 'lucide-react';

const Customers = ({ token }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Customer States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

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
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                        }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
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

      {/* Edit Customer Modal */}
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
