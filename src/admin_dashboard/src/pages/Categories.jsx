import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck, FolderMinus, RefreshCw } from 'lucide-react';

const Categories = ({ token }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form handling (Dual-mode: Create / Edit)
  const [editingCategory, setEditingCategory] = useState(null); // null means create mode
  const [name, setName] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

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
  };

  const handleResetForm = () => {
    setEditingCategory(null);
    setName('');
    setParentCategory('');
    setDescription('');
    setIsActive(true);
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
                categories.map(c => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600' }}>{c.name}</span>
                        {c.description && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.description}</span>}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{c.slug}</td>
                    <td>
                      {c.parentCategory ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <FolderMinus size={11} /> {c.parentCategory.name}
                        </span>
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '10px' }}>Root Category</span>
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
