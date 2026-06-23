import React, { useEffect, useState } from 'react';
import { PackagePlus, RefreshCw, AlertCircle, FileSpreadsheet } from 'lucide-react';

const Inventory = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Adjustment Form States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [changeAmount, setChangeAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('stock_in');
  const [notes, setNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch Products
      const productsRes = await fetch('/api/products?limit=100', { headers });
      const productsData = await productsRes.json();

      // 2. Fetch Logs
      const logsRes = await fetch('/api/inventory/logs', { headers });
      const logsData = await logsRes.json();

      if (productsData.success) setProducts(productsData.data.products);
      if (logsData.success) setLogs(logsData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !changeAmount) return;

    setFormLoading(true);
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: selectedProductId,
          change: Number(changeAmount),
          type: adjustmentType,
          notes
        })
      });
      const data = await res.json();

      if (data.success) {
        alert('Stock level adjusted successfully!');
        setChangeAmount('');
        setNotes('');
        fetchInventoryData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error updating stock level');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top panel: split editor and stock index */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Current Stock Index */}
        <div className="card" style={{ padding: '0px' }}>
          <div style={{ padding: '24px 24px 12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>Catalog Stock Index</h3>
            <button className="btn btn-secondary" onClick={fetchInventoryData} style={{ padding: '6px 12px', fontSize: '12px' }}>
              <RefreshCw size={12} /> Reload
            </button>
          </div>
          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Product Title</th>
                  <th>SKU Code</th>
                  <th>Sale Value</th>
                  <th>Stock Count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Loading stock index...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No items found.
                    </td>
                  </tr>
                ) : (
                  products.map(p => (
                    <tr key={p._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedProductId(p._id)}>
                      <td style={{ fontWeight: '500' }}>{p.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{p.sku}</td>
                      <td>₹{p.price.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge badge-${p.inventory <= 10 ? 'danger' : 'success'}`} style={{ fontWeight: 'bold' }}>
                          {p.inventory} left
                        </span>
                      </td>
                      <td>
                        {p.inventory <= 10 ? (
                          <span style={{ color: 'var(--danger)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                            <AlertCircle size={12} /> Critical Stock
                          </span>
                        ) : (
                          <span style={{ color: 'var(--success)', fontSize: '11px', fontWeight: '500' }}>Healthy Stock</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick adjust Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackagePlus size={18} style={{ color: 'var(--primary)' }} /> Adjust Stock Level
          </h3>
          <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Select Product</label>
              <select
                required
                className="form-control"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">-- Choose Catalog Item --</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Adjust Quantity (+/-)</label>
              <input
                type="number"
                required
                className="form-control"
                placeholder="e.g. 50 to restock, -10 to writeoff"
                value={changeAmount}
                onChange={(e) => setChangeAmount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Adjustment Type</label>
              <select
                className="form-control"
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
              >
                <option value="stock_in">Restock (+ Stock In)</option>
                <option value="adjustment">Inventory Correction (Audit)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Audit Memo Notes</label>
              <textarea
                rows={2}
                className="form-control"
                placeholder="Reason for stock correction..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={formLoading || !selectedProductId || !changeAmount} style={{ justifyContent: 'center' }}>
              {formLoading ? 'Executing...' : 'Post Adjustment'}
            </button>
          </form>
        </div>

      </div>

      {/* Bottom panel: Audit log registry */}
      <div className="card" style={{ padding: '0px' }}>
        <div style={{ padding: '24px 24px 12px 24px' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <FileSpreadsheet size={18} style={{ color: 'var(--secondary)' }} /> Stock Ledger Audit Logs
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Historical records detailing every stock addition, purchase order, and adjustment event.</p>
        </div>

        <div className="table-container">
          <table className="custom-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Item Details</th>
                <th>SKU Code</th>
                <th>Stock Delta</th>
                <th>Action Type</th>
                <th>Audit Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading audit trail ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td style={{ fontWeight: '500' }}>{log.product?.name || 'Deleted Product'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{log.product?.sku || 'N/A'}</td>
                    <td style={{ fontWeight: 'bold', color: log.change > 0 ? '#10b981' : '#f87171' }}>
                      {log.change > 0 ? `+${log.change}` : log.change}
                    </td>
                    <td>
                      <span className={`badge badge-${
                        log.type === 'stock_in' ? 'success' :
                        log.type === 'sale' ? 'info' :
                        log.type === 'return' ? 'warning' : 'secondary'
                      }`}>
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{log.notes || '-'}</td>
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

export default Inventory;
