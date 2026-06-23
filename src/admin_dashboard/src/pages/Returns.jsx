import React, { useEffect, useState } from 'react';
import { RefreshCw, ClipboardList, Check, X, Award } from 'lucide-react';

const Returns = ({ token }) => {
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/returns', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReturnRequests(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    const actStr = status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'mark refunded';
    const notes = window.prompt(`Enter administration memo notes for this ${actStr} action:`);
    if (notes === null) return; // cancel

    setActionLoading(true);
    try {
      const res = await fetch(`/api/returns/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, adminNotes: notes })
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        fetchReturns();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h3 className="chart-title" style={{ marginBottom: 0 }}>Customer Return & Refund Requests</h3>
        <button className="btn btn-secondary" onClick={fetchReturns}>
          <RefreshCw size={14} /> Reload Registry
        </button>
      </div>

      <div className="card" style={{ padding: '0px' }}>
        <div className="table-container">
          <table className="custom-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Request Details</th>
                <th>Returned Products</th>
                <th>Refund Target Channel</th>
                <th>Total Value</th>
                <th>Request Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading customer return registry...
                  </td>
                </tr>
              ) : returnRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No return requests received.
                  </td>
                </tr>
              ) : (
                returnRequests.map(req => (
                  <tr key={req._id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span><b>Client:</b> {req.user?.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.user?.email}</span>
                        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>Order: #{req.order?._id.substring(18)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {req.items.map((item, idx) => (
                          <span key={idx} style={{ fontSize: '12px' }}>
                            • {item.name} (Qty: {item.quantity}) - <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Reason: {item.reason}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {req.refundMethod === 'upi' ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="badge badge-info" style={{ alignSelf: 'flex-start' }}>UPI Transfer</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', marginTop: '4px' }}>{req.refundDetails?.upiId}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '11px' }}>
                          <span className="badge badge-success" style={{ alignSelf: 'flex-start', marginBottom: '4px' }}>Bank Account</span>
                          <span><b>Bank Name:</b> {req.refundDetails?.bankName}</span>
                          <span><b>Account:</b> {req.refundDetails?.accountNo}</span>
                          <span><b>IFSC:</b> {req.refundDetails?.ifsc}</span>
                          <span><b>Holder:</b> {req.refundDetails?.holderName}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      ₹{req.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge badge-${
                        req.status === 'refunded' ? 'success' :
                        req.status === 'approved' ? 'info' :
                        req.status === 'rejected' ? 'danger' : 'warning'
                      }`}>
                        {req.status}
                      </span>
                      {req.adminNotes && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '150px', fontStyle: 'italic' }}>
                          Memo: {req.adminNotes}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {req.status === 'pending' && (
                          <>
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => handleUpdateStatus(req._id, 'approved')} 
                              disabled={actionLoading} 
                              style={{ padding: '6px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399' }}
                              title="Approve Return"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              className="btn btn-secondary btn-danger" 
                              onClick={() => handleUpdateStatus(req._id, 'rejected')} 
                              disabled={actionLoading} 
                              style={{ padding: '6px' }}
                              title="Reject Return"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                        {req.status === 'approved' && (
                          <button 
                            className="btn btn-primary" 
                            onClick={() => handleUpdateStatus(req._id, 'refunded')} 
                            disabled={actionLoading} 
                            style={{ padding: '6px 12px', fontSize: '11px' }}
                          >
                            Mark Refunded
                          </button>
                        )}
                        {(req.status === 'refunded' || req.status === 'rejected') && (
                          <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>Audit Complete</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Returns;
