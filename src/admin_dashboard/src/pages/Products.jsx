import React, { useState, useEffect } from 'react';
import { Search, Plus, FileSpreadsheet, Download, Edit2, Trash2, X, PlusCircle, MinusCircle } from 'lucide-react';

const Products = ({ token }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals/Pages state
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null); // null means adding new

  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    salePrice: '',
    inventory: '',
    category: '',
    isActive: true,
    images: '', // Comma separated URLs
    mainImage: '',
    wearableMedia: [], // Array of {url, mediaType}
    attributes: [], // Array of {key, value}
    variants: [] // Array of variants
  });
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrVal, setNewAttrVal] = useState('');
  const [newVariant, setNewVariant] = useState({
    karat: '18Kt Gold',
    metalColor: 'White Gold',
    metalType: 'Gold',
    grossWeight: '',
    netWeight: '',
    size: '',
    price: '',
    salePrice: '',
    inventory: ''
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = `/api/products?page=${page}&limit=10&search=${searchTerm}&category=${selectedCategory}&sort=${sortOption}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
        setTotalPages(data.data.pagination.pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Instant live search — fires immediately on every keystroke
  // Blank / whitespace-only input is ignored

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCategory, sortOption]);

  useEffect(() => {
    // Don't search if input is only whitespace
    if (searchTerm !== '' && searchTerm.trim() === '') return;

    setPage(1);
    fetchProducts();
  }, [searchTerm]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this product from the catalog?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchProducts();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setCurrentProduct(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      price: '',
      salePrice: '',
      inventory: '',
      category: categories[0]?._id || '',
      isActive: true,
      images: '',
      mainImage: '',
      wearableMedia: [],
      attributes: [],
      variants: []
    });
    setIsEditing(true);
  };

  const openEditModal = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      salePrice: product.salePrice || '',
      inventory: product.inventory,
      category: product.category?._id || '',
      isActive: product.isActive,
      images: product.images ? product.images.join(', ') : '',
      mainImage: product.mainImage || '',
      wearableMedia: product.wearableMedia || [],
      attributes: product.attributes || [],
      variants: product.variants || []
    });
    setIsEditing(true);
  };

  const handleAddAttribute = () => {
    if (!newAttrKey || !newAttrVal) {
      alert('Please fill out both Key and Value to add an attribute!');
      return;
    }
    setFormData({
      ...formData,
      attributes: [...formData.attributes, { key: newAttrKey, value: newAttrVal }]
    });
    setNewAttrKey('');
    setNewAttrVal('');
  };

  const handleRemoveAttribute = (idx) => {
    const updated = formData.attributes.filter((_, i) => i !== idx);
    setFormData({ ...formData, attributes: updated });
  };

  const handleAddVariant = () => {
    if (!newVariant.size || !newVariant.price || !newVariant.inventory) {
      alert('Please fill out Size, Price, and Stock level to add a variant!');
      return;
    }
    const sizes = newVariant.size.split(',').map(s => s.trim()).filter(Boolean);
    if (sizes.length === 0) {
      alert('Please enter a valid size or comma-separated sizes.');
      return;
    }
    const newVariantsList = sizes.map(sizeVal => ({
      karat: newVariant.karat,
      metalColor: newVariant.metalColor,
      metalType: newVariant.metalType || 'Gold',
      grossWeight: newVariant.grossWeight || '',
      netWeight: newVariant.netWeight || '',
      size: sizeVal,
      price: Number(newVariant.price),
      salePrice: newVariant.salePrice ? Number(newVariant.salePrice) : 0,
      inventory: Number(newVariant.inventory)
    }));
    setFormData({
      ...formData,
      variants: [
        ...(formData.variants || []),
        ...newVariantsList
      ]
    });
    setNewVariant({
      ...newVariant,
      size: '',
      price: '',
      salePrice: '',
      inventory: '',
      grossWeight: '',
      netWeight: ''
    });
  };

  const [mainImageUploading, setMainImageUploading] = useState(false);
  const [wearableMediaUploading, setWearableMediaUploading] = useState(false);

  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMainImageUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await fetch('/api/products/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });
      const data = await res.json();
      if (data.success && data.files && data.files.length > 0) {
        setFormData(prev => ({
          ...prev,
          mainImage: data.files[0].url
        }));
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file');
    } finally {
      setMainImageUploading(false);
    }
  };

  const handleWearableMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setWearableMediaUploading(true);

    try {
      const uploadPromises = files.map(file => {
        const uploadData = new FormData();
        uploadData.append('file', file);
        return fetch('/api/products/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: uploadData
        }).then(res => res.json());
      });

      const results = await Promise.all(uploadPromises);
      const newMedia = [];
      results.forEach(data => {
        if (data.success && data.files) {
          data.files.forEach(f => {
            newMedia.push({
              url: f.url,
              mediaType: f.mediaType
            });
          });
        }
      });

      setFormData(prev => ({
        ...prev,
        wearableMedia: [...(prev.wearableMedia || []), ...newMedia]
      }));
    } catch (err) {
      console.error(err);
      alert('Error uploading files');
    } finally {
      setWearableMediaUploading(false);
    }
  };

  const handleRemoveWearableMedia = (idx) => {
    setFormData(prev => ({
      ...prev,
      wearableMedia: (prev.wearableMedia || []).filter((_, i) => i !== idx)
    }));
  };

  const handleRemoveVariant = (idx) => {
    const updated = (formData.variants || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, variants: updated });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = currentProduct ? `/api/products/${currentProduct._id}` : '/api/products';
      const method = currentProduct ? 'PUT' : 'POST';

      let imagesList = formData.images ? formData.images.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (formData.mainImage && !imagesList.includes(formData.mainImage)) {
        imagesList.unshift(formData.mainImage);
      }

      const payload = {
        ...formData,
        price: Number(formData.price),
        salePrice: formData.salePrice ? Number(formData.salePrice) : 0,
        inventory: Number(formData.inventory),
        images: imagesList
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setIsEditing(false);
        fetchProducts();
        alert(currentProduct ? 'Product updated successfully' : 'Product created successfully');
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error saving product');
    }
  };

  const handleBulkExport = () => {
    // Generate JSON download
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `products_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    setImportStatus('Processing bulk import...');
    try {
      const parsed = JSON.parse(importJson);
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ products: parsed })
      });
      const data = await res.json();
      if (data.success) {
        setImportStatus(data.message);
        setImportJson('');
        fetchProducts();
      } else {
        setImportStatus(`Import Error: ${data.message}`);
      }
    } catch (err) {
      setImportStatus(`Parsing error: Invalid JSON structure. Must be a valid JSON array.`);
    }
  };

  if (isEditing) {
    return (
      <div className="card animate-fadeIn">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: '700' }}>
              {currentProduct ? 'Edit Product Profile' : 'Add New Product'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              {currentProduct ? `Updating product details for "${formData.name}"` : 'Create a new entry in your jewelry catalog'}
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
            ← Back to Products List
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label>Product Title Name</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Enter product title"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>SKU Identification Code</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. VAR-SHRT-XL"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Stock quantity</label>
                <input
                  type="number"
                  required
                  className="form-control"
                  placeholder="e.g. 50"
                  value={formData.inventory}
                  onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Product Description</label>
              <textarea
                required
                rows={3}
                className="form-control"
                placeholder="Provide details about features, specifications..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Base Price (₹)</label>
                <input
                  type="number"
                  required
                  className="form-control"
                  placeholder="999"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Sale Price (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="899 (Optional)"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category Assignment</label>
                <select
                  className="form-control"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Listing Status</label>
                <select
                  className="form-control"
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                >
                  <option value="true">Active Listing</option>
                  <option value="false">Hidden / Inactive</option>
                </select>
              </div>
            </div>

            {/* Main Product Image Upload Section */}
            <div className="form-group" style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.01)' }}>
              <label style={{ fontWeight: 'bold' }}>Main Product Image</label>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 10px 0' }}>
                This is the close-up product image displayed as the primary thumbnail.
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageUpload}
                  style={{ display: 'none' }}
                  id="main-image-upload-input"
                />
                <label
                  htmlFor="main-image-upload-input"
                  className="btn btn-secondary"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <PlusCircle size={16} />
                  {mainImageUploading ? 'Uploading...' : 'Choose Main Image'}
                </label>

                {formData.mainImage && (
                  <div style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <img
                      src={formData.mainImage}
                      alt="Main Product Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, mainImage: '' })}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(220, 38, 38, 0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Wearable Media / Secondary Images & Videos Upload Section */}
            <div className="form-group" style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.01)' }}>
              <label style={{ fontWeight: 'bold' }}>Wearable & Detail Media (Images & Videos)</label>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 10px 0' }}>
                Upload images or videos showing someone wearing the product, or other details.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleWearableMediaUpload}
                    style={{ display: 'none' }}
                    id="wearable-media-upload-input"
                  />
                  <label
                    htmlFor="wearable-media-upload-input"
                    className="btn btn-secondary"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <PlusCircle size={16} />
                    {wearableMediaUploading ? 'Uploading...' : 'Choose Images/Videos'}
                  </label>
                </div>

                {formData.wearableMedia && formData.wearableMedia.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {formData.wearableMedia.map((media, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000' }}>
                        {media.mediaType === 'video' ? (
                          <video
                            src={media.url}
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <img
                            src={media.url}
                            alt={`Preview ${idx}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                        
                        <div style={{ position: 'absolute', bottom: '2px', left: '4px', fontSize: '9px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '1px 4px', borderRadius: '4px' }}>
                          {media.mediaType}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveWearableMedia(idx)}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(220, 38, 38, 0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Fallback Media Image URLs (comma separated)</label>
              <input
                type="text"
                className="form-control"
                placeholder="https://image1.jpg, https://image2.jpg"
                value={formData.images}
                onChange={(e) => setFormData({ ...formData, images: e.target.value })}
              />
            </div>

            {/* Attributes Section */}
            <div className="form-group">
              <label>Dynamic Product Attributes</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Key (e.g. Size)"
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Value (e.g. XXL)"
                  value={newAttrVal}
                  onChange={(e) => setNewAttrVal(e.target.value)}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddAttribute} style={{ padding: '12px' }}>
                  <PlusCircle size={18} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {formData.attributes.map((attr, idx) => (
                  <span key={idx} className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px' }}>
                    {attr.key}: {attr.value}
                    <MinusCircle size={12} style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={() => handleRemoveAttribute(idx)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Variants Section */}
            <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <label style={{ fontWeight: 'bold' }}>Product Variant Options & Custom Pricing</label>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
                Configure specific metal color, karat purity, size, and individual price adjustments.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Karat</label>
                  <select
                    className="form-control"
                    value={newVariant.karat}
                    onChange={(e) => setNewVariant({ ...newVariant, karat: e.target.value })}
                  >
                    <option value="18Kt Gold">18Kt Gold</option>
                    <option value="22Kt Gold">22Kt Gold</option>
                    <option value="24Kt Gold">24Kt Gold</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Metal Color</label>
                  <select
                    className="form-control"
                    value={newVariant.metalColor}
                    onChange={(e) => setNewVariant({ ...newVariant, metalColor: e.target.value })}
                  >
                    <option value="White Gold">White Gold</option>
                    <option value="Yellow Gold">Yellow Gold</option>
                    <option value="Rose Gold">Rose Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Metal Type</label>
                  <select
                    className="form-control"
                    value={newVariant.metalType}
                    onChange={(e) => setNewVariant({ ...newVariant, metalType: e.target.value })}
                  >
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Gross Weight</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 24.50 grams"
                    value={newVariant.grossWeight}
                    onChange={(e) => setNewVariant({ ...newVariant, grossWeight: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Net Weight</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 21.00 grams"
                    value={newVariant.netWeight}
                    onChange={(e) => setNewVariant({ ...newVariant, netWeight: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Size (e.g. 12, 14)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Size"
                    value={newVariant.size}
                    onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Price (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Price"
                    value={newVariant.price}
                    onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Sale Price</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Sale"
                    value={newVariant.salePrice}
                    onChange={(e) => setNewVariant({ ...newVariant, salePrice: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Stock Level</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Stock"
                    value={newVariant.inventory}
                    onChange={(e) => setNewVariant({ ...newVariant, inventory: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddVariant}
                style={{ marginBottom: '12px', fontSize: '12px', padding: '6px 12px' }}
              >
                Add Variant Combos
              </button>

              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <table className="custom-table" style={{ fontSize: '11px', margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Karat</th>
                      <th>Color</th>
                      <th>Metal Type</th>
                      <th>Gross Wt</th>
                      <th>Net Wt</th>
                      <th>Size</th>
                      <th>Price</th>
                      <th>Sale Price</th>
                      <th>Stock</th>
                      <th style={{ textAlign: 'right' }}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.variants && formData.variants.length > 0 ? (
                      formData.variants.map((v, idx) => (
                        <tr key={idx}>
                          <td>{v.karat}</td>
                          <td>{v.metalColor}</td>
                          <td>{v.metalType || 'Gold'}</td>
                          <td>{v.grossWeight || '-'}</td>
                          <td>{v.netWeight || '-'}</td>
                          <td>{v.size}</td>
                          <td style={{ fontWeight: '500' }}>₹{v.price.toLocaleString('en-IN')}</td>
                          <td style={{ fontWeight: '500' }}>{v.salePrice > 0 ? `₹${v.salePrice.toLocaleString('en-IN')}` : '-'}</td>
                          <td>{v.inventory} units</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-danger"
                              style={{ padding: '3px' }}
                              onClick={() => handleRemoveVariant(idx)}
                            >
                              <MinusCircle size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                          No variants configured. Product will sell at base price.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px', paddingBefore: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{currentProduct ? 'Save Adjustments' : 'Add to Catalog'}</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filters Toolbar */}
      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search by product name, SKU or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-wrapper">
          <select
            className="form-control"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          <select
            className="form-control"
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
          >
            <option value="newest">Sort: Newest</option>
            <option value="price_asc">Sort: Price Low to High</option>
            <option value="price_desc">Sort: Price High to Low</option>
          </select>

          <button className="btn btn-secondary" onClick={handleBulkExport} title="Export Catalog to JSON">
            <Download size={16} /> Export
          </button>
          
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)} title="Bulk Import via JSON">
            <FileSpreadsheet size={16} /> Import
          </button>

          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="card" style={{ padding: '0px' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name / SKU</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Sale Price</th>
                <th>Stock Level</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading products list...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No products matching filter criteria found.
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p._id}>
                    <td>
                      <img
                        src={p.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'}
                        alt={p.name}
                        style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>{p.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {p.sku}</span>
                      </div>
                    </td>
                    <td><span className="badge text-black bg-gray-300">{p.category?.name || 'Unassigned'}</span></td>
                    <td style={{ fontWeight: '500' }}>₹{p.price.toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: '500', color: p.salePrice > 0 ? '#10b981' : 'var(--text-dark)' }}>
                      {p.salePrice > 0 ? `₹${p.salePrice.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td>
                      <span className={`badge badge-${p.inventory <= 10 ? 'danger' : 'success'}`} style={{ fontWeight: 'bold' }}>
                        {p.inventory} units
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${p.isActive ? 'success' : 'danger'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => openEditModal(p)} style={{ padding: '6px' }} title="Edit Product">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-secondary btn-danger" onClick={() => handleDelete(p._id)} style={{ padding: '6px' }} title="Delete Product">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)} style={{ padding: '6px 12px' }}>Prev</button>
            <span style={{ alignSelf: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary" disabled={page === totalPages} onClick={() => setPage(page + 1)} style={{ padding: '6px 12px' }}>Next</button>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Bulk Import Products via JSON</h2>
              <button className="modal-close" onClick={() => { setShowImportModal(false); setImportStatus(''); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleBulkImport}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Products JSON Array</label>
                  <textarea
                    rows={8}
                    required
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                    placeholder={`[\n  {\n    "name": "Cool Sunglasses",\n    "sku": "ACC-SUN-01",\n    "price": 1499,\n    "inventory": 80,\n    "categoryName": "Electronics"\n  }\n]`}
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                  />
                </div>
                {importStatus && (
                  <div style={{ fontSize: '13px', color: 'var(--secondary)', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                    {importStatus}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowImportModal(false); setImportStatus(''); }}>Close</button>
                <button type="submit" className="btn btn-primary">Process Import</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
