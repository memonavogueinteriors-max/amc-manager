import { useState, useEffect, useRef } from 'react';

const API = 'https://amc-manager-production.up.railway.app/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('amc_token') };
}

export default function ServiceVisits() {
  const [visits, setVisits] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [villas, setVillas] = useState([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const emptyForm = { contract_id: '', villa_id: '', visit_date: '', service_type: '', technician: '', incharge: '', comments: '', client_satisfaction: 5, report_url: '', report_name: '', status: 'scheduled' };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    fetch(`${API}/packages/visits`, { headers: authHeaders() }).then(r => r.json()).then(setVisits).catch(console.error);
  };

  useEffect(() => {
    load();
    fetch(`${API}/contracts`, { headers: authHeaders() }).then(r => r.json()).then(setContracts).catch(console.error);
    fetch(`${API}/villas`, { headers: authHeaders() }).then(r => r.json()).then(setVillas).catch(console.error);
  }, []);

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
    setForm(f => ({ ...f, report_url: data.url, report_name: data.name }));
  };

  const save = async () => {
    try {
      const body = { ...form, contract_id: form.contract_id ? parseInt(form.contract_id) : null, villa_id: form.villa_id ? parseInt(form.villa_id) : null, client_satisfaction: parseInt(form.client_satisfaction) };
      if (editItem) {
        await fetch(`${API}/packages/visits/${editItem.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
      } else {
        await fetch(`${API}/packages/visits`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
      }
      setModal(false); load();
    } catch(e) { alert('Error: ' + e.message); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this visit?')) return;
    await fetch(`${API}/packages/visits/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Service Visits</div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setForm(emptyForm); setModal(true); }}>+ Add Visit</button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Villa</th><th>Client</th><th>Service</th><th>Technician</th><th>In Charge</th><th>Satisfaction</th><th>Report</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {visits.length === 0 ? <tr><td colSpan={10} className="empty">No visits yet</td></tr> :
                  visits.map(v => (
                    <tr key={v.id}>
                      <td>{v.visit_date}</td>
                      <td>{v.villa_number}, Block {v.block}</td>
                      <td>{v.client_name || '—'}</td>
                      <td>{v.service_type}</td>
                      <td>{v.technician || '—'}</td>
                      <td>{v.incharge || '—'}</td>
                      <td style={{ color: '#BA7517' }}>{stars(v.client_satisfaction || 5)}</td>
                      <td>{v.report_url ? <a href={v.report_url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-text)', fontSize: 12 }}>View</a> : '—'}</td>
                      <td><span className={`pill pill-${v.status === 'completed' ? 'active' : v.status === 'scheduled' ? 'pending' : 'expiring'}`}>{v.status}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => { setEditItem(v); setForm({ contract_id: v.contract_id || '', villa_id: v.villa_id || '', visit_date: v.visit_date, service_type: v.service_type, technician: v.technician || '', incharge: v.incharge || '', comments: v.comments || '', client_satisfaction: v.client_satisfaction || 5, report_url: v.report_url || '', report_name: v.report_name || '', status: v.status }); setModal(true); }}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => del(v.id)}>Delete</button>
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
          <div className="modal" style={{ width: 560 }}>
            <div className="modal-header">
              <div className="modal-title">{editItem ? 'Edit Visit' : 'Add Service Visit'}</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contract</label>
                <select className="form-input" value={form.contract_id} onChange={e => setForm({...form, contract_id: e.target.value})}>
                  <option value="">Select contract</option>
                  {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} — {c.client_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Villa</label>
                <select className="form-input" value={form.villa_id} onChange={e => setForm({...form, villa_id: e.target.value})}>
                  <option value="">Select villa</option>
                  {villas.map(v => <option key={v.id} value={v.id}>{v.villa_number}, Block {v.block}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Visit Date</label>
                <input className="form-input" type="date" value={form.visit_date} onChange={e => setForm({...form, visit_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Service Type</label>
                <select className="form-input" value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})}>
                  <option value="">Select type</option>
                  {['AC Maintenance', 'Duct Cleaning', 'Electrical Check', 'Plumbing Check', 'Emergency Call-out', 'Annual Inspection', 'Full Villa Service'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Technician</label>
                <input className="form-input" value={form.technician} onChange={e => setForm({...form, technician: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">In Charge</label>
                <input className="form-input" value={form.incharge} onChange={e => setForm({...form, incharge: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Comments</label>
              <textarea className="form-input" rows={2} value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Client Satisfaction (1-5)</label>
                <select className="form-input" value={form.client_satisfaction} onChange={e => setForm({...form, client_satisfaction: e.target.value})}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{stars(n)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Upload Report (PDF/Image)</label>
              <input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-sm" onClick={() => fileRef.current.click()}>{uploading ? 'Uploading...' : 'Choose File'}</button>
                {form.report_name && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{form.report_name}</span>}
                {form.report_url && <a href={form.report_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--blue-text)' }}>View</a>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editItem ? 'Update' : 'Save Visit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
