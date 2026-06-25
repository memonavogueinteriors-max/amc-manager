import { useState, useEffect, useRef } from 'react';

const API = 'https://amc-manager-production.up.railway.app/api';

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('amc_token') };
}

function ClientTicketsList() {
  const [clientTickets, setClientTickets] = useState([]);

  useEffect(() => {
    fetch(`${API}/packages/tickets-submitted`, { headers: authHeaders() })
      .then(r => r.json()).then(setClientTickets).catch(console.error);
  }, []);

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Client</th><th>Phone</th><th>Villa</th><th>Issue</th><th>Photo</th><th>Submitted</th><th>Status</th></tr></thead>
        <tbody>
          {clientTickets.length === 0 ? <tr><td colSpan={7} className="empty">No client tickets yet</td></tr> :
            clientTickets.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500 }}>{t.client_name}</td>
                <td>{t.client_phone || '—'}</td>
                <td>{t.villa_number ? `${t.villa_number}, Block ${t.block}` : '—'}</td>
                <td>{t.description || '—'}</td>
                <td>{t.photo_url ? <a href={t.photo_url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-text)', fontSize: 12 }}>View Photo</a> : '—'}</td>
                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                <td><span className={`pill pill-${t.status === 'submitted' ? 'expiring' : 'active'}`}>{t.status}</span></td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

export function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [villas, setVillas] = useState([]);
  const [linkForm, setLinkForm] = useState({ villa_id: '', client_name: '', client_phone: '' });
  const [generatedLink, setGeneratedLink] = useState('');
  const [form, setForm] = useState({ villa_id: '', title: '', description: '', priority: 'medium' });

  const load = () => {
    const params = filter !== 'all' ? `?status=${filter}` : '';
    fetch(`${API}/tickets` + params, { headers: authHeaders() }).then(r => r.json()).then(setTickets).catch(console.error);
    fetch(`${API}/tickets/stats`, { headers: authHeaders() }).then(r => r.json()).then(setStats).catch(console.error);
  };

  useEffect(() => {
    load();
    fetch(`${API}/villas`, { headers: authHeaders() }).then(r => r.json()).then(setVillas).catch(console.error);
  }, [filter]);

  const generateLink = async () => {
    const res = await fetch(`${API}/packages/ticket-link`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(linkForm)
    });
    const data = await res.json();
    setGeneratedLink(data.link);
  };

  const save = async () => {
    await fetch(`${API}/tickets`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
    setModal(false); load();
  };

  const updateStatus = async (id, status) => {
    const ticket = tickets.find(t => t.id === id);
    await fetch(`${API}/tickets/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ ...ticket, status }) });
    load();
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Service Tickets</div>
        <div className="topbar-right">
          <button className="btn" onClick={() => { setLinkModal(true); setGeneratedLink(''); }}>🔗 Client Link</button>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ New Ticket</button>
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
                      <td><span className={`priority-dot dot-${t.priority}`}></span><span className={`pill pill-${t.priority}`}>{t.priority}</span></td>
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

        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <div className="card-title">Client Submitted Tickets</div>
          </div>
          <ClientTicketsList />
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(generatedLink); alert('Link copied!'); }}>Copy Link</button>
                  <a href={`https://wa.me/?text=Dear Client, please click this link to raise a service ticket: ${encodeURIComponent(generatedLink)}`} target="_blank" rel="noreferrer">
                    <button className="btn" style={{ background: '#25D366', color: '#fff', border: 'none' }}>Send via WhatsApp</button>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Schedule() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [villas, setVillas] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [form, setForm] = useState({ villa_id: '', service_type: '', technician: '', scheduled_date: '', duration_hours: 2, notes: '' });
  const [bookingForm, setBookingForm] = useState({ contract_id: '', villa_id: '', client_name: '', available_dates: ['', '', ''] });

  const load = () => fetch(`${API}/schedule`, { headers: authHeaders() }).then(r => r.json()).then(setItems).catch(console.error);

  useEffect(() => {
    load();
    fetch(`${API}/villas`, { headers: authHeaders() }).then(r => r.json()).then(setVillas).catch(console.error);
    fetch(`${API}/contracts`, { headers: authHeaders() }).then(r => r.json()).then(setContracts).catch(console.error);
  }, []);

  const save = async () => {
    await fetch(`${API}/schedule`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
    setModal(false); load();
  };

  const updateStatus = async (id, status) => {
    const item = items.find(i => i.id === id);
    await fetch(`${API}/schedule/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ ...item, status }) });
    load();
  };

  const googleCalendarLink = (s) => {
    const date = (s.scheduled_date || '').replaceAll('-', '');
    const nextDay = new Date(s.scheduled_date);
    nextDay.setDate(nextDay.getDate() + 1);
    const endDate = nextDay.toISOString().slice(0, 10).replaceAll('-', '');

    const title = encodeURIComponent('VAC - ' + (s.service_type || 'Service Visit'));
    const details = encodeURIComponent(
      'Service Type: ' + (s.service_type || '') +
      '\nTechnician: ' + (s.technician || '') +
      '\nVilla: ' + (s.villa_number || '') + ', Block ' + (s.block || '') +
      '\nNotes: ' + (s.notes || '')
    );

    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + title +
      '&dates=' + date + '/' + endDate +
      '&details=' + details;
  };


  const generateBookingLink = async () => {
    const dates = bookingForm.available_dates.filter(d => d !== '');
    if (dates.length === 0) return alert('Please add at least one date');
    const res = await fetch(`${API}/packages/booking-link`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...bookingForm, available_dates: dates })
    });
    const data = await res.json();
    setGeneratedLink(data.link);
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Service Schedule</div>
        <div className="topbar-right">
          <button className="btn" onClick={() => { setBookingModal(true); setGeneratedLink(''); }}>📅 Send Booking Link</button>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Schedule Service</button>
        </div>
      </div>
      <div className="content">
        <div className="card" style={{ marginBottom: '1rem' }}>
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
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <a
                            className="btn btn-sm"
                            href={googleCalendarLink(s)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                          >
                            Add to Google Calendar
                          </a>
                          {s.status === 'scheduled' && (
                            <button className="btn btn-sm" onClick={() => updateStatus(s.id, 'completed')}>Complete</button>
                          )}
                        </div>
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
                  {['AC Maintenance','Duct Cleaning','Electrical Audit','Annual Inspection','Quarterly Inspection','Painting','Gate Repair','Emergency Call-out'].map(t => <option key={t}>{t}</option>)}
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
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}

      {bookingModal && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setBookingModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Send Booking Link to Client</div>
              <button className="btn btn-sm" onClick={() => { setBookingModal(false); setGeneratedLink(''); }}>✕</button>
            </div>
            {!generatedLink ? (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contract</label>
                    <select className="form-input" value={bookingForm.contract_id} onChange={e => setBookingForm({...bookingForm, contract_id: e.target.value})}>
                      <option value="">Select contract</option>
                      {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} — {c.client_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Villa</label>
                    <select className="form-input" value={bookingForm.villa_id} onChange={e => setBookingForm({...bookingForm, villa_id: e.target.value})}>
                      <option value="">Select villa</option>
                      {villas.map(v => <option key={v.id} value={v.id}>{v.villa_number}, Block {v.block}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Client Name</label>
                  <input className="form-input" value={bookingForm.client_name} onChange={e => setBookingForm({...bookingForm, client_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Available Dates (offer 3 options)</label>
                  {bookingForm.available_dates.map((d, i) => (
                    <input key={i} className="form-input" type="date" value={d} style={{ marginBottom: 6 }}
                      onChange={e => {
                        const dates = [...bookingForm.available_dates];
                        dates[i] = e.target.value;
                        setBookingForm({...bookingForm, available_dates: dates});
                      }} />
                  ))}
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setBookingModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={generateBookingLink}>Generate Link</button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>Share this link with your client — they can select their preferred date:</div>
                <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 8, marginBottom: 12, wordBreak: 'break-all', fontSize: 12, color: 'var(--text-2)' }}>
                  {generatedLink}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(generatedLink); alert('Link copied!'); }}>Copy Link</button>
                  <a href={`https://wa.me/?text=Dear Client, please select your preferred service date by clicking this link: ${encodeURIComponent(generatedLink)}`} target="_blank" rel="noreferrer">
                    <button className="btn" style={{ background: '#25D366', color: '#fff', border: 'none' }}>Send via WhatsApp</button>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Procurement() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tab, setTab] = useState('orders');
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const [form, setForm] = useState({ item_name: '', quantity: '', unit: 'unit', unit_cost: '', supplier: '', expected_date: '', notes: '', invoice_url: '', invoice_name: '', ordered_by: '', serial_number: '', description: '' });

  const load = () => {
    fetch(`${API}/procurement/orders`, { headers: authHeaders() }).then(r => r.json()).then(setOrders).catch(console.error);
    fetch(`${API}/procurement/inventory`, { headers: authHeaders() }).then(r => r.json()).then(setInventory).catch(console.error);
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

  const save = async () => {
    await fetch(`${API}/procurement/orders`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
    setModal(false); load();
  };

  const updateOrderStatus = async (id, status) => {
    await fetch(`${API}/procurement/orders/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) });
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
                <thead><tr><th>#</th><th>Serial No</th><th>Item</th><th>Description</th><th>Qty</th><th>Supplier</th><th>Ordered By</th><th>Total</th><th>Expected</th><th>Invoice</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {orders.length === 0 ? <tr><td colSpan={12} className="empty">No orders yet</td></tr> :
                    orders.map((o, i) => (
                      <tr key={o.id}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{o.serial_number || o.order_number}</td>
                        <td>{o.item_name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 120 }}>{o.description || '—'}</td>
                        <td>{o.quantity} {o.unit}</td>
                        <td>{o.supplier || '—'}</td>
                        <td>{o.ordered_by || '—'}</td>
                        <td>AED {(o.total_cost || 0).toLocaleString()}</td>
                        <td>{o.expected_date || '—'}</td>
                        <td>{o.invoice_url ? <a href={o.invoice_url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-text)', fontSize: 12 }}>View</a> : '—'}</td>
                        <td><span className={`pill pill-${o.status === 'delivered' ? 'active' : o.status === 'in_transit' ? 'pending' : 'expiring'}`}>{o.status?.replace('_',' ')}</span></td>
                        <td>
                          {o.status !== 'delivered' && (
                            <button className="btn btn-sm" onClick={() => updateOrderStatus(o.id, o.status === 'pending' ? 'in_transit' : 'delivered')}>
                              {o.status === 'pending' ? 'Mark Shipped' : 'Mark Delivered'}
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
                      <td>{i.in_stock < i.min_level ? <span className="pill pill-urgent">Low Stock</span> : <span className="pill pill-active">OK</span>}</td>
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
          <div className="modal" style={{ width: 560 }}>
            <div className="modal-header">
              <div className="modal-title">New Purchase Order</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Serial Number</label>
                <input className="form-input" placeholder="e.g. SN-2026-001" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input className="form-input" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Full description of item" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input className="form-input" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Cost (AED)</label>
                <input className="form-input" type="number" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <input className="form-input" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Ordered By</label>
                <input className="form-input" value={form.ordered_by} onChange={e => setForm({...form, ordered_by: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Expected Delivery Date</label>
              <input className="form-input" type="date" value={form.expected_date} onChange={e => setForm({...form, expected_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Upload Invoice/Bill</label>
              <input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                const data = await uploadFile(e.target.files[0]);
                setForm(f => ({ ...f, invoice_url: data.url, invoice_name: data.name }));
              }} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-sm" onClick={() => fileRef.current.click()}>
                  {uploading ? 'Uploading...' : 'Choose File'}
                </button>
                {form.invoice_name && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{form.invoice_name}</span>}
                {form.invoice_url && <a href={form.invoice_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--blue-text)' }}>View</a>}
              </div>
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

export function Reports() {
  const [stats, setStats] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    fetch(`${API}/dashboard`, { headers: authHeaders() }).then(r => r.json()).then(setStats).catch(console.error);
    fetch(`${API}/contracts`, { headers: authHeaders() }).then(r => r.json()).then(setContracts).catch(console.error);
    fetch(`${API}/packages/expenses`, { headers: authHeaders() }).then(r => r.json()).then(setExpenses).catch(console.error);
    fetch(`${API}/packages/visits`, { headers: authHeaders() }).then(r => r.json()).then(setVisits).catch(console.error);
  }, []);

  const totalRevenue = stats ? stats.monthlyRevenue * 12 : 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const profit = totalRevenue - totalExpenses;
  const silverContracts = contracts.filter(c => c.package === 'Silver').length;
  const goldContracts = contracts.filter(c => c.package === 'Gold').length;
  const platinumContracts = contracts.filter(c => c.package === 'Platinum').length;
  const expenseByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || 0);
    return acc;
  }, {});
  const completedVisits = visits.filter(v => v.status === 'completed').length;
  const avgSatisfaction = visits.length > 0
    ? (visits.reduce((sum, v) => sum + (v.client_satisfaction || 5), 0) / visits.length).toFixed(1)
    : '—';

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Reports & Analytics</div>
      </div>
      <div className="content">
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Annual Revenue</div>
            <div className="metric-val">AED {Math.round(totalRevenue).toLocaleString()}</div>
            <div className="metric-sub">From all active contracts</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Expenses</div>
            <div className="metric-val">AED {Math.round(totalExpenses).toLocaleString()}</div>
            <div className="metric-sub">All recorded expenses</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Net Profit</div>
            <div className="metric-val" style={{ color: profit >= 0 ? '#3B6D11' : '#A32D2D' }}>
              AED {Math.round(Math.abs(profit)).toLocaleString()}
            </div>
            <div className="metric-sub">{profit >= 0 ? '✅ Profit' : '❌ Loss'}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg Client Satisfaction</div>
            <div className="metric-val" style={{ color: '#BA7517' }}>{avgSatisfaction} ★</div>
            <div className="metric-sub">From {visits.length} service visits</div>
          </div>
        </div>

        <div className="row2">
          <div className="card">
            <div className="card-header"><div className="card-title">Package Distribution</div></div>
            {[
              { label: 'Silver', count: silverContracts, color: '#B4B2A9' },
              { label: 'Gold', count: goldContracts, color: '#EF9F27' },
              { label: 'Platinum', count: platinumContracts, color: '#185FA5' },
            ].map(p => (
              <div key={p.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, color: p.color }}>{p.label}</span>
                  <span style={{ color: 'var(--text-2)' }}>{p.count} contracts</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${contracts.length > 0 ? (p.count / contracts.length) * 100 : 0}%`, background: p.color }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Expenses by Category</div></div>
            {Object.entries(expenseByCategory).length === 0 ? (
              <div className="empty">No expenses recorded yet</div>
            ) : Object.entries(expenseByCategory).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>{cat}</span>
                  <span style={{ color: 'var(--text-2)' }}>AED {Math.round(amt).toLocaleString()}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0}%`, background: '#A32D2D' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="row2">
          <div className="card">
            <div className="card-header"><div className="card-title">Service Visits Summary</div></div>
            {[
              { label: 'Total Visits', value: visits.length },
              { label: 'Completed', value: completedVisits },
              { label: 'Scheduled', value: visits.filter(v => v.status === 'scheduled').length },
              { label: 'Cancelled', value: visits.filter(v => v.status === 'cancelled').length },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>{s.label}</span>
                <span style={{ fontWeight: 500 }}>{s.value}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Financial Summary</div></div>
            {[
              { label: 'Monthly Revenue', value: `AED ${Math.round(stats?.monthlyRevenue || 0).toLocaleString()}` },
              { label: 'Annual Revenue', value: `AED ${Math.round(totalRevenue).toLocaleString()}` },
              { label: 'Total Expenses', value: `AED ${Math.round(totalExpenses).toLocaleString()}` },
              { label: 'Net Profit', value: `AED ${Math.round(Math.abs(profit)).toLocaleString()}` },
              { label: 'Active Contracts', value: stats?.activeContracts || 0 },
              { label: 'Expiring Contracts', value: stats?.expiringContracts || 0 },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>{s.label}</span>
                <span style={{ fontWeight: 500 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Export Reports</div></div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn">📊 Contract Report</button>
            <button className="btn">💰 Revenue Summary</button>
            <button className="btn">🚚 Procurement Report</button>
            <button className="btn">🎫 Ticket Analytics</button>
          </div>
        </div>
      </div>
    </div>
  );
}