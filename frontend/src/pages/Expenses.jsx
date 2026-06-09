import { useState, useEffect, useRef } from 'react';

const API = 'https://amc-manager-production.up.railway.app/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('amc_token') };
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const emptyForm = { category: 'Fuel', description: '', amount: '', date: '', paid_by: '', slip_url: '', slip_name: '', project: '' };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    fetch(`${API}/packages/expenses`, { headers: authHeaders() }).then(r => r.json()).then(setExpenses).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const uploadFile = async (file) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/upload`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('amc_token') }, body: fd });
    const data = await res.json();
    setUploading(false);
    return data;
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = await uploadFile(file);
    setForm(f => ({ ...f, slip_url: data.url, slip_name: data.name }));
  };

  const save = async () => {
    try {
      if (editItem) {
        await fetch(`${API}/packages/expenses/${editItem.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(form) });
      } else {
        await fetch(`${API}/packages/expenses`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
      }
      setModal(false); load();
    } catch(e) { alert('Error: ' + e.message); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await fetch(`${API}/packages/expenses/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const categories = ['Fuel', 'Salary', 'Equipment', 'Parts', 'Vehicle', 'Office', 'Marketing', 'Other'];

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Expenses</div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setForm(emptyForm); setModal(true); }}>+ Add Expense</button>
        </div>
      </div>
      <div className="content">
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-label">Total Expenses</div>
            <div className="metric-val">AED {Math.round(totalExpenses).toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">This Month</div>
            <div className="metric-val">AED {Math.round(expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((s, e) => s + parseFloat(e.amount || 0), 0)).toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Entries</div>
            <div className="metric-val">{expenses.length}</div>
          </div>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Paid By</th><th>Project</th><th>Slip</th><th>Actions</th></tr></thead>
              <tbody>
                {expenses.length === 0 ? <tr><td colSpan={9} className="empty">No expenses yet</td></tr> :
                  expenses.map((e, i) => (
                    <tr key={e.id}>
                      <td>{i + 1}</td>
                      <td>{e.date}</td>
                      <td><span className="pill pill-pending">{e.category}</span></td>
                      <td>{e.description}</td>
                      <td style={{ fontWeight: 500 }}>AED {parseFloat(e.amount).toLocaleString()}</td>
                      <td>{e.paid_by || '—'}</td>
                      <td>{e.project || '—'}</td>
                      <td>{e.slip_url ? <a href={e.slip_url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-text)', fontSize: 12 }}>View</a> : '—'}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => { setEditItem(e); setForm({ category: e.category, description: e.description, amount: e.amount, date: e.date, paid_by: e.paid_by || '', slip_url: e.slip_url || '', slip_name: e.slip_name || '', project: e.project || '' }); setModal(true); }}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => del(e.id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editItem ? 'Edit Expense' : 'Add Expense'}</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (AED)</label>
                <input className="form-input" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Paid By</label>
                <input className="form-input" value={form.paid_by} onChange={e => setForm({...form, paid_by: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Project</label>
              <input className="form-input" placeholder="e.g. Villa 12 service" value={form.project} onChange={e => setForm({...form, project: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Upload Slip/Invoice</label>
              <input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-sm" onClick={() => fileRef.current.click()}>{uploading ? 'Uploading...' : 'Choose File'}</button>
                {form.slip_name && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{form.slip_name}</span>}
                {form.slip_url && <a href={form.slip_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--blue-text)' }}>View</a>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editItem ? 'Update' : 'Save Expense'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}