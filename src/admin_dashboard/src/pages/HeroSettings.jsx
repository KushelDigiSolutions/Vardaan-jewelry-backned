import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck, Image as ImageIcon, RefreshCw } from 'lucide-react';

const HeroSettings = ({ token }) => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form handling (Dual-mode: Create / Edit)
  const [editingSlide, setEditingSlide] = useState(null); // null means create mode
  const [image, setImage] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [title, setTitle] = useState('');
  const [ctaText, setCtaText] = useState('Shop Now');
  const [ctaLink, setCtaLink] = useState('/shop');
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hero-slides');
      const data = await res.json();
      if (data.success) {
        setSlides(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const handleEditClick = (slide) => {
    setEditingSlide(slide);
    setImage(slide.image);
    setSubtitle(slide.subtitle || '');
    setTitle(slide.title || '');
    setCtaText(slide.ctaText || 'Shop Now');
    setCtaLink(slide.ctaLink || '/shop');
    setOrder(slide.order !== undefined ? slide.order : 0);
    setIsActive(slide.isActive);
  };

  const handleResetForm = () => {
    setEditingSlide(null);
    setImage('');
    setSubtitle('');
    setTitle('');
    setCtaText('Shop Now');
    setCtaLink('/shop');
    setOrder(0);
    setIsActive(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file); // Use the generic 'file' field expected by /api/products/upload

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
        setImage(data.files[0].url);
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      alert('Please upload or select an image for the hero banner');
      return;
    }

    try {
      const url = editingSlide ? `/api/hero-slides/${editingSlide._id}` : '/api/hero-slides';
      const method = editingSlide ? 'PUT' : 'POST';

      const payload = {
        image,
        subtitle,
        title,
        ctaText,
        ctaLink,
        order: Number(order),
        isActive
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
        alert(editingSlide ? 'Hero slide updated successfully' : 'Hero slide created successfully');
        handleResetForm();
        fetchSlides();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error saving hero slide');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this hero slide?')) return;
    try {
      const res = await fetch(`/api/hero-slides/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        fetchSlides();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      {/* Slides List Table View */}
      <div className="card" style={{ padding: '0px' }}>
        <div style={{ padding: '24px 24px 12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="chart-title" style={{ marginBottom: 0 }}>Homepage Hero Slides</h3>
          <button className="btn btn-secondary" onClick={fetchSlides} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <RefreshCw size={12} /> Reload
          </button>
        </div>
        
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Banner Preview</th>
                <th>Content & Details</th>
                <th>CTA Details</th>
                <th>Order</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading slides...
                  </td>
                </tr>
              ) : slides.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No hero slides registered.
                  </td>
                </tr>
              ) : (
                slides.map(slide => (
                  <tr key={slide._id}>
                    <td>
                      {slide.image ? (
                        <img
                          src={slide.image}
                          alt={slide.title}
                          style={{ width: '120px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div style={{ width: '120px', height: '60px', borderRadius: '4px', backgroundColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
                          No Img
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                          {slide.subtitle || 'NO SUBTITLE'}
                        </span>
                        <span style={{ fontWeight: '600', fontSize: '14px', whiteSpace: 'pre-line' }}>
                          {slide.title || 'No Title'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>Btn: {slide.ctaText}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Link: {slide.ctaLink}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: '600' }}>{slide.order}</td>
                    <td>
                      <span className={`badge badge-${slide.isActive ? 'success' : 'danger'}`}>
                        {slide.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => handleEditClick(slide)} style={{ padding: '6px' }} title="Edit Slide">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-secondary btn-danger" onClick={() => handleDelete(slide._id)} style={{ padding: '6px' }} title="Delete Slide">
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
      </div>

      {/* Form Area */}
      <div className="card" style={{ height: 'fit-content' }}>
        <h3 className="chart-title">
          {editingSlide ? 'Update Hero Slide' : 'Create Hero Slide'}
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.01)' }}>
            <label style={{ fontWeight: 'bold' }}>Hero Banner Image</label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 10px 0' }}>
              Choose a wide landscape banner image (highly recommended to be optimized for web).
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                id="hero-image-upload-input"
              />
              <label
                htmlFor="hero-image-upload-input"
                className="btn btn-secondary"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}
              >
                <Plus size={16} />
                {imageUploading ? 'Uploading...' : 'Choose Slide Image'}
              </label>

              {image && (
                <div style={{ position: 'relative', width: '100%', height: '110px', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <img
                    src={image}
                    alt="Hero Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(220, 38, 38, 0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Subtitle / Tag (Uppercase)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. NEW LAUNCH"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Hero Title (use \n for newline)</label>
            <textarea
              rows={2}
              className="form-control"
              placeholder="e.g. STYLED BY&#10;NATURE"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Button Text (CTA)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Shop Now"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Button Link Target (CTA Link)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. /shop"
              value={ctaLink}
              onChange={(e) => setCtaLink(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Sort Order</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                className="form-control"
                value={isActive ? 'true' : 'false'}
                onChange={(e) => setIsActive(e.target.value === 'true')}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            {editingSlide && (
              <button type="button" className="btn btn-secondary" onClick={handleResetForm} style={{ flexGrow: 1, justifyContent: 'center' }}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ flexGrow: 2, justifyContent: 'center' }}>
              {editingSlide ? 'Save Changes' : 'Create Slide'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HeroSettings;
