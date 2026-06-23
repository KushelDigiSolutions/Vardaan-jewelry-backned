import React, { useEffect, useState } from 'react';
import { ShoppingBag, Eye, X, Truck, Landmark, RefreshCw } from 'lucide-react';

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

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
    return statusMatch && paymentMatch;
  });

  return (
    <div>
      {/* Toolbar filters */}
      <div className="toolbar">
        <h3 className="chart-title" style={{ marginBottom: 0 }}>Fulfillment Orders Log</h3>
        
        <div className="filters-wrapper">
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
          >
            <option value="">All Payment Statuses</option>
            <option value="pending">Pending Payment</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <button className="btn btn-secondary" onClick={fetchOrders}>
            <RefreshCw size={14} /> Reload Log
          </button>
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
                filteredOrders.map(o => (
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
                      <td colSpan={3}></td>
                      <td style={{ color: 'var(--text-muted)' }}>Shipping Cost:</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ₹{selectedOrder.shippingCost.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3}></td>
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
