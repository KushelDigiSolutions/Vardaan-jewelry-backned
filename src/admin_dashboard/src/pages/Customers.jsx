import React, { useEffect, useState } from 'react';
import { Search, UserCheck, UserX, RefreshCw, Mail, Edit2, Trash2, X, Eye, MapPin, Calendar, Shield, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { useLoader } from '../context/LoaderContext.jsx';

const Customers = ({ token }) => {
  const toast = useToast();
  const { showLoader, hideLoader } = useLoader();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Edit Customer States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // View Customer States
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, sortBy]);

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

    showLoader(currentStatus ? 'Suspending account...' : 'Activating account...');
    try {
      const res = await fetch(`/api/customers/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || `Customer account ${currentStatus ? 'suspended' : 'activated'} successfully!`);
        fetchCustomers();
      } else {
        toast.error(data.message || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error changing account status');
    } finally {
      hideLoader();
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

  const [submittingEdit, setSubmittingEdit] = useState(false);

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setSubmittingEdit(true);
    showLoader('Saving customer profile...');
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
        toast.success(data.message || 'Customer profile updated successfully!');
        setShowEditModal(false);
        fetchCustomers();
      } else {
        toast.error(data.message || 'Failed to update customer profile');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating customer');
    } finally {
      setSubmittingEdit(false);
      hideLoader();
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this customer? This action is irreversible.')) return;
    showLoader('Deleting customer profile...');
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || 'Customer account deleted successfully!');
        fetchCustomers();
      } else {
        toast.error(data.message || 'Failed to delete customer');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting customer');
    } finally {
      hideLoader();
    }
  };

  const filteredCustomers = customers
    .filter(c => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term || 
        c.name.toLowerCase().includes(term) || 
        c.email.toLowerCase().includes(term);

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && c.isActive) ||
        (statusFilter === 'suspended' && !c.isActive);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const pagedCustomers = filteredCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="chart-title" style={{ marginBottom: 0 }}>Registered Customer Directory</h3>
          <button className="btn btn-secondary" onClick={fetchCustomers}>
            <RefreshCw size={14} /> Reload Directory
          </button>
        </div>
        
        {/* Search & Filters Row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '2', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search customers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px', fontSize: '13px', marginBottom: '0' }}
            />
          </div>

          <div style={{ flex: '1', minWidth: '150px' }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: '13px', marginBottom: '0', height: '100%' }}
            >
              <option value="all">All Account Status</option>
              <option value="active">Active Accounts</option>
              <option value="suspended">Suspended Accounts</option>
            </select>
          </div>

          <div style={{ flex: '1', minWidth: '150px' }}>
            <select
              className="form-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ fontSize: '13px', marginBottom: '0', height: '100%' }}
            >
              <option value="newest">Joined: Newest First</option>
              <option value="oldest">Joined: Oldest First</option>
            </select>
          </div>
        </div>
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
                pagedCustomers.map(c => (
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
                      <span className="badge badge-info">{c.addresses?.length || 0} addresses</span>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: '1px solid var(--border-color)', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} ({filteredCustomers.length} customers)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
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
                <button type="submit" disabled={submittingEdit} className="btn btn-primary">
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
