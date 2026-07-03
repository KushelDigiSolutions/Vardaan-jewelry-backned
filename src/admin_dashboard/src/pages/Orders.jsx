import React, { useEffect, useState } from 'react';
import { ShoppingBag, Eye, X, Truck, Landmark, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setPage(1);
  }, [statusFilter, paymentFilter, methodFilter, startDateFilter, endDateFilter]);

  // Selected Order Drawer
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [shippingCarrier, setShippingCarrier] = useState('Delhivery');
  const [actionLoading, setActionLoading] = useState(false);
  const [tempStatus, setTempStatus] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenDetails = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.data);
        setTempStatus(data.data.orderStatus);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching order details');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderStatus: newStatus })
      });
      const data = await res.json();

      if (data.success) {
        alert(`Order status updated to ${newStatus}`);
        handleOpenDetails(selectedOrder._id); // Reload details
        fetchOrders(); // Reload list
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateAWB = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder._id}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ carrier: shippingCarrier })
      });
      const data = await res.json();

      if (data.success) {
        alert(`Shipment registered! AWB: ${data.data.tracking.awb}`);
        handleOpenDetails(selectedOrder._id);
        fetchOrders();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const statusMatch = !statusFilter || o.orderStatus === statusFilter;
    const paymentMatch = !paymentFilter || o.paymentStatus === paymentFilter;
    const methodMatch = !methodFilter || 
      (methodFilter === 'COD' ? o.paymentMethod === 'COD' : o.paymentMethod !== 'COD');
    
    let dateMatch = true;
    if (startDateFilter || endDateFilter) {
      const orderDate = new Date(o.createdAt);
      if (startDateFilter) {
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) dateMatch = false;
      }
      if (endDateFilter) {
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) dateMatch = false;
      }
    }
    
    return statusMatch && paymentMatch && methodMatch && dateMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pagedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {/* Toolbar filters */}
      <div className="toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="chart-title" style={{ marginBottom: 0 }}>Fulfillment Orders Log</h3>
          <button className="btn btn-secondary" onClick={fetchOrders}>
            <RefreshCw size={14} /> Reload Log
          </button>
        </div>
        
        <div className="filters-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}
          >
            <option value="">All Fulfillment Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="form-control"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}
          >
            <option value="">All Payment Statuses</option>
            <option value="pending">Pending Payment</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            className="form-control"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}
          >
            <option value="">All Payment Methods</option>
            <option value="COD">Cash on Delivery (COD)</option>
            <option value="Online">Online Payment</option>
          </select>

          {/* Date Range Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '2', minWidth: '320px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Date Range:</span>
            <input
              type="date"
              className="form-control"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              style={{ fontSize: '12px', marginBottom: 0 }}
              title="Start Date"
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              className="form-control"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              style={{ fontSize: '12px', marginBottom: 0 }}
              title="End Date"
            />
            {(startDateFilter || endDateFilter) && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                style={{ padding: '6px 10px', fontSize: '11px' }}
              >
                Clear Date
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List Table Card */}
      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Placement Date</th>
                <th>Client Customer</th>
                <th>Items Qty</th>
                <th>Payment Status</th>
                <th>Order Status</th>
                <th>Total Value</th>
                <th style={{ textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading order history log...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No orders matching filter attributes found.
                  </td>
                </tr>
              ) : (
                pagedOrders.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 'bold', fontSize: '12px' }}>#{o._id.substring(18)}</td>
                    <td style={{ fontSize: '13px' }}>{new Date(o.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '500' }}>{o.user?.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.user?.email}</span>
                      </div>
                    </td>
                    <td>{o.items.reduce((sum, item) => sum + item.quantity, 0)} items</td>
                    <td>
                      <span className={`badge badge-${o.paymentStatus === 'paid' ? 'success' : o.paymentStatus === 'pending' ? 'warning' : 'danger'}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${
                        o.orderStatus === 'delivered' ? 'success' :
                        o.orderStatus === 'shipped' ? 'info' :
                        o.orderStatus === 'confirmed' ? 'info' :
                        o.orderStatus === 'cancelled' ? 'danger' : 'warning'
                      }`}>
                        {o.orderStatus}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>₹{o.totalAmount.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" onClick={() => handleOpenDetails(o._id)} style={{ padding: '6px' }} title="View Details">
                        <Eye size={14} />
                      </button>
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
              Page {page} of {totalPages} ({filteredOrders.length} orders)
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

      {/* Selected Order Detailed Drawer Modal */}
      {showDetailModal && selectedOrder && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <h2>Order Fulfillment details: #{selectedOrder._id}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Top metadata grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="card" style={{ padding: '16px' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', color: 'var(--primary)' }}>
                    <Landmark size={16} /> Buyer & Billing Details
                  </h4>
                  <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p><b>Name:</b> {selectedOrder.user?.name}</p>
                    <p><b>Email:</b> {selectedOrder.user?.email}</p>
                    <p><b>Method:</b> {selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})</p>
                  </div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', color: 'var(--secondary)' }}>
                    <Truck size={16} /> Delivery Address
                  </h4>
                  <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p><b>Address:</b> {selectedOrder.shippingAddress.street}</p>
                    <p><b>City/State:</b> {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.zipCode}</p>
                    <p><b>Country:</b> {selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="card" style={{ padding: '0px' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '14px' }}>
                  Order Products Summary
                </div>
                <table className="custom-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Image</th>
                      <th>Product Title</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Row Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          {item.product?.images?.[0] ? (
                            <img 
                              src={item.product.images[0]} 
                              alt={item.name} 
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                objectFit: 'cover', 
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)' 
                              }} 
                            />
                          ) : (
                            <div 
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                backgroundColor: 'rgba(255,255,255,0.05)', 
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                color: 'var(--text-muted)'
                              }}
                            >
                              N/A
                            </div>
                          )}
                        </td>
                        <td>{item.name}</td>
                        <td style={{ fontFamily: 'monospace' }}>{item.product?.sku || 'N/A'}</td>
                        <td>{item.quantity}</td>
                        <td>₹{item.price.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                      <td colSpan={4}></td>
                      <td style={{ color: 'var(--text-muted)' }}>Items Subtotal:</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4}></td>
                      <td style={{ color: 'var(--text-muted)' }}>Shipping Cost:</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{(selectedOrder.shippingCost || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                    {(() => {
                      const itemsSubtotal = selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                      const expectedTotal = itemsSubtotal + (selectedOrder.shippingCost || 0);
                      const calculatedDiscount = Math.max(0, expectedTotal - selectedOrder.totalAmount);
                      
                      if (calculatedDiscount > 0) {
                        return (
                          <tr>
                            <td colSpan={4}></td>
                            <td style={{ color: 'var(--success)', fontWeight: '500' }}>
                              Discount Applied {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : '(Promo/Coupon)'}:
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                              -₹{calculatedDiscount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      }
                      return null;
                    })()}
                    <tr>
                      <td colSpan={4}></td>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Grand Total:</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)', fontSize: '15px' }}>
                        ₹{selectedOrder.totalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Action Controls Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
                {/* 1. Status controls */}
                <div className="card" style={{ padding: '16px' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Modify Order State</h4>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label>Fulfillment Stage</label>
                    <select
                      className="form-control"
                      value={tempStatus}
                      disabled={actionLoading}
                      onChange={(e) => setTempStatus(e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ marginTop: '8px', justifyContent: 'center' }}
                      disabled={actionLoading || tempStatus === selectedOrder.orderStatus}
                      onClick={() => handleStatusChange(tempStatus)}
                    >
                      Confirm Status Update
                    </button>
                  </div>
                </div>

                {/* 2. Dispatch / AWB creation */}
                <div className="card" style={{ padding: '16px' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Delivery Partner Dispatch</h4>
                  {selectedOrder.tracking.awb ? (
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <p><b>Carrier Partner:</b> {selectedOrder.tracking.carrier}</p>
                      <p><b>AWB Code:</b> <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--secondary)' }}>{selectedOrder.tracking.awb}</span></p>
                      <span className="badge badge-success" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
                        AWB Registered Successfully
                      </span>
                    </div>
                  ) : selectedOrder.orderStatus === 'confirmed' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Select Logistic Partner</label>
                        <select
                          className="form-control"
                          value={shippingCarrier}
                          onChange={(e) => setShippingCarrier(e.target.value)}
                        >
                          <option value="Delhivery">Delhivery Express</option>
                          <option value="Shiprocket">Shiprocket Cargo</option>
                          <option value="Blue Dart">Blue Dart Premium</option>
                        </select>
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={handleGenerateAWB}
                        disabled={actionLoading}
                        style={{ justifyContent: 'center' }}
                      >
                        Generate AWB & Dispatch
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Generate shipments only after payment is captured and status is confirmed.
                    </p>
                  )}
                </div>
              </div>

              {/* Tracking Status logs timeline */}
              <div className="card" style={{ padding: '16px' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Tracking status history timeline</h4>
                <div className="timeline">
                  {selectedOrder.tracking.statusHistory.map((history, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot-wrapper">
                        <div className="timeline-dot"></div>
                        <div className="timeline-line"></div>
                      </div>
                      <div className="timeline-content">
                        <span className="timeline-status">{history.status}</span>
                        <span className="timeline-msg">{history.message}</span>
                        <span className="timeline-time">{new Date(history.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close Panel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
