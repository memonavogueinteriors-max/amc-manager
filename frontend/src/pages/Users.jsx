import { useState, useEffect } from 'react';

const API = 'https://amc-manager-production.up.railway.app/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('amc_token')
  };
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const emptyForm = {
    name: '',
    email: '',
    password: '',
    role: 'sales',
    phone: '',
    sales_target: 0,
    active: true
  };

  const [form, setForm] = useState(emptyForm);
  const currentUser = JSON.parse(localStorage.getItem('amc_user') || '{}');

  const load = () => {
    fetch(`${API}/users`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
        else {
          console.error('Users API returned:', data);
          setUsers([]);
        }
      })
      .catch(err => {
        console.error('Users load error:', err);
        setUsers([]);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      let res;

      if (editItem) {
        res = await fetch(`${API}/users/${editItem.id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(form)
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update user');
        }

        if (form.password) {
          res = await fetch(`${API}/users/${editItem.id}/password`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ password: form.password })
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to update password');
          }
        }
      } else {
        res = await fetch(`${API}/users`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(form)
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to add user');
        }
      }

      setModal(false);
      setEditItem(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const toggleStatus = async (u) => {
    const action = u.active ? 'deactivate' : 'activate';

    if (!window.confirm(`Are you sure you want to ${action} ${u.name}?`)) return;

    try {
      const res = await fetch(`${API}/users/${u.id}/status`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ active: !u.active })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Status update failed');

      load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`${API}/users/${u.id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Delete failed');

      load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const canManageDanger = (u) => {
    if (String(u.id) === String(currentUser.id)) return false;
    if (u.role === 'owner' || u.role === 'admin') return false;
    return true;
  };

  const roleColor = {
    owner: '#185FA5',
    admin: '#185FA5',
    manager: '#BA7517',
    sales: '#3B6D11'
  };

  const roleBg = {
    owner: '#E6F1FB',
    admin: '#E6F1FB',
    manager: '#FAEEDA',
    sales: '#EAF3DE'
  };

  if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
    return (
      <div>
        <div className="topbar">
          <div className="topbar-title">User Management</div>
        </div>
        <div className="content">
          <div className="empty">Access restricted to Owner only</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">User Management</div>
        <div className="topbar-right">
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditItem(null);
              setForm(emptyForm);
              setModal(true);
            }}
          >
            + Add User
          </button>
        </div>
      </div>

      <div className="content">
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-label">Total Users</div>
            <div className="metric-val">{users.length}</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Active Users</div>
            <div className="metric-val">{users.filter(u => u.active).length}</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Sales Team</div>
            <div className="metric-val">{users.filter(u => u.role === 'sales').length}</div>
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Sales Target</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty">No users found</td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span
                          style={{
                            background: roleBg[u.role] || '#F1EFE8',
                            color: roleColor[u.role] || '#444',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 500
                          }}
                        >
                          {u.role?.toUpperCase()}
                        </span>
                      </td>
                      <td>{u.phone || '—'}</td>
                      <td>{u.sales_target ? `AED ${parseFloat(u.sales_target).toLocaleString()}` : '—'}</td>
                      <td>
                        <span className={`pill pill-${u.active ? 'active' : 'expired'}`}>
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setEditItem(u);
                            setForm({
                              name: u.name,
                              email: u.email,
                              password: '',
                              role: u.role,
                              phone: u.phone || '',
                              sales_target: u.sales_target || 0,
                              active: u.active
                            });
                            setModal(true);
                          }}
                        >
                          Edit
                        </button>

                        {canManageDanger(u) && (
                          <button
                            className="btn btn-sm"
                            style={{
                              background: u.active ? '#FAEEDA' : '#EAF3DE',
                              color: u.active ? '#854F0B' : '#3B6D11'
                            }}
                            onClick={() => toggleStatus(u)}
                          >
                            {u.active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}

                        {canManageDanger(u) && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => deleteUser(u)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editItem ? 'Edit User' : 'Add User'}</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>×</button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="sales">Sales</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  {editItem ? 'New Password (leave blank to keep)' : 'Password'}
                </label>
                <input
                  className="form-input"
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Sales Target (AED)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.sales_target}
                  onChange={e => setForm({ ...form, sales_target: e.target.value })}
                />
              </div>
            </div>

            {editItem && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={String(form.active)}
                  onChange={e => setForm({ ...form, active: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>
                {editItem ? 'Update' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}