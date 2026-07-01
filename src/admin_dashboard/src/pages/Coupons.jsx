import React, { useEffect, useState } from 'react';
import { Percent, Plus, Trash2, RefreshCw } from 'lucide-react';

const Coupons = ({ token }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coupons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCoupons(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || !discountValue || !expiryDate) return;

    setFormLoading(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          discountType,
          discountValue: Number(discountValue),
          minOrderAmount: Number(minOrderAmount) || 0,
          expiryDate,
          usageLimit: usageLimit ? Number(usageLimit) : null
        })
      });
      const data = await res.json();

      if (data.success) {
        alert('Coupon created successfully!');
        setCode('');
        setDiscountValue('');
        setMinOrderAmount('');
        setExpiryDate('');
        setUsageLimit('');
        fetchCoupons();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error creating coupon');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchCoupons();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      
      {/* Coupon List Card */}
      <div className="card" style={{ padding: '0px' }}>
        <div style={{ padding: '24px 24px 12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="chart-title" style={{ marginBottom: 0 }}>Active Promotional Campaigns</h3>
          <button className="btn btn-secondary" onClick={fetchCoupons} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <RefreshCw size={12} /> Reload
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Coupon Code</th>
                <th>Discount Rate</th>
                <th>Minimum Cart</th>
                <th>Expires Date</th>
                <th>Usage</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading active coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No promotional coupons created.
                  </td>
                </tr>
              ) : (
                coupons.map(coupon => (
                  <tr key={coupon._id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                      {coupon.code}
                    </td>
                    <td>
                      {coupon.discountType === 'percentage' 
                        ? `${coupon.discountValue}% Off` 
                        : `₹${coupon.discountValue} Flat Off`}
                    </td>
                    <td>₹{coupon.minOrderAmount.toLocaleString('en-IN')}</td>
                    <td>{new Date(coupon.expiryDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      {/* Usage: usedCount / usageLimit */}
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>
                        {coupon.usedCount ?? 0}
                        {coupon.usageLimit !== null && coupon.usageLimit !== undefined
                          ? ` / ${coupon.usageLimit}`
                          : ' / ∞'
                        }
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const expired = new Date(coupon.expiryDate) <= new Date();
                        const limitReached = coupon.usageLimit !== null && coupon.usageLimit !== undefined && (coupon.usedCount ?? 0) >= coupon.usageLimit;
                        if (limitReached) return <span className="badge badge-danger">Limit Reached</span>;
                        if (expired || !coupon.isActive) return <span className="badge badge-danger">Expired</span>;
                        return <span className="badge badge-success">Valid</span>;
                      })()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-danger" onClick={() => handleDelete(coupon._id)} style={{ padding: '6px' }} title="Delete Coupon">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coupon Creator Form */}
      <div className="card" style={{ height: 'fit-content' }}>
        <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Percent size={18} style={{ color: 'var(--primary)' }} /> Create Promo Code
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label>Coupon Code Name</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. FESTIVE20"
              style={{ textTransform: 'uppercase' }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Discount Type</label>
              <select
                className="form-control"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Discount Value</label>
              <input
                type="number"
                required
                className="form-control"
                placeholder={discountType === 'percentage' ? '15%' : '500'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Minimum Order Threshold (₹)</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 1999"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Expiry Date & Time</label>
            <input
              type="datetime-local"
              required
              className="form-control"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Max Usage Limit <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '11px' }}>(leave empty = unlimited)</span></label>
            <input
              type="number"
              min="1"
              className="form-control"
              placeholder="e.g. 100"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={formLoading || !code || !discountValue || !expiryDate} style={{ justifyContent: 'center' }}>
            {formLoading ? 'Creating...' : 'Create Promo Code'}
          </button>
        </form>
      </div>

    </div>
  );
};

export default Coupons;
