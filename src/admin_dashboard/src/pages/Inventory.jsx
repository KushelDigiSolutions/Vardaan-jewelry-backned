import React, { useEffect, useState } from 'react';
import { PackagePlus, RefreshCw, AlertCircle, FileSpreadsheet, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const STOCK_PAGE_SIZE = 10;
const LOGS_PAGE_SIZE = 15;

const Inventory = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Adjustment Form States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [changeAmount, setChangeAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('stock_in');
  const [notes, setNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Catalog Stock Index search + pagination
  const [stockSearch, setStockSearch] = useState('');
  const [stockPage, setStockPage] = useState(1);

  // Stock Ledger Audit Logs search + pagination
  const [logsSearch, setLogsSearch] = useState('');
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const productsRes = await fetch('/api/products?limit=1000&isActive=all', { headers });
      const productsData = await productsRes.json();
      if (productsData.success) setProducts(productsData.data.products);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async (page = 1, search = '') => {
    setLogsLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const url = `/api/inventory/logs?page=${page}&limit=${LOGS_PAGE_SIZE}&search=${encodeURIComponent(search)}`;
      const logsRes = await fetch(url, { headers });
      const logsData = await logsRes.json();
      if (logsData.success) {
        setLogs(logsData.data);
        setLogsTotalPages(logsData.pagination?.pages || 1);
        setLogsTotal(logsData.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchInventoryData = async () => {
    setLoading(true);
    await Promise.all([fetchProducts(), fetchLogs(1, '')]);
    setLoading(false);
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Re-fetch logs when search or page changes
  useEffect(() => {
    fetchLogs(logsPage, logsSearch);
  }, [logsPage]);

  // Reset to page 1 when search changes
  const handleLogsSearch = (val) => {
    setLogsSearch(val);
    setLogsPage(1);
    fetchLogs(1, val);
  };

  // Client-side filtered + paginated products for Catalog Stock Index
  const filteredProducts = products.filter(p => {
    if (!stockSearch.trim()) return true;
    const term = stockSearch.trim().toLowerCase();
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
  });
  const stockTotalPages = Math.max(1, Math.ceil(filteredProducts.length / STOCK_PAGE_SIZE));
  const pagedProducts = filteredProducts.slice((stockPage - 1) * STOCK_PAGE_SIZE, stockPage * STOCK_PAGE_SIZE);

  // Reset stock page when search changes
  const handleStockSearch = (val) => {
    setStockSearch(val);
    setStockPage(1);
  };

  // Selected product object for size dropdown
  const selectedProduct = products.find(p => p._id === selectedProductId);
  const hasSizes = selectedProduct?.sizes && selectedProduct.sizes.length > 0;

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !changeAmount) return;

    setFormLoading(true);
    try {
      const body = {
        productId: selectedProductId,
        change: Number(changeAmount),
        type: adjustmentType,
        notes
      };
      if (selectedSize) body.size = selectedSize;

      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        alert('Stock level adjusted successfully!');
        setChangeAmount('');
        setNotes('');
        setSelectedSize('');
        await fetchProducts();
        fetchLogs(logsPage, logsSearch);
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
        
        {/* Catalog Stock Index */}
        <div className="card" style={{ padding: '0px' }}>
          <div style={{ padding: '20px 24px 12px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>Catalog Stock Index</h3>
              <button className="btn btn-secondary" onClick={fetchInventoryData} style={{ padding: '6px 12px', fontSize: '12px' }}>
                <RefreshCw size={12} /> Reload
              </button>
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search by product name or SKU..."
                value={stockSearch}
                onChange={e => handleStockSearch(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '12px', marginBottom: '0' }}
              />
            </div>
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
                ) : pagedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      {stockSearch ? 'No products match your search.' : 'No items found.'}
                    </td>
                  </tr>
                ) : (
                  pagedProducts.map(p => (
                    <React.Fragment key={p._id}>
                      <tr style={{ cursor: 'pointer' }} onClick={() => setSelectedProductId(p._id)}>
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
                      {/* Per-size breakdown if sizes exist */}
                      {p.sizes && p.sizes.length > 0 && (
                        <tr style={{ backgroundColor: 'rgba(0,0,0,0.015)' }}>
                          <td colSpan={5} style={{ paddingLeft: '24px', paddingTop: '4px', paddingBottom: '8px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {p.sizes.map((s, idx) => (
                                <span key={idx} style={{ fontSize: '11px', background: 'rgba(7,81,46,0.08)', border: '1px solid rgba(7,81,46,0.15)', borderRadius: '4px', padding: '2px 8px', color: 'var(--text-dark)' }}>
                                  Size {s.size}: <strong style={{ color: s.inventory > 0 ? 'var(--success)' : 'var(--danger)' }}>{s.inventory > 0 ? s.inventory : '∞'}</strong> units
                                  {s.price ? ` @ ₹${s.price}` : ''}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {stockTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: '1px solid var(--border-color)', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Page {stockPage} of {stockTotalPages} ({filteredProducts.length} products)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  disabled={stockPage <= 1}
                  onClick={() => setStockPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  disabled={stockPage >= stockTotalPages}
                  onClick={() => setStockPage(p => Math.min(stockTotalPages, p + 1))}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Adjust Form */}
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
                onChange={(e) => { setSelectedProductId(e.target.value); setSelectedSize(''); }}
              >
                <option value="">-- Choose Catalog Item --</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            {/* Size selector — shown only when product has sizes */}
            {hasSizes && (
              <div className="form-group">
                <label>Size Variant <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '11px' }}>(optional — leave blank for overall stock)</span></label>
                <select
                  className="form-control"
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                >
                  <option value="">-- Overall Product Stock --</option>
                  {selectedProduct.sizes.map((s, idx) => (
                    <option key={idx} value={s.size}>
                      Size {s.size} (current: {s.inventory > 0 ? s.inventory : '∞'} units)
                    </option>
                  ))}
                </select>
              </div>
            )}

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
        <div style={{ padding: '20px 24px 12px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
            <div>
              <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--secondary)' }} /> Stock Ledger Audit Logs
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Historical records detailing every stock addition, purchase order, and adjustment event.</p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
              {logsTotal} total records
            </span>
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by product name, SKU, or notes..."
              value={logsSearch}
              onChange={e => handleLogsSearch(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '12px' }}
            />
          </div>
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
              {logsLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Loading audit trail ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    {logsSearch ? 'No logs match your search.' : 'No audit records logged yet.'}
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

        {/* Logs Pagination */}
        {logsTotalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: '1px solid var(--border-color)', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Page {logsPage} of {logsTotalPages} ({logsTotal} records)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                disabled={logsPage <= 1}
                onClick={() => setLogsPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                disabled={logsPage >= logsTotalPages}
                onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Inventory;
