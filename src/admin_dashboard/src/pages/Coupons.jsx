import React, { useEffect, useState } from 'react';
import { Percent, Plus, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const Coupons = ({ token }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Form States
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const getCurrentDateTimeString = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };

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
    
    if (!code || !code.trim()) {
      alert('Please fill out the Coupon Code Name field.');
      return;
    }
    if (!discountValue) {
      alert('Please fill out the Discount Value field.');
      return;
    }
    if (!startDate) {
      alert('Please fill out the Start Date & Time field.');
      return;
    }
    if (!expiryDate) {
      alert('Please fill out the Expiry Date & Time field.');
      return;
    }

    // Validation: Discount Value & Type range
    const dVal = Number(discountValue);
    if (isNaN(dVal) || dVal <= 0) {
      alert('Discount Value must be a valid number greater than 0.');
      return;
    }
    if (discountType === 'percentage' && (dVal < 1 || dVal > 99)) {
      alert('Percentage discount must be between 1 and 99.');
      return;
    }

    // Validation: Minimum Order Threshold
    if (minOrderAmount !== '') {
      const minAmt = Number(minOrderAmount);
      if (isNaN(minAmt) || minAmt < 0) {
        alert('Minimum Order Threshold must be 0 or more.');
        return;
      }
    }

    // Validation: Max Usage Limit
    if (usageLimit !== '') {
      const limit = Number(usageLimit);
      if (isNaN(limit) || limit < 1) {
        alert('Max Usage Limit must be 1 or more.');
        return;
      }
    }

    const now = new Date();
    const sDate = new Date(startDate);
    const eDate = new Date(expiryDate);

    // Validation: Start Date must be today or in the future
    // Allow a small 1-minute buffer for client-server clock sync issues
    if (sDate < new Date(now.getTime() - 60000)) {
      alert('Start Date & Time must be today or in the future.');
      return;
    }

    // Validation: Expiry Date must be after Start Date
    if (eDate <= sDate) {
      alert('Expiry Date & Time must be after the Start Date & Time.');
      return;
    }

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
          startDate: new Date(startDate).toISOString(),
          expiryDate: new Date(expiryDate).toISOString(),
          usageLimit: usageLimit ? Number(usageLimit) : null
        })
      });
      const data = await res.json();

      if (data.success) {
        alert('Coupon created successfully!');
        setCode('');
        setDiscountValue('');
        setMinOrderAmount('');
        setStartDate('');
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

  const totalPages = Math.max(1, Math.ceil(coupons.length / PAGE_SIZE));
  const pagedCoupons = coupons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
                <th>Starts Date</th>
                <th>Expires Date</th>
                <th>Usage</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading active coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No promotional coupons created.
                  </td>
                </tr>
              ) : (
                pagedCoupons.map(coupon => (
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
                    <td>
                      {coupon.startDate 
                        ? new Date(coupon.startDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                        : 'Immediate'
                      }
                    </td>
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
                        const notStarted = coupon.startDate && new Date(coupon.startDate) > new Date();
                        if (limitReached) return <span className="badge badge-danger">Limit Reached</span>;
                        if (expired || !coupon.isActive) return <span className="badge badge-danger">Expired</span>;
                        if (notStarted) return <span className="badge badge-warning">Scheduled</span>;
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: '1px solid var(--border-color)', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} ({coupons.length} coupons)
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
            <label>Start Date & Time</label>
            <input
              type="datetime-local"
              required
              className="form-control"
              value={startDate}
              min={getCurrentDateTimeString()}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Expiry Date & Time</label>
            <input
              type="datetime-local"
              required
              className="form-control"
              value={expiryDate}
              min={startDate || getCurrentDateTimeString()}
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

          <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ justifyContent: 'center' }}>
            {formLoading ? 'Creating...' : 'Create Promo Code'}
          </button>
        </form>
      </div>

    </div>
  );
};

export default Coupons;
