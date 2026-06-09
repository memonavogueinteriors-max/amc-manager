import { useState, useEffect } from 'react';
import api from '../api';

// ── TICKETS ───────────────────────────────────────────────
const generateLink = async () => {
    const res = await fetch(`${API}/packages/ticket-link`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(linkForm)
    });
    const data = await res.json();
    setGeneratedLink(data.link);
  };
export function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [villas, setVillas] = useState([]);
  const [form, setForm] = useState({ villa_id: '', title: '', description: '', priority: 'medium' });

  const load = () => {
    const params = filter !== 'all' ? `?status=${filter}` : '';
    api.get('/tickets' + params).then(r => setTickets(r.data));
    api.get('/tickets/stats').then(r => setStats(r.data));
  };
  useEffect(() => { load(); api.get('/villas').then(r => setVillas(r.data)); }, [filter]);

  const save = async () => {
    await api.post('/tickets', form);
    setModal(false); load();
  };

  const updateStatus = async (id, status) => {
    const ticket = tickets.find(t => t.id === id);
    await api.put(`/tickets/${id}`, { ...ticket, status });
    load();
  };

  return (
{linkModal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setLinkModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Generate Client Ticket Link</div>
              <button className="btn btn-sm" onClick={() => { setLinkModal(false); setGeneratedLink(''); }}>✕</button>
            </div>
            {!generatedLink ? (
              <>
                <div className="form-group">
                  <label className="form-label">Villa</label>
                  <select className="form-input" value={linkForm.villa_id} onChange={e => setLinkForm({...linkForm, villa_id: e.target.value})}>
                    <option value="">Select villa</option>
                    {villas.map(v => <option key={v.id} value={v.id}>{v.villa_number}, Block {v.block}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Client Name</label>
                  <input className="form-input" value={linkForm.client_name} onChange={e => setLinkForm({...linkForm, client_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Client Phone</label>
                  <input className="form-input" value={linkForm.client_phone} onChange={e => setLinkForm({...linkForm, client_phone: e.target.value})} />
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setLinkModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={generateLink}>Generate Link</button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 8, marginBottom: 12, wordBreak: 'break-all', fontSize: 12, color: 'var(--text-2)' }}>
                  {generatedLink}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(generatedLink)}>Copy Link</button>
                  <a href={`https://wa.me/?text=Dear Client, please click this link to raise a service ticket: ${encodeURIComponent(generatedLink)}`} target="_blank" rel="noreferrer">
                    <button className="btn" style={{ background: '#25D366', color: '#fff' }}>Send via WhatsApp</button>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    <div>
      <div className="topbar">
        <div className="topbar-title">Service Tickets</div>
        <div className="topbar-right">
         <button className="btn btn-primary" onClick={() => setModal(true)}>+ New Ticket</button>
         <button className="btn" onClick={() => setLinkModal(true)}>🔗 Generate Client Link</button>
        </div>
      </div>
      <div className="content">
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="metric-card"><div className="metric-label">Open Tickets</div><div className="metric-val">{stats.open || 0}</div></div>
          <div className="metric-card"><div className="metric-label">Urgent</div><div className="metric-val">{stats.urgent || 0}</div><div className="badge badge-danger" style={{ marginTop: 6 }}>Needs attention</div></div>
          <div className="metric-card"><div className="metric-label">Resolved This Month</div><div className="metric-val">{stats.resolved || 0}</div></div>
        </div>

        <div className="filter-row">
          {['all', 'open', 'in_progress', 'scheduled', 'resolved'].map(f => (
            <span key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f.replace('_', ' ').charAt(0).toUpperCase() + f.replace('_', ' ').slice(1)}
            </span>
          ))}
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ticket</th><th>Villa</th><th>Issue</th><th>Priority</th><th>Assigned</th><th>Created</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {tickets.length === 0 ? <tr><td colSpan={8} className="empty">No tickets found</td></tr> :
                  tickets.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>#{t.ticket_number}</td>
                      <td>{t.villa_number}, Block {t.block}</td>
                      <td>{t.title}</td>
                      <td>
                        <span className={`priority-dot dot-${t.priority}`}></span>
                        <span className={`pill pill-${t.priority}`}>{t.priority}</span>
                      </td>
                      <td>{t.assigned_name || '—'}</td>
                      <td>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td><span className={`pill pill-${t.status}`}>{t.status.replace('_',' ')}</span></td>
                      <td>
                        {t.status !== 'resolved' && (
                          <button className="btn btn-sm" onClick={() => updateStatus(t.id, t.status === 'open' ? 'in_progress' : 'resolved')}>
                            {t.status === 'open' ? 'Start' : 'Resolve'}
                          </button>
                        )}
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
              <div className="modal-title">New Service Ticket</div>
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
                <label className="form-label">Priority</label>
                <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Issue Title</label>
              <input className="form-input" placeholder="e.g. AC not cooling" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Submit Ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SCHEDULE ──────────────────────────────────────────────
export function Schedule() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
const [linkForm, setLinkForm] = useState({ villa_id: '', client_name: '', client_phone: '' });
const [generatedLink, setGeneratedLink] = useState('');
  const [villas, setVillas] = useState([]);
  const [form, setForm] = useState({ villa_id: '', service_type: '', technician: '', scheduled_date: '', duration_hours: 2, notes: '' });

  const load = () => api.get('/schedule').then(r => setItems(r.data));
  const [villas, setVillas] = useState([]);
useEffect(() => { 
  load(); 
  fetch(`${API}/villas`, { headers: authHeaders() }).then(r => r.json()).then(setVillas).catch(console.error);
}, []);

  const save = async () => { await api.post('/schedule', form); setModal(false); load(); };

  const updateStatus = async (id, status) => {
    const item = items.find(i => i.id === id);
    await api.put(`/schedule/${id}`, { ...item, status });
    load();
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Service Schedule</div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Schedule Service</button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-header"><div className="card-title">Upcoming Services</div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Villa</th><th>Service Type</th><th>Technician</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={7} className="empty">No scheduled services</td></tr> :
                  items.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.scheduled_date}</td>
                      <td>{s.villa_number}, Block {s.block}</td>
                      <td>{s.service_type}</td>
                      <td>{s.technician || '—'}</td>
                      <td>{s.duration_hours}h</td>
                      <td><span className={`pill pill-${s.status === 'scheduled' ? 'pending' : s.status === 'completed' ? 'active' : 'pending'}`}>{s.status}</span></td>
                      <td>
                        {s.status === 'scheduled' && (
                          <button className="btn btn-sm" onClick={() => updateStatus(s.id, 'completed')}>Complete</button>
                        )}
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
              <div className="modal-title">Schedule Service</div>
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
                <label className="form-label">Service Type</label>
                <select className="form-input" value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})}>
                  <option value="">Select type</option>
                  {['AC Maintenance','Plumbing Check','Electrical Audit','Annual Inspection','Quarterly Inspection','Painting','Gate Repair'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Technician</label>
                <input className="form-input" placeholder="Name" value={form.technician} onChange={e => setForm({...form, technician: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Duration (hours)</label>
              <input className="form-input" type="number" step="0.5" value={form.duration_hours} onChange={e => setForm({...form, duration_hours: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PROCUREMENT ───────────────────────────────────────────
export function Procurement() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tab, setTab] = useState('orders');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ item_name: '', quantity: '', unit: 'unit', unit_cost: '', supplier: '', expected_date: '', notes: '' });

  const load = () => {
    api.get('/procurement/orders').then(r => setOrders(r.data));
    api.get('/procurement/inventory').then(r => setInventory(r.data));
  };
  useEffect(() => { load(); }, []);

  const save = async () => { await api.post('/procurement/orders', form); setModal(false); load(); };

  const updateOrderStatus = async (id, status) => {
    await api.put(`/procurement/orders/${id}`, { status });
    load();
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Procurement</div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ New Order</button>
        </div>
      </div>
      <div className="content">
        <div className="filter-row">
          <span className={`chip${tab === 'orders' ? ' active' : ''}`} onClick={() => setTab('orders')}>Purchase Orders ({orders.length})</span>
          <span className={`chip${tab === 'inventory' ? ' active' : ''}`} onClick={() => setTab('inventory')}>Inventory ({inventory.filter(i => i.in_stock < i.min_level).length} low)</span>
        </div>

        {tab === 'orders' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Order #</th><th>Item</th><th>Qty</th><th>Supplier</th><th>Total</th><th>Expected</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 500 }}>{o.order_number}</td>
                      <td>{o.item_name}</td>
                      <td>{o.quantity} {o.unit}</td>
                      <td>{o.supplier || '—'}</td>
                      <td>AED {(o.total_cost || 0).toLocaleString()}</td>
                      <td>{o.expected_date || '—'}</td>
                      <td><span className={`pill pill-${o.status === 'delivered' ? 'active' : o.status === 'in_transit' ? 'pending' : 'expiring'}`}>{o.status.replace('_',' ')}</span></td>
                      <td>
                        {o.status !== 'delivered' && (
                          <button className="btn btn-sm" onClick={() => updateOrderStatus(o.id, o.status === 'pending' ? 'in_transit' : 'delivered')}>
                            {o.status === 'pending' ? 'Mark Shipped' : 'Mark Delivered'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>In Stock</th><th>Min Level</th><th>Unit Cost</th><th>Status</th></tr></thead>
                <tbody>
                  {inventory.map(i => (
                    <tr key={i.id}>
                      <td style={{ fontWeight: 500 }}>{i.item_name}</td>
                      <td>{i.in_stock} {i.unit}</td>
                      <td>{i.min_level} {i.unit}</td>
                      <td>{i.unit_cost ? `AED ${i.unit_cost}` : '—'}</td>
                      <td>
                        {i.in_stock < i.min_level
                          ? <span className="pill pill-urgent">Low Stock</span>
                          : <span className="pill pill-active">OK</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">New Purchase Order</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input className="form-input" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input className="form-input" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <input className="form-input" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Cost (AED)</label>
                <input className="form-input" type="number" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Expected Delivery Date</label>
              <input className="form-input" type="date" value={form.expected_date} onChange={e => setForm({...form, expected_date: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Place Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── REPORTS ───────────────────────────────────────────────
export function Reports() {
  const [stats, setStats] = useState(null);
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    api.get('/dashboard').then(r => setStats(r.data));
    api.get('/contracts').then(r => setContracts(r.data));
  }, []);

  const byPackage = contracts.reduce((acc, c) => {
    acc[c.package] = (acc[c.package] || 0) + c.monthly_value;
    return acc;
  }, {});

  return (
    <div>
      <div className="topbar"><div className="topbar-title">Reports & Analytics</div></div>
      <div className="content">
        {stats && (
          <div className="metrics-grid">
            <div className="metric-card"><div className="metric-label">Monthly Revenue</div><div className="metric-val">AED {Math.round(stats.monthlyRevenue).toLocaleString()}</div></div>
            <div className="metric-card"><div className="metric-label">Total Contracts</div><div className="metric-val">{stats.contracts}</div><div className="metric-sub">{stats.activeContracts} active</div></div>
            <div className="metric-card"><div className="metric-label">Open Tickets</div><div className="metric-val">{stats.openTickets}</div></div>
            <div className="metric-card"><div className="metric-label">Pending Orders</div><div className="metric-val">{stats.pendingOrders}</div></div>
          </div>
        )}

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header"><div className="card-title">Revenue by Package</div></div>
          {Object.entries(byPackage).map(([pkg, val]) => (
            <div key={pkg} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 500 }}>{pkg}</span>
                <span style={{ color: 'var(--text-2)' }}>AED {val.toLocaleString()}/mo</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(100, (val / (stats?.monthlyRevenue || 1)) * 100)}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Contract Status Breakdown</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Active', count: stats?.activeContracts || 0, color: 'var(--green-light)', text: 'var(--green)' },
              { label: 'Expiring', count: stats?.expiringContracts || 0, color: 'var(--amber-light)', text: 'var(--amber)' },
              { label: 'Pending', count: contracts.filter(c => c.status === 'pending').length, color: 'var(--blue-light)', text: 'var(--blue-text)' },
            ].map(s => (
              <div key={s.label} style={{ background: s.color, borderRadius: 'var(--radius)', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 600, color: s.text }}>{s.count}</div>
                <div style={{ fontSize: 12, color: s.text, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
