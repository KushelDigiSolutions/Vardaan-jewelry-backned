import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck, FolderMinus, RefreshCw, Search, X } from 'lucide-react';

const Categories = ({ token }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingCategory, setEditingCategory] = useState(null); // null means create mode
  const [name, setName] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [image, setImage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [parentFilter, setParentFilter] = useState('all');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEditClick = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setParentCategory(cat.parentCategory?._id || '');
    setDescription(cat.description || '');
    setIsActive(cat.isActive);
    setImage(cat.image || '');
  };

  const handleResetForm = () => {
    setEditingCategory(null);
    setName('');
    setParentCategory('');
    setDescription('');
    setIsActive(true);
    setImage('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageUploading(true);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const res = await fetch('/api/categories/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });
      const data = await res.json();
      if (data.success && data.url) {
        setImage(data.url);
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
    try {
      const url = editingCategory ? `/api/categories/${editingCategory._id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const payload = {
        name,
        parentCategory: parentCategory || null,
        description,
        isActive,
        image
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
        alert(editingCategory ? 'Category updated successfully' : 'Category created successfully');
        handleResetForm();
        fetchCategories();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error updating category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? (Note: Categories with active subcategories cannot be deleted).')) return;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        fetchCategories();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCategories = categories.filter(c => {
    const term = searchTerm.trim().toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(term);
    const slugMatch = (c.slug || '').toLowerCase().includes(term);
    const matchesSearch = !term || nameMatch || slugMatch;

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && c.isActive) ||
      (statusFilter === 'inactive' && !c.isActive);

    const matchesParent = parentFilter === 'all' ||
      (parentFilter === 'root' && !c.parentCategory) ||
      (parentFilter === 'sub' && c.parentCategory) ||
      (c.parentCategory && c.parentCategory._id === parentFilter);

    return matchesSearch && matchesStatus && matchesParent;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      {/* Categories Table View */}
      <div className="card" style={{ padding: '0px' }}>
        <div style={{ padding: '24px 24px 12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="chart-title" style={{ marginBottom: 0 }}>Category Directory</h3>
          <button className="btn btn-secondary" onClick={fetchCategories} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <RefreshCw size={12} /> Reload
          </button>
        </div>

        {/* Search & Filters Row */}
        <div style={{ padding: '0 24px 16px 24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '2', minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search category by name or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px', paddingRight: '32px', fontSize: '12px', marginBottom: '0' }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                }}
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ flex: '1', minWidth: '130px' }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: '12px', marginBottom: '0', height: '100%' }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div style={{ flex: '1', minWidth: '140px' }}>
            <select
              className="form-control"
              value={parentFilter}
              onChange={(e) => setParentFilter(e.target.value)}
              style={{ fontSize: '12px', marginBottom: '0', height: '100%' }}
            >
              <option value="all">All Levels</option>
              <option value="root">Root Level</option>
              <option value="sub">Sub-categories</option>
            </select>
          </div>
        </div>
        
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Parent Hierarchy</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No categories registered.
                  </td>
                </tr>
              ) : (
                filteredCategories.map(c => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {c.image ? (
                          <img
                            src={c.image}
                            alt={c.name}
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
                            No Img
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600' }}>{c.name}</span>
                          {c.description && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.description}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{c.slug}</td>
                    <td>
                      {c.parentCategory ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <FolderMinus size={11} /> {c.parentCategory.name}
                        </span>
                      ) : (
                        <span className="badge badge-info text-black" style={{ fontSize: '10px' }}>Root Category</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${c.isActive ? 'success' : 'danger'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => handleEditClick(c)} style={{ padding: '6px' }} title="Edit Category">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-secondary btn-danger" onClick={() => handleDelete(c._id)} style={{ padding: '6px' }} title="Delete Category">
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

      {/* Categories Creation Form */}
      <div className="card" style={{ height: 'fit-content' }}>
        <h3 className="chart-title">
          {editingCategory ? 'Update Category' : 'Create Category'}
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Category Label Name</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Smart Electronics"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Parent Category (Hierarchy)</label>
            <select
              className="form-control"
              value={parentCategory}
              onChange={(e) => setParentCategory(e.target.value)}
            >
              <option value="">None (Make it Root)</option>
              {categories
                .filter(c => !editingCategory || c._id !== editingCategory._id) // Prevent self-referencing hierarchy loops
                .map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Category Description</label>
            <textarea
              rows={3}
              className="form-control"
              placeholder="Provide simple definition..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Category Status</label>
            <select
              className="form-control"
              value={isActive ? 'true' : 'false'}
              onChange={(e) => setIsActive(e.target.value === 'true')}
            >
              <option value="true">Active Listing</option>
              <option value="false">Hidden / Inactive</option>
            </select>
          </div>

          <div className="form-group" style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.01)' }}>
            <label style={{ fontWeight: 'bold' }}>Category Image Banner</label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 10px 0' }}>
              Choose a representative photo for this category (highly recommended for homepage display).
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                id="category-image-upload-input"
              />
              <label
                htmlFor="category-image-upload-input"
                className="btn btn-secondary"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {imageUploading ? 'Uploading...' : 'Choose Category Image'}
              </label>

              {image && (
                <div style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <img
                    src={image}
                    alt="Category Preview"
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

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            {editingCategory && (
              <button type="button" className="btn btn-secondary" onClick={handleResetForm} style={{ flexGrow: 1, justifyContent: 'center' }}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ flexGrow: 2, justifyContent: 'center' }}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Categories;
