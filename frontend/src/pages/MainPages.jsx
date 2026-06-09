// ── DASHBOARD ────────────────────────────────────────────
import { useState, useEffect } from 'react';
import api from '../api';

export function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/dashboard').then(r => setStats(r.data)); }, []);

  if (!stats) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Overview Dashboard</div>
        <div className="topbar-right">
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date().toDateString()}</span>
        </div>
      </div>
      <div className="content">
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Active Contracts</div>
            <div className="metric-val">{stats.activeContracts}</div>
            <div className="metric-sub">of {stats.contracts} total</div>
            {stats.expiringContracts > 0 && <div className="badge badge-warning" style={{ marginTop: 6 }}>⚠ {stats.expiringContracts} expiring</div>}
          </div>
          <div className="metric-card">
            <div className="metric-label">Monthly Revenue</div>
            <div className="metric-val">AED {stats.monthlyRevenue.toLocaleString()}</div>
            <div className="metric-sub">Active contracts</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Open Tickets</div>
            <div className="metric-val">{stats.openTickets}</div>
            {stats.urgentTickets > 0 && <div className="badge badge-danger" style={{ marginTop: 6 }}>🔴 {stats.urgentTickets} urgent</div>}
          </div>
          <div className="metric-card">
            <div className="metric-label">Procurement</div>
            <div className="metric-val">{stats.pendingOrders}</div>
            <div className="metric-sub">Pending orders</div>
            {stats.lowStock > 0 && <div className="badge badge-warning" style={{ marginTop: 6 }}>⚡ {stats.lowStock} low stock</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Recent Activity</div></div>
          {stats.recentActivity.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < stats.recentActivity.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 13, color: a.type === 'ticket' ? 'var(--amber)' : a.type === 'order' ? 'var(--blue-text)' : 'var(--green)' }}>
                {a.type === 'ticket' ? '🎫' : a.type === 'order' ? '📦' : '📄'}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.type} · {new Date(a.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CONTRACTS ─────────────────────────────────────────────
export function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [villas, setVillas] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ villa_id: 0, client_id: 0, package: 'Standard', monthly_value: 1200, start_date: '', end_date: '', relationship_manager_id: null, notes: '' });

  const load = () => {
    const params = filter !== 'all' ? `?status=${filter}` : '';
    api.get('/contracts' + params).then(r => { setContracts(r.data); setLoading(false); });
  };

  useEffect(() => {
    load();
    api.get('/villas').then(r => setVillas(r.data));
    api.get('/clients').then(r => setClients(r.data));
  }, [filter]);

const save = async () => {
    try {
      await fetch('https://amc-manager-production.up.railway.app/api/contracts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('amc_token')
        },
        body: JSON.stringify({
          villa_id: parseInt(form.villa_id),
          client_id: parseInt(form.client_id),
          package: form.package,
          monthly_value: parseFloat(form.monthly_value),
          start_date: form.start_date,
          end_date: form.end_date,
          relationship_manager_id: form.relationship_manager_id ? parseInt(form.relationship_manager_id) : null,
          notes: form.notes || ''
        })
      }).then(r => r.json()).then(data => {
        if(data.error) throw new Error(data.error);
        setModal(false); load();
      });
    } catch(e) {
      alert('Error: ' + e.message);
    }
    setForm({ villa_id: '', client_id: '', package: 'Standard', monthly_value: 1200, start_date: '', end_date: '', relationship_manager_id: '', notes: '' });
  };

  const pkgValues = { Standard: 1200, Premium: 1800, Elite: 2400 };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Contracts</div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ New Contract</button>
        </div>
      </div>
      <div className="content">
        <div className="filter-row">
          {['all', 'active', 'expiring', 'pending'].map(f => (
            <span key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </span>
          ))}
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Contract #</th><th>Villa</th><th>Client</th><th>Package</th><th>Monthly</th><th>Start</th><th>End</th><th>RM</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={9} className="loading">Loading...</td></tr> :
                  contracts.length === 0 ? <tr><td colSpan={9} className="empty">No contracts found</td></tr> :
                  contracts.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.contract_number}</td>
                      <td>{c.villa_number}, Block {c.block}</td>
                      <td>{c.client_name}</td>
                      <td><span className={`pill pill-${c.package === 'Elite' ? 'pending' : c.package === 'Premium' ? 'active' : 'resolved'}`}>{c.package}</span></td>
                      <td>AED {c.monthly_value.toLocaleString()}</td>
                      <td>{c.start_date}</td>
                      <td>{c.end_date}</td>
                      <td>{c.rm_name || '—'}</td>
                      <td><span className={`pill pill-${c.status}`}>{c.status}</span></td>
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
              <div className="modal-title">New AMC Contract</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Villa</label>
                <select className="form-input" value={form.villa_id} onChange={e => setForm({...form, villa_id: e.target.value})}>
                  <option value="">Select villa</option>
                  {villas.map(v => <option key={v.id} value={v.id}>{v.villa_number}, Block {v.block}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Client</label>
                <select className="form-input" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
                  <option value="">Select client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Package</label>
                <select className="form-input" value={form.package} onChange={e => setForm({...form, package: e.target.value, monthly_value: pkgValues[e.target.value]})}>
                  <option>Standard</option><option>Premium</option><option>Elite</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Value (AED)</label>
                <input className="form-input" type="number" value={form.monthly_value} onChange={e => setForm({...form, monthly_value: +e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input className="form-input" type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Contract</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VILLAS ────────────────────────────────────────────────
export function Villas() {
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ villa_number: '', block: 'A', client_id: '', bedrooms: '', notes: '' });

  useEffect(() => {
    api.get('/villas').then(r => { setVillas(r.data); setLoading(false); });
    api.get('/clients').then(r => setClients(r.data));
  }, []);

  const save = async () => {
    await api.post('/villas', form);
    setModal(false);
    api.get('/villas').then(r => setVillas(r.data));
  };

  const filtered = villas.filter(v =>
    v.villa_number.toLowerCase().includes(search.toLowerCase()) ||
    v.block.toLowerCase().includes(search.toLowerCase()) ||
    (v.client_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Villas</div>
        <div className="topbar-right">
          <input className="search-input" placeholder="Search villas..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Add Villa</button>
        </div>
      </div>
      <div className="content">
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="metric-card"><div className="metric-label">Total Villas</div><div className="metric-val">{villas.length}</div></div>
          <div className="metric-card"><div className="metric-label">With Active AMC</div><div className="metric-val">{villas.filter(v => v.contract_status === 'active').length}</div></div>
          <div className="metric-card"><div className="metric-label">Expiring Soon</div><div className="metric-val">{villas.filter(v => v.contract_status === 'expiring').length}</div></div>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Villa</th><th>Block</th><th>Client</th><th>Package</th><th>Monthly</th><th>Contract End</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="loading">Loading...</td></tr> :
                  filtered.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 500 }}>{v.villa_number}</td>
                      <td>Block {v.block}</td>
                      <td>{v.client_name || '—'}</td>
                      <td>{v.package || '—'}</td>
                      <td>{v.monthly_value ? `AED ${v.monthly_value.toLocaleString()}` : '—'}</td>
                      <td>{v.end_date || '—'}</td>
                      <td>{v.contract_status ? <span className={`pill pill-${v.contract_status}`}>{v.contract_status}</span> : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>No contract</span>}</td>
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
              <div className="modal-title">Add Villa</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Villa Number</label>
                <input className="form-input" placeholder="e.g. Villa 41" value={form.villa_number} onChange={e => setForm({...form, villa_number: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Block</label>
                <select className="form-input" value={form.block} onChange={e => setForm({...form, block: e.target.value})}>
                  <option>A</option><option>B</option><option>C</option><option>D</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Client</label>
                <select className="form-input" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
                  <option value="">Select client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bedrooms</label>
                <input className="form-input" type="number" value={form.bedrooms} onChange={e => setForm({...form, bedrooms: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Villa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CLIENTS ───────────────────────────────────────────────
export function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });

  const load = () => api.get('/clients').then(r => { setClients(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    await api.post('/clients', form);
    setModal(false); load();
    setForm({ name: '', phone: '', email: '', address: '', notes: '' });
  };

  const initials = name => name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Clients</div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Add Client</button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Phone</th><th>Email</th><th>Contracts</th><th>Total/mo</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="loading">Loading...</td></tr> :
                  clients.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">{initials(c.name)}</div>
                          <span style={{ fontWeight: 500 }}>{c.name}</span>
                        </div>
                      </td>
                      <td>{c.phone || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td>{c.contract_count || 0}</td>
                      <td>{c.total_monthly ? `AED ${Math.round(c.total_monthly).toLocaleString()}` : '—'}</td>
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
              <div className="modal-title">Add Client</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
