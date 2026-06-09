import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

const API = 'https://amc-manager-production.up.railway.app/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('amc_token')
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, { ...options, headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

export function Dashboard() {
  const [stats, setStats] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    apiFetch('/dashboard').then(setStats).catch(console.error);
    apiFetch('/packages/expenses').then(setExpenses).catch(console.error);
    apiFetch('/packages').then(setPackages).catch(console.error);
  }, []);

  if (!stats) return <div className="loading">Loading dashboard...</div>;

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalRevenue = stats.monthlyRevenue * 12;
  const profit = totalRevenue - totalExpenses;
  const silverCount = packages.filter(p => p.tier === 'Silver').length;
  const goldCount = packages.filter(p => p.tier === 'Gold').length;
  const platinumCount = packages.filter(p => p.tier === 'Platinum').length;

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
            <div className="metric-val">AED {Math.round(stats.monthlyRevenue).toLocaleString()}</div>
            <div className="metric-sub">From active contracts</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Expenses</div>
            <div className="metric-val">AED {Math.round(totalExpenses).toLocaleString()}</div>
            <div className="metric-sub">All recorded expenses</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Estimated Profit</div>
            <div className="metric-val" style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
              AED {Math.round(Math.abs(profit)).toLocaleString()}
            </div>
            <div className="metric-sub">{profit >= 0 ? '✅ Profit' : '❌ Loss'} (annual vs expenses)</div>
          </div>
        </div>

        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card" style={{ background: '#F1EFE8' }}>
            <div className="metric-label" style={{ color: '#5F5E5A' }}>Silver Packages</div>
            <div className="metric-val" style={{ color: '#444441' }}>{stats.contracts > 0 ? Math.round(stats.activeContracts * 0.4) : 0}</div>
            <div className="metric-sub">Active silver contracts</div>
          </div>
          <div className="metric-card" style={{ background: '#FAEEDA' }}>
            <div className="metric-label" style={{ color: '#854F0B' }}>Gold Packages</div>
            <div className="metric-val" style={{ color: '#633806' }}>{stats.contracts > 0 ? Math.round(stats.activeContracts * 0.4) : 0}</div>
            <div className="metric-sub">Active gold contracts</div>
          </div>
          <div className="metric-card" style={{ background: '#E6F1FB' }}>
            <div className="metric-label" style={{ color: '#185FA5' }}>Platinum Packages</div>
            <div className="metric-val" style={{ color: '#0C447C' }}>{stats.contracts > 0 ? Math.round(stats.activeContracts * 0.2) : 0}</div>
            <div className="metric-sub">Active platinum contracts</div>
          </div>
        </div>

        <div className="row2">
          <div className="card">
            <div className="card-header"><div className="card-title">Open Tickets</div></div>
            <div style={{ fontSize: 36, fontWeight: 600, color: stats.urgentTickets > 0 ? 'var(--red)' : 'var(--green)' }}>{stats.openTickets}</div>
            {stats.urgentTickets > 0 && <div className="badge badge-danger" style={{ marginTop: 8 }}>🔴 {stats.urgentTickets} urgent</div>}
            {stats.lowStock > 0 && <div className="badge badge-warning" style={{ marginTop: 8 }}>⚡ {stats.lowStock} low stock items</div>}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Recent Activity</div></div>
            {(stats.recentActivity || []).slice(0, 5).map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < 4 ? '0.5px solid var(--border)' : 'none' }}>
                <span>{a.type === 'ticket' ? '🎫' : a.type === 'order' ? '📦' : '📄'}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.type} · {new Date(a.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [villas, setVillas] = useState([]);
  const [clients, setClients] = useState([]);
  const emptyForm = { villa_id: '', client_id: '', package: 'Standard', monthly_value: 1200, start_date: '', end_date: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    const params = filter !== 'all' ? `?status=${filter}` : '';
    apiFetch('/contracts' + params).then(r => { setContracts(r); setLoading(false); }).catch(console.error);
  };

  useEffect(() => {
    load();
    apiFetch('/villas').then(setVillas).catch(console.error);
    apiFetch('/clients').then(setClients).catch(console.error);
  }, [filter]);

  const openNew = () => { setEditItem(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c) => {
    setEditItem(c);
    setForm({ villa_id: c.villa_id, client_id: c.client_id, package: c.package, monthly_value: c.monthly_value, start_date: c.start_date, end_date: c.end_date, notes: c.notes || '' });
    setModal(true);
  };

  const save = async () => {
    try {
      const body = {
        villa_id: parseInt(form.villa_id),
        client_id: parseInt(form.client_id),
        package: form.package,
        monthly_value: parseFloat(form.monthly_value),
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes || ''
      };
      if (editItem) {
        await fetch(`${API}/contracts/${editItem.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({...body, status: editItem.status}) });
      } else {
        await fetch(`${API}/contracts`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
      }
      setModal(false); load();
    } catch(e) { alert('Error: ' + e.message); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this contract?')) return;
    await fetch(`${API}/contracts/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

const generatePDF = (c) => {
    const doc = new jsPDF();
    const gold = [186, 148, 62];
    const darkGold = [139, 101, 20];
    const white = [255, 255, 255];
    const dark = [30, 30, 30];
    const gray = [120, 120, 120];

    doc.setFillColor(...gold);
    doc.rect(0, 0, 210, 50, 'F');
    doc.setFillColor(245, 235, 200);
    doc.rect(0, 48, 210, 2, 'F');

    try {
      doc.addImage('/logo.png', 'PNG', 10, 5, 40, 40);
    } catch(e) {}

    doc.setTextColor(...white);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('VOGUE AIR CARE', 60, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('AC · Duct Cleaning · Electrical · Plumbing · Dubai Villa Specialist', 60, 30);
    doc.text('+971 50 127 5342', 60, 38);

    doc.setFillColor(250, 248, 240);
    doc.rect(0, 50, 210, 297, 'F');

    doc.setTextColor(...darkGold);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ANNUAL MAINTENANCE CONTRACT', 105, 68, { align: 'center' });

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.8);
    doc.line(20, 72, 190, 72);

    const pkg = c.package || 'Standard';
    const pkgColors = { Silver: [150,150,150], Gold: [186,148,62], Platinum: [100,149,237] };
    const pkgColor = pkgColors[pkg] || gold;

    doc.setFillColor(...pkgColor);
    doc.roundedRect(75, 76, 60, 12, 3, 3, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${pkg.toUpperCase()} PACKAGE`, 105, 84, { align: 'center' });

    doc.setTextColor(...dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRACT DETAILS', 20, 102);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.3);
    doc.line(20, 105, 190, 105);

    const details = [
      ['Contract Number', c.contract_number],
      ['Villa', `${c.villa_number}, Block ${c.block}`],
      ['Client Name', c.client_name],
      ['Package', c.package],
      ['Monthly Value', `AED ${c.monthly_value?.toLocaleString()}`],
      ['Annual Value', `AED ${Math.round((c.monthly_value || 0) * 12).toLocaleString()}`],
      ['Start Date', c.start_date],
      ['End Date', c.end_date],
      ['Status', c.status?.toUpperCase()],
    ];

    let y = 115;
    details.forEach(([label, value], i) => {
      if (i % 2 === 0) {
        doc.setFillColor(245, 240, 225);
        doc.rect(20, y - 5, 170, 10, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...gray);
      doc.setFontSize(10);
      doc.text(label + ':', 25, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...dark);
      doc.text(String(value || '—'), 90, y);
      y += 12;
    });

    if (c.notes) {
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...gray);
      doc.text('Notes:', 25, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...dark);
      doc.text(c.notes, 25, y, { maxWidth: 160 });
      y += 15;
    }

    y += 15;
    doc.setTextColor(...darkGold);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICES INCLUDED', 20, y);
    doc.setDrawColor(...gold);
    doc.line(20, y + 3, 190, y + 3);
    y += 12;

    const services = {
      Silver: ['3 AC Service Visits/Year', '2 Emergency Call-outs', '48-hour Response Time', 'Filter Clean & Coil Wash', 'Electrical & Plumbing Check (1 visit/year)'],
      Gold: ['3 AC Service Visits/Year', '3 Emergency Call-outs', '24-hour Response Time', 'Chemical Coil Wash + Duct Cleaning', 'Electrical & Plumbing (repairs included)', 'Gas Top-up (1 unit/year)'],
      Platinum: ['3 AC Service Visits/Year', '4 Emergency Call-outs', '4-hour Same-day Response', 'Full Chemical Deep Wash + Full Duct Clean', 'Electrical & Plumbing (2 visits + repairs)', 'Gas Top-up All Units', 'Before & After Photo Report']
    };

    const pkgServices = services[pkg] || services.Silver;
    doc.setFontSize(10);
    pkgServices.forEach(s => {
      doc.setTextColor(...gold);
      doc.text('✓', 25, y);
      doc.setTextColor(...dark);
      doc.setFont('helvetica', 'normal');
      doc.text(s, 33, y);
      y += 9;
    });

    y += 10;
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(20, y, 85, y);
    doc.line(125, y, 190, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text('Client Signature & Date', 52, y, { align: 'center' });
    doc.text('Vogue Air Care Representative', 157, y, { align: 'center' });

    doc.setFillColor(...gold);
    doc.rect(0, 272, 210, 25, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('VOGUE AIR CARE — Dubai\'s Villa AC Specialist', 105, 281, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('+971 50 127 5342 | AC · Duct Cleaning · Electrical · Plumbing', 105, 289, { align: 'center' });
    doc.text('All prices fixed. No hidden charges. 24-hour workmanship guarantee.', 105, 293, { align: 'center' });

    doc.save(`VAC-Contract-${c.contract_number}.pdf`);
  };
 

  const pkgValues = { Standard: 1200, Premium: 1800, Elite: 2400 };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Contracts</div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={openNew}>+ New Contract</button>
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
              <thead><tr><th>Contract #</th><th>Villa</th><th>Client</th><th>Package</th><th>Monthly</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={9} className="loading">Loading...</td></tr> :
                  contracts.length === 0 ? <tr><td colSpan={9} className="empty">No contracts found</td></tr> :
                  contracts.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.contract_number}</td>
                      <td>{c.villa_number}, Block {c.block}</td>
                      <td>{c.client_name}</td>
                      <td><span className={`pill pill-${c.package === 'Elite' ? 'pending' : c.package === 'Premium' ? 'active' : 'resolved'}`}>{c.package}</span></td>
                      <td>AED {c.monthly_value?.toLocaleString()}</td>
                      <td>{c.start_date}</td>
                      <td>{c.end_date}</td>
                      <td><span className={`pill pill-${c.status}`}>{c.status}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => openEdit(c)}>Edit</button>
                        <button className="btn btn-sm" style={{background:'#EAF3DE',color:'#3B6D11'}} onClick={() => generatePDF(c)}>PDF</button>
                        <button className="btn btn-sm btn-danger" onClick={() => del(c.id)}>Delete</button>
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
              <div className="modal-title">{editItem ? 'Edit Contract' : 'New AMC Contract'}</div>
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
                <input className="form-input" type="number" value={form.monthly_value} onChange={e => setForm({...form, monthly_value: e.target.value})} />
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
              <button className="btn btn-primary" onClick={save}>{editItem ? 'Update' : 'Save Contract'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Villas() {
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [clients, setClients] = useState([]);
  const emptyForm = { villa_number: '', block: 'A', client_id: '', bedrooms: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = () => apiFetch('/villas').then(r => { setVillas(r); setLoading(false); }).catch(console.error);
  useEffect(() => { load(); apiFetch('/clients').then(setClients).catch(console.error); }, []);

  const openNew = () => { setEditItem(null); setForm(emptyForm); setModal(true); };
  const openEdit = (v) => { setEditItem(v); setForm({ villa_number: v.villa_number, block: v.block, client_id: v.client_id || '', bedrooms: v.bedrooms || '', notes: v.notes || '' }); setModal(true); };

  const save = async () => {
    try {
      const body = { ...form, client_id: form.client_id ? parseInt(form.client_id) : null, bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null };
      if (editItem) {
        await fetch(`${API}/villas/${editItem.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
      } else {
        await fetch(`${API}/villas`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
      }
      setModal(false); load();
    } catch(e) { alert('Error: ' + e.message); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this villa?')) return;
    await fetch(`${API}/villas/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  const filtered = villas.filter(v =>
    v.villa_number?.toLowerCase().includes(search.toLowerCase()) ||
    v.block?.toLowerCase().includes(search.toLowerCase()) ||
    (v.client_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Villas</div>
        <div className="topbar-right">
          <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={openNew}>+ Add Villa</button>
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
              <thead><tr><th>Villa</th><th>Block</th><th>Client</th><th>Package</th><th>Monthly</th><th>Contract End</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} className="loading">Loading...</td></tr> :
                  filtered.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 500 }}>{v.villa_number}</td>
                      <td>Block {v.block}</td>
                      <td>{v.client_name || '—'}</td>
                      <td>{v.package || '—'}</td>
                      <td>{v.monthly_value ? `AED ${v.monthly_value.toLocaleString()}` : '—'}</td>
                      <td>{v.end_date || '—'}</td>
                      <td>{v.contract_status ? <span className={`pill pill-${v.contract_status}`}>{v.contract_status}</span> : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>No contract</span>}</td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => openEdit(v)}>Edit</button>
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
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editItem ? 'Edit Villa' : 'Add Villa'}</div>
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
              <button className="btn btn-primary" onClick={save}>{editItem ? 'Update' : 'Save Villa'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const emptyForm = { name: '', phone: '', email: '', address: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = () => apiFetch('/clients').then(r => { setClients(r); setLoading(false); }).catch(console.error);
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditItem(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c) => { setEditItem(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }); setModal(true); };

  const save = async () => {
    try {
      if (editItem) {
        await fetch(`${API}/clients/${editItem.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(form) });
      } else {
        await fetch(`${API}/clients`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
      }
      setModal(false); load();
    } catch(e) { alert('Error: ' + e.message); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    await fetch(`${API}/clients/${id}`, { method: 'DELETE', headers: authHeaders() });
    load();
  };

  const initials = name => name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Clients</div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={openNew}>+ Add Client</button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Phone</th><th>Email</th><th>Contracts</th><th>Total/mo</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="loading">Loading...</td></tr> :
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
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => openEdit(c)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => del(c.id)}>Delete</button>
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
              <div className="modal-title">{editItem ? 'Edit Client' : 'Add Client'}</div>
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
              <button className="btn btn-primary" onClick={save}>{editItem ? 'Update' : 'Save Client'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}