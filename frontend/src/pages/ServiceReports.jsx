import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

const API = 'https://amc-manager-production.up.railway.app/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('amc_token') };
}

const CHECKLIST_TEMPLATES = {
  Silver: {
    ac: ['Filter Clean & Replace', 'Condenser Coil Clean', 'Drain Line Flush & Clear', 'AC Thermostat & Controls Check', 'Refrigerant Level Check', 'Chemical Coil Deep Clean (1x/year)', 'Indoor Unit Full Service', 'Outdoor Unit Full Service'],
    plumbing: ['Basic Plumbing Health Check', 'Drain Assessment'],
    electrical: [],
    duct: ['Duct Chemical Cleaning (1x/year)'],
    general: ['Service Completion Report', '24-Hr Workmanship Guarantee Check']
  },
  Gold: {
    ac: ['Filter Clean & Replace', 'Condenser Coil Clean', 'Drain Line Flush & Clear', 'AC Thermostat & Controls Check', 'Refrigerant Level Check', 'Chemical Coil Deep Clean (1x/year)', 'Indoor Unit Full Service', 'Outdoor Unit Full Service'],
    plumbing: ['Full Plumbing Health Check', 'Pipe & Joint Inspection', 'Water Pressure Check', 'Drain Assessment'],
    electrical: ['Full Electrical Health Check', 'Distribution Board Inspection', 'Socket & Switch Check'],
    duct: ['Duct Chemical Cleaning (1x/year)', 'RoboTech Duct Video Inspection (1x partial)'],
    general: ['Service Completion Report', '24-Hr Workmanship Guarantee Check', 'Priority Scheduling Confirmed']
  },
  Platinum: {
    ac: ['Filter Clean & Replace', 'Condenser Coil Clean', 'Drain Line Flush & Clear', 'AC Thermostat & Controls Check', 'Refrigerant Level Check', 'Chemical Coil Deep Clean (1x/year)', 'Indoor Unit Full Service', 'Outdoor Unit Full Service'],
    plumbing: ['Full Plumbing Health Check', 'Pipe & Joint Inspection', 'Water Pressure Check', 'Drain Assessment'],
    electrical: ['Full Electrical Health Check', 'Distribution Board Inspection', 'Socket & Switch Check'],
    duct: ['Full Duct Chemical Cleaning', 'RoboTech Full Duct Video Inspection (all zones)', 'RoboTech Full Duct Clean'],
    general: ['Service Completion Report', '24-Hr Workmanship Guarantee Check', 'VIP Scheduling Confirmed', 'Dedicated Account Manager Review', 'Annual Asset Health Report (if applicable)']
  }
};

export default function ServiceReports() {
  const [reports, setReports] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [villas, setVillas] = useState([]);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [form, setForm] = useState({ contract_id: '', villa_id: '', visit_date: '', visit_type: 'Visit 1 — Pre-Summer (April)', technician: '', manager: '', notes: '', checklist: {} });

  const load = () => {
    fetch(`${API}/service-reports`, { headers: authHeaders() }).then(r => r.json()).then(setReports).catch(console.error);
    fetch(`${API}/contracts`, { headers: authHeaders() }).then(r => r.json()).then(setContracts).catch(console.error);
    fetch(`${API}/villas`, { headers: authHeaders() }).then(r => r.json()).then(setVillas).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const selectedContract = contracts.find(c => c.id === parseInt(form.contract_id));
  const pkg = selectedContract?.package || 'Silver';
  const template = CHECKLIST_TEMPLATES[pkg] || CHECKLIST_TEMPLATES.Silver;

  const initChecklist = (pkg) => {
    const t = CHECKLIST_TEMPLATES[pkg] || CHECKLIST_TEMPLATES.Silver;
    const checklist = {};
    Object.entries(t).forEach(([cat, items]) => {
      items.forEach(item => { checklist[item] = false; });
    });
    return checklist;
  };

  const save = async () => {
    await fetch(`${API}/service-reports`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
    setModal(false); load();
  };

  const updateChecklist = async (reportId, checklist, extra = {}) => {
    await fetch(`${API}/service-reports/${reportId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ checklist, ...extra }) });
    const updated = await fetch(`${API}/service-reports/${reportId}`, { headers: authHeaders() }).then(r => r.json());
    setSelectedReport(updated);
    load();
  };

  const generateReportPDF = (report) => {
  const doc = new jsPDF();
  const gold = [186, 148, 62];
  const darkGold = [139, 101, 20];
  const white = [255, 255, 255];
  const dark = [30, 30, 30];
  const gray = [115, 115, 115];
  const lightBg = [250, 248, 240];
  const line = [220, 205, 170];

  const safe = (v) => String(v || '—');
  const cleanDate = (v) => v ? String(v).split('T')[0] : '—';

  const addFooter = () => {
    doc.setFillColor(...gold);
    doc.rect(0, 282, 210, 15, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'VOGUE AIR CARE · +971 50 127 5342 · Dubai Villa Specialist · 24-Hr Workmanship Guarantee',
      105,
      291,
      { align: 'center' }
    );
  };

  const sectionTitle = (title, y) => {
    doc.setTextColor(...darkGold);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, y);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.4);
    doc.line(20, y + 3, 190, y + 3);
    return y + 12;
  };

  const checkPage = (y, needed = 25) => {
    if (y + needed > 275) {
      addFooter();
      doc.addPage();
      doc.setFillColor(...lightBg);
      doc.rect(0, 0, 210, 297, 'F');
      return 20;
    }
    return y;
  };

  doc.setFillColor(...lightBg);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setFillColor(...gold);
  doc.rect(0, 0, 210, 42, 'F');

  try {
    doc.addImage('/logo.png', 'PNG', 12, 6, 30, 30);
  } catch (e) {}

  doc.setTextColor(...white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('VOGUE AIR CARE', 48, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('AC · Duct Cleaning · Electrical · Plumbing · Dubai Villa Specialist', 48, 24);
  doc.text('+971 50 127 5342', 48, 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SERVICE COMPLETION REPORT', 150, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 29, { align: 'center' });

  let y = 55;

  y = sectionTitle('1. CLIENT & VISIT DETAILS', y);

  const details = [
    ['Client Name', report.client_name],
    ['Villa / Unit', `${safe(report.villa_number)}, Block ${safe(report.block)}`],
    ['Contract Number', report.contract_number],
    ['Package', report.package],
    ['Visit Type', report.visit_type],
    ['Visit Date', cleanDate(report.visit_date)]
  ];

  details.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 240, 225);
      doc.rect(20, y - 5, 170, 9, 'F');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gray);
    doc.text(`${label}:`, 25, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...dark);
    doc.text(safe(value), 78, y);

    y += 10;
  });

  y += 4;
  y = sectionTitle('2. TEAM ON SITE', y);

  const team = [
    ['Technician', report.technician],
    ['Manager / Supervisor', report.manager],
    ['Manager Approved', report.manager_approved ? 'Yes' : 'Pending']
  ];

  team.forEach(([label, value]) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gray);
    doc.text(`${label}:`, 25, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...dark);
    doc.text(safe(value), 78, y);

    y += 10;
  });

  y += 4;
  y = sectionTitle('3. SERVICES COMPLETED', y);

  doc.setFillColor(245, 240, 225);
  doc.rect(20, y - 6, 170, 10, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...dark);
  doc.text('Service Item', 25, y);
  doc.text('Status', 158, y);

  y += 9;

  const checklist = report.checklist || {};
  const entries = Object.entries(checklist);

  if (entries.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.text('No checklist items recorded.', 25, y);
    y += 10;
  } else {
    entries.forEach(([item, done]) => {
      y = checkPage(y, 12);

      doc.setDrawColor(...line);
      doc.line(20, y + 2, 190, y + 2);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...dark);
      doc.text(doc.splitTextToSize(item, 125), 25, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(done ? 45 : 165, done ? 120 : 120, done ? 45 : 120);
      doc.text(done ? 'Done' : 'Pending', 158, y);

      y += 9;
    });
  }

  y += 5;
  y = checkPage(y, 45);
  y = sectionTitle('4. PHOTO DOCUMENTATION', y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...dark);
  doc.text('Before Photos:', 25, y);
  doc.rect(58, y - 5, 55, 18);
  doc.text('After Photos:', 122, y);
  doc.rect(152, y - 5, 38, 18);
  y += 25;

  y = checkPage(y, 35);
  y = sectionTitle('5. PARTS REPLACED & CONSUMABLES USED', y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...dark);
  doc.text('Parts / Consumables:', 25, y);
  doc.line(62, y, 190, y);
  y += 10;
  doc.text('Quantity:', 25, y);
  doc.line(43, y, 95, y);
  doc.text('Approved By:', 105, y);
  doc.line(130, y, 190, y);
  y += 15;

  y = checkPage(y, 45);
  y = sectionTitle('6. FOLLOW-UP WORK & RECOMMENDATIONS', y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...dark);

  const notesText = report.notes
    ? doc.splitTextToSize(String(report.notes), 160)
    : ['No additional notes recorded.'];

  doc.text(notesText, 25, y);
  y += Math.max(18, notesText.length * 6);

  y = checkPage(y, 45);
  y = sectionTitle('7. CLIENT SATISFACTION & SIGNATURES', y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...dark);
  doc.text('Client Satisfaction:', 25, y);
  doc.rect(62, y - 5, 8, 8);
  doc.text('Satisfied', 73, y);
  doc.rect(100, y - 5, 8, 8);
  doc.text('Needs Follow-up', 111, y);
  y += 25;

  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(20, y, 85, y);
  doc.line(125, y, 190, y);

  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text('Client Signature & Date', 52, y, { align: 'center' });
  doc.text('Manager / Supervisor Signature', 157, y, { align: 'center' });

  addFooter();

  doc.save(`VAC-Service-Report-${safe(report.contract_number)}-${cleanDate(report.visit_date)}.pdf`);
};

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Service Reports</div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => { setForm({ contract_id: '', villa_id: '', visit_date: '', visit_type: 'Visit 1 — Pre-Summer (April)', technician: '', manager: '', notes: '', checklist: {} }); setModal(true); }}>+ New Report</button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Villa</th><th>Client</th><th>Package</th><th>Visit Type</th><th>Technician</th><th>Approved</th><th>Actions</th></tr></thead>
              <tbody>
                {reports.length === 0 ? <tr><td colSpan={8} className="empty">No reports yet</td></tr> :
                  reports.map(r => (
                    <tr key={r.id}>
                      <td>{r.visit_date}</td>
                      <td>{r.villa_number}, Block {r.block}</td>
                      <td>{r.client_name}</td>
                      <td><span className={`pill pill-${r.package === 'Platinum' ? 'pending' : r.package === 'Gold' ? 'expiring' : 'resolved'}`}>{r.package}</span></td>
                      <td style={{ fontSize: 12 }}>{r.visit_type}</td>
                      <td>{r.technician}</td>
                      <td><span className={`pill pill-${r.manager_approved ? 'active' : 'expiring'}`}>{r.manager_approved ? 'Approved' : 'Pending'}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => { setSelectedReport(r); setViewModal(true); }}>View</button>
                        <button className="btn btn-sm" style={{ background: '#EAF3DE', color: '#3B6D11' }} onClick={() => generateReportPDF(r)}>PDF</button>
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
              <div className="modal-title">New Service Report</div>
              <button className="btn btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contract</label>
                <select className="form-input" value={form.contract_id} onChange={e => {
                  const c = contracts.find(c => c.id === parseInt(e.target.value));
                  setForm({...form, contract_id: e.target.value, villa_id: c?.villa_id || '', checklist: initChecklist(c?.package || 'Silver')});
                }}>
                  <option value="">Select contract</option>
                  {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} — {c.client_name} ({c.package})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Visit Type</label>
                <select className="form-input" value={form.visit_type} onChange={e => setForm({...form, visit_type: e.target.value})}>
                  <option>Visit 1 — Pre-Summer (April)</option>
                  <option>Visit 2 — Mid-Summer (July)</option>
                  <option>Visit 3 — Post-Summer (October)</option>
                  <option>Emergency Call-out</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Visit Date</label>
                <input className="form-input" type="date" value={form.visit_date} onChange={e => setForm({...form, visit_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Technician</label>
                <input className="form-input" value={form.technician} onChange={e => setForm({...form, technician: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Manager / Supervisor</label>
              <input className="form-input" value={form.manager} onChange={e => setForm({...form, manager: e.target.value})} />
            </div>

            {form.contract_id && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Services Checklist — {pkg} Package</label>
                {Object.entries(template).map(([category, items]) => items.length > 0 && (
                  <div key={category} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>{category}</div>
                    {items.map(item => (
                      <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={form.checklist[item] || false}
                          onChange={e => setForm({...form, checklist: {...form.checklist, [item]: e.target.checked}})} />
                        {item}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save Report</button>
            </div>
          </div>
        </div>
      )}

      {viewModal && selectedReport && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setViewModal(false)}>
          <div className="modal" style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title">Service Report — {selectedReport.contract_number}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" style={{ background: '#EAF3DE', color: '#3B6D11' }} onClick={() => generateReportPDF(selectedReport)}>Download PDF</button>
                <button className="btn btn-sm" onClick={() => setViewModal(false)}>✕</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1rem', fontSize: 13 }}>
              {[
                ['Villa', `${selectedReport.villa_number}, Block ${selectedReport.block}`],
                ['Client', selectedReport.client_name],
                ['Package', selectedReport.package],
                ['Visit', selectedReport.visit_type],
                ['Date', selectedReport.visit_date],
                ['Technician', selectedReport.technician],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{label}</span>
                  <div style={{ fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 13 }}>Services Checklist</div>
              {Object.entries(selectedReport.checklist || {}).map(([item, done]) => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={done}
                    onChange={e => {
                      const updated = { ...selectedReport.checklist, [item]: e.target.checked };
                      updateChecklist(selectedReport.id, updated);
                    }} />
                  <span style={{ color: done ? '#3B6D11' : 'var(--text-primary)', textDecoration: done ? 'none' : 'none' }}>{item}</span>
                  {done && <span style={{ fontSize: 11, color: '#3B6D11' }}>✓</span>}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, padding: '1rem 0', borderTop: '0.5px solid var(--border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedReport.manager_approved || false}
                  onChange={e => updateChecklist(selectedReport.id, selectedReport.checklist, { manager_approved: e.target.checked })} />
                Manager Approved
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedReport.client_signature || false}
                  onChange={e => updateChecklist(selectedReport.id, selectedReport.checklist, { client_signature: e.target.checked })} />
                Client Signed
              </label>
            </div>

            {selectedReport.notes && (
              <div style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)' }}>
                <strong>Notes:</strong> {selectedReport.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}