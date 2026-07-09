import React, { useEffect, useState } from 'react';
import { RefreshCw, Check, X, FileText, Image, Video, Eye } from 'lucide-react';

const Returns = ({ token }) => {
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

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
    const actStr = status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'mark replaced';
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
        setSelectedRequest(null);
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
    <div style={{ position: 'relative', minHeight: '80vh' }}>
      <div className="toolbar">
        <h3 className="chart-title" style={{ marginBottom: 0 }}>Customer Replacement Requests</h3>
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
                <th>Products for Replacement</th>
                <th>Reason</th>
                <th>Proof Attachments</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading customer replacement registry...
                  </td>
                </tr>
              ) : returnRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No replacement requests received.
                  </td>
                </tr>
              ) : (
                returnRequests.map(req => (
                  <tr key={req._id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span><b>Client:</b> {req.user?.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.user?.email}</span>
                        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>Order: #{req.order?._id?.substring(18) || req.order}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {req.items.map((item, idx) => (
                          <span key={idx} style={{ fontSize: '12px' }}>
                            • {item.name} (Qty: {item.quantity})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: '500' }}>{req.reason}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: 'var(--text-dark)' }}>
                        <span>📷 {req.photos ? req.photos.length : 0} Photo(s)</span>
                        <span>🎥 {req.videos ? req.videos.length : 0} Video(s)</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${
                        req.status === 'replaced' ? 'success' :
                        req.status === 'approved' ? 'info' :
                        req.status === 'rejected' ? 'danger' : 'warning'
                      }`}>
                        {req.status}
                      </span>
                      {req.adminNotes && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '150px', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Notes: {req.adminNotes}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => setSelectedRequest(req)} 
                          style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', backgroundColor: 'rgba(7,81,46,0.1)', color: 'var(--primary)' }}
                          title="View Details"
                        >
                          <Eye size={12} /> View Details
                        </button>
                        {req.status === 'pending' && (
                          <>
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => handleUpdateStatus(req._id, 'approved')} 
                              disabled={actionLoading} 
                              style={{ padding: '6px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399' }}
                              title="Approve Request"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              className="btn btn-secondary btn-danger" 
                              onClick={() => handleUpdateStatus(req._id, 'rejected')} 
                              disabled={actionLoading} 
                              style={{ padding: '6px' }}
                              title="Reject Request"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                        {req.status === 'approved' && (
                          <button 
                            className="btn btn-primary" 
                            onClick={() => handleUpdateStatus(req._id, 'replaced')} 
                            disabled={actionLoading} 
                            style={{ padding: '6px 12px', fontSize: '11px' }}
                          >
                            Mark Replaced
                          </button>
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

      {/* VIEW DETAILS MODAL */}
      {selectedRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              // justifyContent: 'between',
              alignItems: 'center',
              padding: '15px 20px',
              borderBottom: '1px solid #eee',
              backgroundColor: '#07512E',
              color: '#white',
              justifyContent: 'space-between'
            }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                Replacement Ticket Details
              </h4>
              <button 
                onClick={() => setSelectedRequest(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '18px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: '20px', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Metadata Grid */}
              <div style={{
    display: 'grid',
    gridTemplateColumns:
      window.innerWidth < 576 ? '1fr' : 'repeat(2, 1fr)',
    gap: '15px',
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '6px',
  }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', display: 'block' }}>Client Name</span>
                  <span style={{ fontWeight: '600' }}>{selectedRequest.user?.name}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', display: 'block' }}>Email Address</span>
                  <span>{selectedRequest.user?.email}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', display: 'block' }}>Order Reference</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>#{selectedRequest.order?._id || selectedRequest.order}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', display: 'block' }}>Submitted Date</span>
                  <span>{new Date(selectedRequest.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Products Section */}
              <div>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#333' }}>
                  Requested Products
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedRequest.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#fcfcfc', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
                      <span style={{ fontWeight: '500' }}>{item.name}</span>
                      <span style={{ color: '#555' }}>Qty: <b>{item.quantity}</b> &bull; Price: ₹{item.price.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason and Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Reason Category</span>
                  <span style={{ fontWeight: '600', padding: '4px 8px', backgroundColor: '#ffeebf', color: '#855d00', borderRadius: '4px', fontSize: '12px', display: 'inline-block' }}>
                    {selectedRequest.reason}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Detailed Customer Description</span>
                  <div style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {selectedRequest.description}
                  </div>
                </div>
              </div>

              {/* Photo Attachments (Multiple) */}
              <div>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#333' }}>
                  Photo Proofs ({selectedRequest.photos ? selectedRequest.photos.length : 0})
                </h5>
                {selectedRequest.photos && selectedRequest.photos.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                    {selectedRequest.photos.map((photo, i) => (
                      <a key={i} href={photo} target="_blank" rel="noreferrer" title="Click to view full image">
                        <img 
                          src={photo} 
                          alt={`Proof ${i + 1}`} 
                          style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }} 
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No photos uploaded.</p>
                )}
              </div>

              {/* Video Attachments (Multiple with controls) */}
              <div>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#333' }}>
                  Video Proofs ({selectedRequest.videos ? selectedRequest.videos.length : 0})
                </h5>
                {selectedRequest.videos && selectedRequest.videos.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '15px' }}>
                    {selectedRequest.videos.map((video, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <video 
                          src={video} 
                          controls 
                          style={{ width: '100%', height: '160px', backgroundColor: '#000', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                        <a 
                          href={video} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'underline', fontWeight: 'bold', alignSelf: 'flex-start' }}
                        >
                          Open Video {i + 1} in New Tab
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: '#888', fontStyle: 'italic' }}>No videos uploaded.</p>
                )}
              </div>

              {/* Status and Notes */}
              <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Current Status:</span>
                  <span className={`badge badge-${
                    selectedRequest.status === 'replaced' ? 'success' :
                    selectedRequest.status === 'approved' ? 'info' :
                    selectedRequest.status === 'rejected' ? 'danger' : 'warning'
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
                {selectedRequest.adminNotes && (
                  <div style={{ padding: '10px', backgroundColor: '#fcf8e3', border: '1px solid #faebcc', color: '#8a6d3b', borderRadius: '4px', fontSize: '12px' }}>
                    <b>Administration Memo:</b> "{selectedRequest.adminNotes}"
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '15px 20px',
              borderTop: '1px solid #eee',
              backgroundColor: '#f9f9f9',
              gap: '10px'
            }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedRequest(null)}
                style={{ padding: '8px 16px' }}
              >
                Close Ticket
              </button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button 
                    className="btn btn-success" 
                    onClick={() => handleUpdateStatus(selectedRequest._id, 'approved')} 
                    disabled={actionLoading} 
                    style={{ padding: '8px 16px', backgroundColor: '#10b981', color: '#white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Approve Replacement
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleUpdateStatus(selectedRequest._id, 'rejected')} 
                    disabled={actionLoading} 
                    style={{ padding: '8px 16px' }}
                  >
                    Reject Ticket
                  </button>
                </>
              )}
              {selectedRequest.status === 'approved' && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleUpdateStatus(selectedRequest._id, 'replaced')} 
                  disabled={actionLoading} 
                  style={{ padding: '8px 16px' }}
                >
                  Mark Replaced
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;
