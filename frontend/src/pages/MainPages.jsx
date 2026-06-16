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

  useEffect(() => {
    apiFetch('/dashboard').then(setStats).catch(console.error);
    apiFetch('/packages/expenses').then(setExpenses).catch(console.error);
    if ('Notification' in window) Notification.requestPermission();
    let lastCount = 0;
    const checkNewTickets = async () => {
      try {
        const data = await apiFetch('/packages/tickets-submitted');
        const newCount = data.filter(t => t.status === 'submitted').length;
        if (newCount > lastCount && lastCount !== 0 && Notification.permission === 'granted') {
          new Notification('New Client Ticket!', { body: 'A client has raised a new service ticket.', icon: '/logo.png' });
        }
        lastCount = newCount;
      } catch(e) {}
    };
    checkNewTickets();
    const interval = setInterval(checkNewTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div className="loading">Loading dashboard...</div>;

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalRevenue = stats.monthlyRevenue * 12;
  const profit = totalRevenue - totalExpenses;

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
            <div className="metric-sub">{profit >= 0 ? '✅ Profit' : '❌ Loss'}</div>
          </div>
        </div>
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card" style={{ background: '#F1EFE8' }}>
            <div className="metric-label" style={{ color: '#5F5E5A' }}>Silver Packages</div>
            <div className="metric-val" style={{ color: '#444441' }}>{stats.contracts > 0 ? Math.round(stats.activeContracts * 0.4) : 0}</div>
          </div>
          <div className="metric-card" style={{ background: '#FAEEDA' }}>
            <div className="metric-label" style={{ color: '#854F0B' }}>Gold Packages</div>
            <div className="metric-val" style={{ color: '#633806' }}>{stats.contracts > 0 ? Math.round(stats.activeContracts * 0.4) : 0}</div>
          </div>
          <div className="metric-card" style={{ background: '#E6F1FB' }}>
            <div className="metric-label" style={{ color: '#185FA5' }}>Platinum Packages</div>
            <div className="metric-val" style={{ color: '#0C447C' }}>{stats.contracts > 0 ? Math.round(stats.activeContracts * 0.2) : 0}</div>
          </div>
        </div>
        <div className="row2">
          <div className="card">
            <div className="card-header"><div className="card-title">Open Tickets</div></div>
            <div style={{ fontSize: 36, fontWeight: 600, color: stats.urgentTickets > 0 ? 'var(--red)' : 'var(--green)' }}>{stats.openTickets}</div>
            {stats.urgentTickets > 0 && <div className="badge badge-danger" style={{ marginTop: 8 }}>🔴 {stats.urgentTickets} urgent</div>}
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
  const [salesUsers, setSalesUsers] = useState([]);
  const emptyForm = { villa_id: '', client_id: '', package: 'Silver - 3 AC', monthly_value: 425, start_date: '', end_date: '', property_type: 'Villa', sales_person_id: '', commission_amount: 0, notes: '' };
  const [form, setForm] = useState(emptyForm);

  const pkgPrices = {
    'Silver - 3 AC': 425, 'Gold - 3 AC': 546, 'Platinum - 3 AC': 712,
    'Silver - 4 AC': 479, 'Gold - 4 AC': 617, 'Platinum - 4 AC': 812,
    'Silver - 6 AC': 588, 'Gold - 6 AC': 758, 'Platinum - 6 AC': 1017
  };
  const pkgAnnual = {
    'Silver - 3 AC': 5100, 'Gold - 3 AC': 6550, 'Platinum - 3 AC': 8550,
    'Silver - 4 AC': 5750, 'Gold - 4 AC': 7400, 'Platinum - 4 AC': 9750,
    'Silver - 6 AC': 7050, 'Gold - 6 AC': 9100, 'Platinum - 6 AC': 12200
  };

  const load = () => {
    const params = filter !== 'all' ? `?status=${filter}` : '';
    apiFetch('/contracts' + params).then(r => { setContracts(r); setLoading(false); }).catch(console.error);
  };

  useEffect(() => {
    load();
    apiFetch('/villas').then(setVillas).catch(console.error);
    apiFetch('/clients').then(setClients).catch(console.error);
    fetch(`${API}/users`, { headers: authHeaders() }).then(r => r.json()).then(u => setSalesUsers(u.filter(x => x.role === 'sales' || x.role === 'manager'))).catch(console.error);
  }, [filter]);

  const openEdit = (c) => {
    setEditItem(c);
    setForm({ villa_id: c.villa_id, client_id: c.client_id, package: c.package, monthly_value: c.monthly_value, start_date: c.start_date, end_date: c.end_date, property_type: c.property_type || 'Villa', sales_person_id: c.sales_person_id || '', commission_amount: c.commission_amount || 0, notes: c.notes || '' });
    setModal(true);
  };

  const save = async () => {
    try {
      const body = { villa_id: parseInt(form.villa_id), client_id: parseInt(form.client_id), package: form.package, monthly_value: parseFloat(form.monthly_value), start_date: form.start_date, end_date: form.end_date, property_type: form.property_type || 'Villa', sales_person_id: form.sales_person_id ? parseInt(form.sales_person_id) : null, commission_amount: parseFloat(form.commission_amount || 0), notes: form.notes || '' };
      await fetch(`${API}/contracts/${editItem.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({...body, status: editItem.status}) });
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
    doc.setFillColor(...gold); doc.rect(0, 0, 210, 50, 'F');
    try { doc.addImage('/logo.png', 'PNG', 10, 5, 40, 40); } catch(e) {}
    doc.setTextColor(...white); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('VOGUE AIR CARE', 60, 22);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('AC · Duct Cleaning · Electrical · Plumbing · Dubai Villa Specialist', 60, 30);
    doc.text('+971 50 127 5342', 60, 38);
    doc.setFillColor(250, 248, 240); doc.rect(0, 50, 210, 297, 'F');
    doc.setTextColor(...darkGold); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('ANNUAL MAINTENANCE CONTRACT', 105, 68, { align: 'center' });
    doc.setDrawColor(...gold); doc.setLineWidth(0.8); doc.line(20, 72, 190, 72);
    const pkg = c.package || 'Silver - 3 AC';
    const tier = pkg.split(' - ')[0];
    const pkgColors = { Silver: [150,150,150], Gold: [186,148,62], Platinum: [100,149,237] };
    const pkgColor = pkgColors[tier] || gold;
    doc.setFillColor(...pkgColor); doc.roundedRect(65, 76, 80, 12, 3, 3, 'F');
    doc.setTextColor(...white); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`${pkg.toUpperCase()} PACKAGE`, 105, 84, { align: 'center' });
    doc.setTextColor(...dark); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('CONTRACT DETAILS', 20, 102);
    doc.setDrawColor(...gold); doc.setLineWidth(0.3); doc.line(20, 105, 190, 105);
    const details = [
      ['Contract Number', c.contract_number], ['File Number', c.file_number || '—'],
      ['Property Type', c.property_type || 'Villa'], ['Villa', `${c.villa_number}, Block ${c.block}`],
      ['Client Name', c.client_name], ['Package', c.package],
      ['Annual Value', `AED ${(c.annual_value || c.monthly_value * 12)?.toLocaleString()}`],
      ['Monthly Value', `AED ${c.monthly_value?.toLocaleString()}`],
      ['Start Date', c.start_date], ['End Date', c.end_date], ['Status', c.status?.toUpperCase()],
    ];
    let y = 115;
    details.forEach(([label, value], i) => {
      if (i % 2 === 0) { doc.setFillColor(245, 240, 225); doc.rect(20, y - 5, 170, 10, 'F'); }
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...gray); doc.setFontSize(10);
      doc.text(label + ':', 25, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...dark);
      doc.text(String(value || '—'), 90, y);
      y += 12;
    });
    y += 5;
    doc.setTextColor(...darkGold); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('SERVICES INCLUDED', 20, y);
    doc.setDrawColor(...gold); doc.line(20, y + 3, 190, y + 3); y += 12;
    const services = {
      Silver: ['3 AC Service Visits/Year (April, July, October)', '1 Emergency AC, Plumbing & Electrical Call-out/year', '4-hour Emergency Response Time', 'Chemical Coil Deep Clean (1x/year)', 'Duct Chemical Cleaning included', 'Basic Plumbing Health Check', 'Service Completion Report every visit', '24-Hr Workmanship Guarantee'],
      Gold: ['3 AC Service Visits/Year (April, July, October)', '2 Emergency AC, Plumbing & Electrical Call-outs/year', '3-hour Emergency Response Time', 'Chemical Coil Deep Clean (1x/year)', 'RoboTech Duct Inspection (partial)', 'Full Plumbing & Electrical Health Check', 'Priority Scheduling', '10% Parts Discount', '24-Hr Workmanship Guarantee'],
      Platinum: ['3 AC Service Visits/Year (April, July, October)', '3 Emergency AC, Plumbing & Electrical Call-outs/year', '2-hour Emergency Response Time', 'RoboTech Full Duct Inspection & Clean', 'Full Plumbing & Electrical Health Check', 'VIP Scheduling — First Slot', 'Dedicated Account Manager', 'Annual Asset Health Report', '15% Parts Discount', '24-Hr Workmanship Guarantee']
    };
    const pkgServices = services[tier] || services.Silver;
    doc.setFontSize(10);
    pkgServices.forEach(s => {
      doc.setTextColor(186, 148, 62); doc.text('✓', 25, y);
      doc.setTextColor(...dark); doc.setFont('helvetica', 'normal'); doc.text(s, 33, y);
      y += 9; if (y > 265) { doc.addPage(); y = 20; }
    });
    y += 10;
    doc.setDrawColor(...gold); doc.setLineWidth(0.5);
    doc.line(20, y, 85, y); doc.line(125, y, 190, y); y += 8;
    doc.setFontSize(9); doc.setTextColor(...gray);
    doc.text('Client Signature & Date', 52, y, { align: 'center' });
    doc.text('Vogue Air Care Representative', 157, y, { align: 'center' });
    doc.setFillColor(...gold); doc.rect(0, 272, 210, 25, 'F');
    doc.setTextColor(...white); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text("VOGUE AIR CARE — Dubai's Villa AC Specialist", 105, 281, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('+971 50 127 5342 | AC · Duct Cleaning · Electrical · Plumbing', 105, 289, { align: 'center' });
    doc.text('All prices excl. 5% VAT. Fixed annual fees. No hidden charges.', 105, 293, { align: 'center' });
    doc.save(`VAC-Contract-${c.contract_number}.pdf`);
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Contracts</div>
      </div>
      <div className="content">
        <div className="filter-row">
          {['all', 'active', 'expiring', 'pending', 'processing', 'ended'].map(f => (
            <span key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </span>
          ))}
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contract #</th><th>File #</th><th>Villa</th><th>Client</th>
                  <th>Property</th><th>Package</th><th>Annual</th><th>Start</th>
                  <th>End</th><th>Next Service</th><th>Progress</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={13} className="loading">Loading...</td></tr> :
                  contracts.length === 0 ? <tr><td colSpan={13} className="empty">No contracts found</td></tr> :
                  contracts.map(c => {
                    const start = new Date(c.start_date);
                    const end = new Date(c.end_date);
                    const now = new Date();
                    const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
                    const pctColor = pct < 30 ? '#3B6D11' : pct < 70 ? '#BA7517' : pct < 90 ? '#E07B2A' : '#A32D2D';
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.contract_number}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.file_number || '—'}</td>
                        <td>{c.villa_number}, Block {c.block}</td>
                        <td>{c.client_name}</td>
                        <td style={{ fontSize: 12 }}>{c.property_type || 'Villa'}</td>
                        <td>
                          <span style={{
                            background: c.package?.includes('Platinum') ? '#E6F1FB' : c.package?.includes('Gold') ? '#FAEEDA' : '#F1EFE8',
                            color: c.package?.includes('Platinum') ? '#185FA5' : c.package?.includes('Gold') ? '#854F0B' : '#5F5E5A',
                            padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500
                          }}>{c.package}</span>
                        </td>
                        <td>AED {(c.annual_value || (c.monthly_value * 12))?.toLocaleString()}/yr</td>
                        <td>{c.start_date}</td>
                        <td>{c.end_date}</td>
                        <td style={{ fontSize: 12, color: '#BA7517' }}>{c.next_service_date || '—'}</td>
                        <td>
                          <div style={{ minWidth: 80 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: pctColor, marginBottom: 3 }}>{pct}%</div>
                            <div style={{ height: 6, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 10 }}></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select value={c.status} onChange={async (e) => {
                            await fetch(`${API}/contracts/${c.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ package: c.package, monthly_value: c.monthly_value, start_date: c.start_date, end_date: c.end_date, status: e.target.value, notes: c.notes || '', property_type: c.property_type || 'Villa' }) });
                            load();
                          }} style={{ padding: '3px 6px', borderRadius: 6, border: '0.5px solid var(--border-md)', background: c.status === 'active' ? '#EAF3DE' : c.status === 'ended' ? '#FCEBEB' : '#FAEEDA', color: c.status === 'active' ? '#3B6D11' : c.status === 'ended' ? '#A32D2D' : '#854F0B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                            <option value="active">Active</option>
                            <option value="processing">Processing</option>
                            <option value="ended">Ended</option>
                            <option value="expiring">Expiring</option>
                            <option value="pending">Pending</option>
                          </select>
                        </td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm" onClick={() => openEdit(c)}>Edit</button>
                          <button className="btn btn-sm" style={{background:'#EAF3DE',color:'#3B6D11'}} onClick={() => generatePDF(c)}>PDF</button>
                          <button className="btn btn-sm btn-danger" onClick={() => del(c.id)}>Delete</button>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && editItem && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ width: 560 }}>
            <div className="modal-header">
              <div className="modal-title">Edit Contract</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Property Type</label>
                <select className="form-input" value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})}>
                  <option>Villa</option><option>Apartment</option><option>Townhouse</option><option>Estate</option><option>Penthouse</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Package</label>
                <select className="form-input" value={form.package} onChange={e => setForm({...form, package: e.target.value, monthly_value: pkgPrices[e.target.value] || 425})}>
                  <optgroup label="3 AC Units">
                    <option value="Silver - 3 AC">Silver - 3 AC</option>
                    <option value="Gold - 3 AC">Gold - 3 AC</option>
                    <option value="Platinum - 3 AC">Platinum - 3 AC</option>
                  </optgroup>
                  <optgroup label="4 AC Units">
                    <option value="Silver - 4 AC">Silver - 4 AC</option>
                    <option value="Gold - 4 AC">Gold - 4 AC</option>
                    <option value="Platinum - 4 AC">Platinum - 4 AC</option>
                  </optgroup>
                  <optgroup label="6 AC Units">
                    <option value="Silver - 6 AC">Silver - 6 AC</option>
                    <option value="Gold - 6 AC">Gold - 6 AC</option>
                    <option value="Platinum - 6 AC">Platinum - 6 AC</option>
                  </optgroup>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Monthly Value (AED)</label>
                <input className="form-input" type="number" value={form.monthly_value} onChange={e => setForm({...form, monthly_value: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Sales Person</label>
                <select className="form-input" value={form.sales_person_id} onChange={e => setForm({...form, sales_person_id: e.target.value})}>
                  <option value="">Select sales person</option>
                  {salesUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
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
              <button className="btn btn-primary" onClick={save}>Update Contract</button>
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
  const [villas, setVillas] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const emptyForm = { name: '', phone: '', email: '', address: '', notes: '', villa_id: '', package: '', start_date: '', property_type: 'Villa', sales_person_id: '', commission_amount: 0 };
  const [form, setForm] = useState(emptyForm);

  const load = () => apiFetch('/clients').then(r => { setClients(r); setLoading(false); }).catch(console.error);

  useEffect(() => {
    load();
    apiFetch('/villas').then(setVillas).catch(console.error);
    fetch(`${API}/users`, { headers: authHeaders() }).then(r => r.json()).then(u => setSalesUsers(u.filter(x => x.role === 'sales' || x.role === 'manager'))).catch(console.error);
  }, []);

  const openNew = () => { setEditItem(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c) => { setEditItem(c); setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '', villa_id: '', package: '', start_date: '', property_type: 'Villa', sales_person_id: '', commission_amount: 0 }); setModal(true); };

  const save = async () => {
    try {
      if (editItem) {
        await fetch(`${API}/clients/${editItem.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ name: form.name, phone: form.phone, email: form.email, address: form.address, notes: form.notes }) });
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
          <div className="modal" style={{ width: 560 }}>
            <div className="modal-header">
              <div className="modal-title">{editItem ? 'Edit Client' : 'Add Client & Generate Contract'}</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            {!editItem && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                📋 Fill villa and package below to auto-generate a contract
              </div>
            )}
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
            {!editItem && (
              <>
                <div style={{ borderTop: '0.5px solid var(--border)', margin: '12px 0', paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>CONTRACT DETAILS (Optional)</div>
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
                    <label className="form-label">Property Type</label>
                    <select className="form-input" value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})}>
                      <option>Villa</option><option>Apartment</option><option>Townhouse</option><option>Estate</option><option>Penthouse</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Package</label>
                    <select className="form-input" value={form.package} onChange={e => setForm({...form, package: e.target.value})}>
                      <option value="">Select package</option>
                      <optgroup label="3 AC Units">
                        <option value="Silver - 3 AC">Silver - 3 AC (AED 5,100/yr)</option>
                        <option value="Gold - 3 AC">Gold - 3 AC (AED 6,550/yr)</option>
                        <option value="Platinum - 3 AC">Platinum - 3 AC (AED 8,550/yr)</option>
                      </optgroup>
                      <optgroup label="4 AC Units">
                        <option value="Silver - 4 AC">Silver - 4 AC (AED 5,750/yr)</option>
                        <option value="Gold - 4 AC">Gold - 4 AC (AED 7,400/yr)</option>
                        <option value="Platinum - 4 AC">Platinum - 4 AC (AED 9,750/yr)</option>
                      </optgroup>
                      <optgroup label="6 AC Units">
                        <option value="Silver - 6 AC">Silver - 6 AC (AED 7,050/yr)</option>
                        <option value="Gold - 6 AC">Gold - 6 AC (AED 9,100/yr)</option>
                        <option value="Platinum - 6 AC">Platinum - 6 AC (AED 12,200/yr)</option>
                      </optgroup>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contract Start Date</label>
                    <input className="form-input" type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Sales Person</label>
                    <select className="form-input" value={form.sales_person_id} onChange={e => setForm({...form, sales_person_id: e.target.value})}>
                      <option value="">Select sales person</option>
                      {salesUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Commission Amount (AED)</label>
                    <input className="form-input" type="number" value={form.commission_amount} onChange={e => setForm({...form, commission_amount: e.target.value})} placeholder="e.g. 500" />
                  </div>
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editItem ? 'Update Client' : 'Save Client & Generate Contract'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}