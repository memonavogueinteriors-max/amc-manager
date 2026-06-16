import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';

const API = 'https://amc-manager-production.up.railway.app/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('amc_token') };
}

const CHECKLISTS = {
  Silver: {
    'AC Services': ['AC Indoor Unit Full Service', 'AC Outdoor Unit Full Service', 'Filter Clean & Replace', 'Condenser Coil Clean', 'Drain Line Flush & Clear', 'AC Thermostat & Controls Check', 'Refrigerant Level Check', 'Chemical Coil Deep Clean (1x/year)'],
    'Duct': ['Duct Chemical Cleaning (1x/year)'],
    'Plumbing': ['Basic Plumbing Health Check', 'Drain Assessment'],
    'General': ['Service Completion Report', '24-Hr Workmanship Guarantee Check']
  },
  Gold: {
    'AC Services': ['AC Indoor Unit Full Service', 'AC Outdoor Unit Full Service', 'Filter Clean & Replace', 'Condenser Coil Clean', 'Drain Line Flush & Clear', 'AC Thermostat & Controls Check', 'Refrigerant Level Check', 'Chemical Coil Deep Clean (1x/year)'],
    'Duct': ['Duct Chemical Cleaning (1x/year)', 'RoboTech Duct Video Inspection (1x partial)'],
    'Plumbing': ['Full Plumbing Health Check', 'Pipe & Joint Inspection', 'Water Pressure Check', 'Drain Assessment'],
    'Electrical': ['Full Electrical Health Check', 'Distribution Board Inspection', 'Socket & Switch Check'],
    'General': ['Service Completion Report', 'Priority Scheduling Confirmed', '24-Hr Workmanship Guarantee Check']
  },
  Platinum: {
    'AC Services': ['AC Indoor Unit Full Service', 'AC Outdoor Unit Full Service', 'Filter Clean & Replace', 'Condenser Coil Clean', 'Drain Line Flush & Clear', 'AC Thermostat & Controls Check', 'Refrigerant Level Check', 'Chemical Coil Deep Clean (1x/year)'],
    'Duct': ['Full Duct Chemical Cleaning', 'RoboTech Full Duct Video Inspection (all zones)', 'RoboTech Full Duct Clean'],
    'Plumbing': ['Full Plumbing Health Check', 'Pipe & Joint Inspection', 'Water Pressure Check', 'Drain Assessment'],
    'Electrical': ['Full Electrical Health Check', 'Distribution Board Inspection', 'Socket & Switch Check'],
    'General': ['Service Completion Report', 'VIP Scheduling Confirmed', 'Dedicated Account Manager Review', 'Annual Asset Health Report', '24-Hr Workmanship Guarantee Check']
  }
};

const VISITS = [
  { key: 'visit1', label: 'Visit 1 — Pre-Summer', month: 'April' },
  { key: 'visit2', label: 'Visit 2 — Mid-Summer', month: 'July' },
  { key: 'visit3', label: 'Visit 3 — Post-Summer', month: 'October' }
];

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [reports, setReports] = useState([]);
  const [modal, setModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [form, setForm] = useState({ visit_date: '', technician: '', manager: '', notes: '', checklist: {} });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const c = await fetch(`${API}/contracts/${id}`, { headers: authHeaders() }).then(r => r.json());
      setContract(c);
      const r = await fetch(`${API}/service-reports?contract_id=${id}`, { headers: authHeaders() }).then(r => r.json());
      setReports(Array.isArray(r) ? r : []);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { load(); }, [id]);

  const getTier = (pkg) => {
    if (!pkg) return 'Silver';
    if (pkg.includes('Platinum')) return 'Platinum';
    if (pkg.includes('Gold')) return 'Gold';
    return 'Silver';
  };

  const initChecklist = (tier) => {
    const template = CHECKLISTS[tier] || CHECKLISTS.Silver;
    const checklist = {};
    Object.values(template).flat().forEach(item => { checklist[item] = false; });
    return checklist;
  };

  const openVisit = (visit) => {
    const existing = reports.find(r => r.visit_type === visit.label);
    setSelectedVisit(visit);
    if (existing) {
      setSelectedReport(existing);
      setForm({ visit_date: existing.visit_date || '', technician: existing.technician || '', manager: existing.manager || '', notes: existing.notes || '', checklist: existing.checklist || {} });
    } else {
      setSelectedReport(null);
      const tier = getTier(contract?.package);
      setForm({ visit_date: '', technician: '', manager: '', notes: '', checklist: initChecklist(tier) });
    }
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { contract_id: parseInt(id), villa_id: contract.villa_id, visit_date: form.visit_date, visit_type: selectedVisit.label, technician: form.technician, manager: form.manager, checklist: form.checklist, notes: form.notes };
      if (selectedReport) {
        await fetch(`${API}/service-reports/${selectedReport.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ checklist: form.checklist, notes: form.notes, manager_approved: selectedReport.manager_approved, client_signature: selectedReport.client_signature }) });
      } else {
        await fetch(`${API}/service-reports`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
      }
      await load();
      setModal(false);
    } catch(e) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const gold = [186, 148, 62];
    const white = [255, 255, 255];
    const dark = [30, 30, 30];
    const gray = [120, 120, 120];

    doc.setFillColor(...gold); doc.rect(0, 0, 210, 42, 'F');
    try { doc.addImage('/logo.png', 'PNG', 10, 4, 35, 35); } catch(e) {}
    doc.setTextColor(...white); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('VOGUE AIR CARE', 55, 16);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Service Completion Report', 55, 24);
    doc.text('+971 50 127 5342 | Dubai Villa Specialist', 55, 31);
    doc.text(new Date().toLocaleDateString(), 160, 24);

    doc.setFillColor(250, 248, 240); doc.rect(0, 42, 210, 255, 'F');
    doc.setTextColor(...dark); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('SERVICE DETAILS', 20, 58);
    doc.setDrawColor(...gold); doc.setLineWidth(0.5); doc.line(20, 61, 190, 61);

    const details = [
      ['Contract', contract?.contract_number], ['File #', contract?.file_number || '—'],
      ['Villa', `${contract?.villa_number}, Block ${contract?.block}`],
      ['Client', contract?.client_name], ['Package', contract?.package],
      ['Visit', selectedVisit?.label], ['Date', form.visit_date],
      ['Technician', form.technician], ['Manager', form.manager || '—']
    ];

    let y = 70;
    doc.setFontSize(10);
    details.forEach(([label, value], i) => {
      if (i % 2 === 0) { doc.setFillColor(245, 240, 225); doc.rect(20, y - 5, 170, 9, 'F'); }
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...gray);
      doc.text(label + ':', 23, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...dark);
      doc.text(String(value || '—'), 75, y);
      y += 10;
    });

    y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(186, 148, 62);
    doc.text('SERVICES CHECKLIST', 20, y);
    doc.setDrawColor(...gold); doc.line(20, y + 3, 190, y + 3); y += 12;

    const tier = getTier(contract?.package);
    const template = CHECKLISTS[tier] || CHECKLISTS.Silver;

    Object.entries(template).forEach(([category, items]) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.setTextColor(...gray); doc.text(category.toUpperCase(), 22, y); y += 7;
      items.forEach(item => {
        const done = form.checklist[item];
        doc.setTextColor(done ? 59 : 180, done ? 109 : 180, done ? 17 : 180);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        doc.text(done ? '✓' : '○', 22, y);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
        doc.setTextColor(...dark);
        doc.text(item, 30, y);
        y += 8;
        if (y > 265) { doc.addPage(); y = 20; }
      });
      y += 3;
    });

    if (form.notes) {
      y += 3;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...gray);
      doc.text('Notes:', 20, y); y += 7;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...dark);
      doc.text(form.notes, 20, y, { maxWidth: 170 }); y += 15;
    }

    y += 5;
    doc.setDrawColor(...gold); doc.setLineWidth(0.5);
    doc.line(20, y, 85, y); doc.line(115, y, 190, y); y += 7;
    doc.setFontSize(9); doc.setTextColor(...gray);
    doc.text('Client Signature & Date', 52, y, { align: 'center' });
    doc.text('Manager / Supervisor', 152, y, { align: 'center' });

    doc.setFillColor(...gold); doc.rect(0, 282, 210, 15, 'F');
    doc.setTextColor(...white); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('VOGUE AIR CARE · +971 50 127 5342 · 24-Hr Workmanship Guarantee · All prices excl. 5% VAT', 105, 291, { align: 'center' });

    doc.save(`VAC-Report-${contract?.contract_number}-${selectedVisit?.month}.pdf`);
  };

  if (!contract) return <div className="loading">Loading contract...</div>;

  const tier = getTier(contract.package);
  const tierColor = { Silver: '#B4B2A9', Gold: '#EF9F27', Platinum: '#185FA5' };
  const tierBg = { Silver: '#F1EFE8', Gold: '#FAEEDA', Platinum: '#E6F1FB' };
  const start = new Date(contract.start_date);
  const end = new Date(contract.end_date);
  const now = new Date();
  const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  const pctColor = pct < 30 ? '#3B6D11' : pct < 70 ? '#BA7517' : pct < 90 ? '#E07B2A' : '#A32D2D';

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">
          <button className="btn btn-sm" onClick={() => navigate('/contracts')} style={{ marginRight: 12 }}>← Back</button>
          {contract.contract_number}
        </div>
        <div className="topbar-right">
          <span style={{ background: tierBg[tier], color: tierColor[tier], padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{contract.package}</span>
        </div>
      </div>
      <div className="content">
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-label">Client</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{contract.client_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{contract.client_phone}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Villa</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{contract.villa_number}, Block {contract.block}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{contract.property_type}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Annual Value</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>AED {(contract.annual_value || contract.monthly_value * 12)?.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>AED {contract.monthly_value?.toLocaleString()}/mo</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Contract Period</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{contract.start_date} → {contract.end_date}</div>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: pctColor, marginBottom: 3 }}>{pct}% complete</div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pctColor, borderRadius: 10 }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header"><div className="card-title">Annual Visit Schedule — {contract.package}</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, padding: '1rem 0' }}>
            {VISITS.map(visit => {
              const report = reports.find(r => r.visit_type === visit.label);
              const done = report !== undefined;
              const approved = report?.manager_approved;
              return (
                <div key={visit.key} onClick={() => openVisit(visit)}
                  style={{ border: `2px solid ${done ? (approved ? '#3B6D11' : '#BA7517') : 'var(--border)'}`, borderRadius: 12, padding: '1.25rem', cursor: 'pointer', background: done ? (approved ? '#EAF3DE' : '#FAEEDA') : '#fff', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{visit.label}</div>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: done ? (approved ? '#3B6D11' : '#BA7517') : '#E5E5E0', color: done ? '#fff' : '#888', fontWeight: 500 }}>
                      {done ? (approved ? '✓ Approved' : 'In Progress') : 'Pending'}
                    </span>
                  </div>
                  <div style={{ fontSize: 22 }}>📅</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>{visit.month}</div>
                  {report && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{report.visit_date} · {report.technician}</div>}
                  <div style={{ marginTop: 10, fontSize: 12, color: done ? '#BA7517' : '#185FA5', fontWeight: 500 }}>
                    {done ? 'Click to view/edit report →' : 'Click to start report →'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Package Services — {contract.package}</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, padding: '0.5rem 0' }}>
            {Object.entries(CHECKLISTS[tier] || CHECKLISTS.Silver).map(([category, items]) => (
              <div key={category}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>{category}</div>
                {items.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                    <span style={{ color: tierColor[tier], fontWeight: 600 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal && selectedVisit && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title">{selectedVisit.label} — Service Report</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" style={{ background: '#EAF3DE', color: '#3B6D11' }} onClick={generatePDF}>📄 Generate PDF</button>
                <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Visit Date</label>
                <input className="form-input" type="date" value={form.visit_date} onChange={e => setForm({...form, visit_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Technician</label>
                <input className="form-input" value={form.technician} onChange={e => setForm({...form, technician: e.target.value})} placeholder="Technician name" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Manager / Supervisor</label>
              <input className="form-input" value={form.manager} onChange={e => setForm({...form, manager: e.target.value})} placeholder="Manager name" />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Services Checklist — {contract.package}</div>
              {Object.entries(CHECKLISTS[tier] || CHECKLISTS.Silver).map(([category, items]) => (
                <div key={category} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>{category}</div>
                  {items.map(item => (
                    <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', cursor: 'pointer', borderRadius: 6, background: form.checklist[item] ? '#EAF3DE' : 'transparent', marginBottom: 2, fontSize: 13 }}>
                      <input type="checkbox" checked={form.checklist[item] || false}
                        onChange={e => setForm({...form, checklist: {...form.checklist, [item]: e.target.checked}})}
                        style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      <span style={{ color: form.checklist[item] ? '#3B6D11' : 'var(--text-primary)', fontWeight: form.checklist[item] ? 500 : 400 }}>
                        {item}
                      </span>
                      {form.checklist[item] && <span style={{ marginLeft: 'auto', color: '#3B6D11', fontSize: 12 }}>✓</span>}
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ padding: '10px 0', borderTop: '0.5px solid var(--border)', marginBottom: 10, display: 'flex', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedReport?.manager_approved || false}
                  onChange={async e => {
                    if (selectedReport) {
                      await fetch(`${API}/service-reports/${selectedReport.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ checklist: form.checklist, notes: form.notes, manager_approved: e.target.checked, client_signature: selectedReport.client_signature }) });
                      await load();
                    }
                  }} />
                <span style={{ fontWeight: 500 }}>Manager Approved</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedReport?.client_signature || false}
                  onChange={async e => {
                    if (selectedReport) {
                      await fetch(`${API}/service-reports/${selectedReport.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ checklist: form.checklist, notes: form.notes, manager_approved: selectedReport.manager_approved, client_signature: e.target.checked }) });
                      await load();
                    }
                  }} />
                <span style={{ fontWeight: 500 }}>Client Signed</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any additional notes..." />
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Close</button>
              <button className="btn btn-sm" style={{ background: '#EAF3DE', color: '#3B6D11' }} onClick={generatePDF}>📄 Generate PDF</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : selectedReport ? 'Update Report' : 'Save Report'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}