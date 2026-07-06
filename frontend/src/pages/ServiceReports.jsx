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
    const gray = [90, 90, 90];
    const lightBg = [250, 248, 240];
    const tableHead = [245, 240, 225];
    const border = [215, 200, 165];

    const safe = (v) => String(v || '-');
    const cleanDate = (v) => v ? String(v).split('T')[0] : '-';

    const getTierFromPackage = (pkg) => {
      const text = String(pkg || '').toLowerCase();
      if (text.includes('platinum')) return 'Platinum';
      if (text.includes('gold')) return 'Gold';
      return 'Silver';
    };

    const templates = {
      Silver: {
        'AC Services': [
          'AC Indoor Unit Full Service',
          'AC Outdoor Unit Full Service',
          'Filter Clean & Replace',
          'Condenser Coil Clean',
          'Drain Line Flush & Clear',
          'AC Thermostat & Controls Check',
          'Refrigerant Level Check',
          'Chemical Coil Deep Clean (1x/year)'
        ],
        Duct: ['Duct Chemical Cleaning (1x/year)'],
        Plumbing: ['Basic Plumbing Health Check', 'Drain Assessment'],
        General: ['Service Completion Report', '24-Hr Workmanship Guarantee Check']
      },
      Gold: {
        'AC Services': [
          'AC Indoor Unit Full Service',
          'AC Outdoor Unit Full Service',
          'Filter Clean & Replace',
          'Condenser Coil Clean',
          'Drain Line Flush & Clear',
          'AC Thermostat & Controls Check',
          'Refrigerant Level Check',
          'Chemical Coil Deep Clean (1x/year)'
        ],
        Duct: ['Duct Chemical Cleaning (1x/year)', 'RoboTech Duct Video Inspection (1x partial)'],
        Plumbing: ['Full Plumbing Health Check', 'Pipe & Joint Inspection', 'Water Pressure Check', 'Drain Assessment'],
        Electrical: ['Full Electrical Health Check', 'Distribution Board Inspection', 'Socket & Switch Check'],
        General: ['Service Completion Report', 'Priority Scheduling Confirmed', '24-Hr Workmanship Guarantee Check']
      },
      Platinum: {
        'AC Services': [
          'AC Indoor Unit Full Service',
          'AC Outdoor Unit Full Service',
          'Filter Clean & Replace',
          'Condenser Coil Clean',
          'Drain Line Flush & Clear',
          'AC Thermostat & Controls Check',
          'Refrigerant Level Check',
          'Chemical Coil Deep Clean (1x/year)'
        ],
        Duct: ['Full Duct Chemical Cleaning', 'RoboTech Full Duct Video Inspection (all zones)', 'RoboTech Full Duct Clean'],
        Plumbing: ['Full Plumbing Health Check', 'Pipe & Joint Inspection', 'Water Pressure Check', 'Drain Assessment'],
        Electrical: ['Full Electrical Health Check', 'Distribution Board Inspection', 'Socket & Switch Check'],
        General: [
          'Service Completion Report',
          'VIP Scheduling Confirmed',
          'Dedicated Account Manager Review',
          'Annual Asset Health Report',
          '24-Hr Workmanship Guarantee Check'
        ]
      }
    };

    const tier = getTierFromPackage(report.package);
    const template = templates[tier] || templates.Silver;
    const checklist = report.checklist || {};

    const addFooter = () => {
      doc.setFillColor(...gold);
      doc.rect(0, 284, 210, 13, 'F');

      doc.setTextColor(...white);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        'VOGUE AIR CARE | +971 50 127 5342 | Dubai Villa Specialist | 24-Hr Workmanship Guarantee',
        105,
        292,
        { align: 'center' }
      );
    };

    const newPage = () => {
      addFooter();
      doc.addPage();
      doc.setFillColor(...lightBg);
      doc.rect(0, 0, 210, 297, 'F');
      return 18;
    };

    const checkPage = (y, needed = 25) => {
      if (y + needed > 278) return newPage();
      return y;
    };

    const sectionTitle = (letter, title, y) => {
      y = checkPage(y, 18);

      doc.setTextColor(...darkGold);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(letter + ' — ' + title, 15, y);

      doc.setDrawColor(...gold);
      doc.setLineWidth(0.4);
      doc.line(15, y + 3, 195, y + 3);

      return y + 10;
    };

    const cell = (text, x, y, w, h, bold = false, bg = null) => {
      if (bg) {
        doc.setFillColor(...bg);
        doc.rect(x, y, w, h, 'F');
      }

      doc.setDrawColor(...border);
      doc.setLineWidth(0.2);
      doc.rect(x, y, w, h);

      doc.setTextColor(...dark);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(7.6);

      const lines = doc.splitTextToSize(safe(text), w - 4);
      doc.text(lines, x + 2, y + 5);
    };

    const emptyCell = (x, y, w, h, bg = null) => {
      if (bg) {
        doc.setFillColor(...bg);
        doc.rect(x, y, w, h, 'F');
      }
      doc.setDrawColor(...border);
      doc.setLineWidth(0.2);
      doc.rect(x, y, w, h);
    };

    const drawCheckbox = (x, y, checked = false) => {
      doc.setDrawColor(...border);
      doc.setLineWidth(0.35);
      doc.rect(x, y, 4.5, 4.5);

      if (checked) {
        doc.setDrawColor(...dark);
        doc.setLineWidth(0.55);
        doc.line(x + 0.8, y + 2.4, x + 1.8, y + 3.5);
        doc.line(x + 1.8, y + 3.5, x + 3.8, y + 1.0);
        doc.setLineWidth(0.35);
      }
    };

    const drawServiceHeader = (y) => {
      cell('Service Category', 15, y, 38, 9, true, tableHead);
      cell('Service Item', 53, y, 82, 9, true, tableHead);
      cell('Done', 135, y, 20, 9, true, tableHead);
      cell('N/A', 155, y, 20, 9, true, tableHead);
      cell('Pending', 175, y, 20, 9, true, tableHead);
      return y + 9;
    };

    doc.setFillColor(...lightBg);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setFillColor(...gold);
    doc.rect(0, 0, 210, 38, 'F');

    try {
      doc.addImage('/logo.png', 'PNG', 12, 5, 28, 28);
    } catch (e) {}

    doc.setTextColor(...white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('VOGUE AIR CARE', 45, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('AC | Duct Cleaning | Electrical | Plumbing | Dubai Villa Specialist', 45, 22);
    doc.text('+971 50 127 5342', 45, 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SERVICE COMPLETION REPORT', 150, 15, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Generated: ' + new Date().toLocaleDateString(), 150, 26, { align: 'center' });

    let y = 48;

    y = sectionTitle('A', 'CLIENT & VISIT DETAILS', y);

    cell('Job Reference', 15, y, 35, 9, true, tableHead);
    cell(report.contract_number, 50, y, 45, 9);
    cell('Date', 95, y, 25, 9, true, tableHead);
    cell(cleanDate(report.visit_date), 120, y, 30, 9);
    cell('Visit Type', 150, y, 25, 9, true, tableHead);
    cell(report.visit_type, 175, y, 20, 9);
    y += 9;

    cell('Client Name', 15, y, 35, 9, true, tableHead);
    cell(report.client_name, 50, y, 45, 9);
    cell('Contact Number', 95, y, 35, 9, true, tableHead);
    cell(report.client_phone, 130, y, 65, 9);
    y += 9;

    cell('Villa / Unit', 15, y, 35, 9, true, tableHead);
    cell(safe(report.villa_number) + ', Block ' + safe(report.block), 50, y, 45, 9);
    cell('Community / Area', 95, y, 35, 9, true, tableHead);
    cell(report.address || report.villa_address || '-', 130, y, 65, 9);
    y += 9;

    cell('AMC Plan', 15, y, 35, 9, true, tableHead);
    cell(report.package, 50, y, 45, 9);
    cell('Visit No.', 95, y, 35, 9, true, tableHead);
    cell(report.visit_type, 130, y, 25, 9);
    cell('Emergency Calls Used', 155, y, 25, 9, true, tableHead);
    cell('-', 180, y, 15, 9);
    y += 14;

    y = sectionTitle('B', 'TEAM ON SITE', y);

    cell('Role', 15, y, 55, 9, true, tableHead);
    cell('Name', 70, y, 65, 9, true, tableHead);
    cell('Time In', 135, y, 30, 9, true, tableHead);
    cell('Time Out', 165, y, 30, 9, true, tableHead);
    y += 9;

    const teamRows = [
      ['Driver', '', '', ''],
      ['Lead AC Technician', report.technician || '', '', ''],
      ['AC Technician 2', '', '', ''],
      ['Helper', '', '', ''],
      ['Manager / Supervisor', report.manager || '', '', '']
    ];

    teamRows.forEach((row) => {
      cell(row[0], 15, y, 55, 9);
      cell(row[1], 70, y, 65, 9);
      cell(row[2], 135, y, 30, 9);
      cell(row[3], 165, y, 30, 9);
      y += 9;
    });

    y += 5;
    y = sectionTitle('C', 'SERVICES COMPLETED', y);
    y = drawServiceHeader(y);

    Object.entries(template).forEach(([category, items]) => {
      items.forEach((item, index) => {
        if (y + 9 > 278) {
          y = newPage();
          y = sectionTitle('C', 'SERVICES COMPLETED CONTINUED', y);
          y = drawServiceHeader(y);
        }

        const done = !!checklist[item];

        if (index === 0) {
          cell(category, 15, y, 38, 9);
        } else {
          emptyCell(15, y, 38, 9);
        }
        cell(item, 53, y, 82, 9);
        emptyCell(135, y, 20, 9);
        emptyCell(155, y, 20, 9);
        emptyCell(175, y, 20, 9);

        drawCheckbox(142.8, y + 2.2, done);
        drawCheckbox(162.8, y + 2.2, false);
        drawCheckbox(182.8, y + 2.2, !done);

        y += 9;
      });
    });

    y += 5;
    y = sectionTitle('D', 'PHOTO DOCUMENTATION', y);

    cell('Photo Type', 15, y, 45, 9, true, tableHead);
    cell('Description / Link / Notes', 60, y, 135, 9, true, tableHead);
    y += 9;

    cell('Before Photos', 15, y, 45, 14);
    cell('', 60, y, 135, 14);
    y += 14;

    cell('After Photos', 15, y, 45, 14);
    cell('', 60, y, 135, 14);
    y += 19;

    y = sectionTitle('E', 'PARTS REPLACED & CONSUMABLES USED', y);

    cell('Item Description', 15, y, 55, 9, true, tableHead);
    cell('Qty', 70, y, 18, 9, true, tableHead);
    cell('Unit Cost', 88, y, 25, 9, true, tableHead);
    cell('Notes / Warranty', 113, y, 42, 9, true, tableHead);
    cell('Total Cost', 155, y, 22, 9, true, tableHead);
    cell('Approved', 177, y, 18, 9, true, tableHead);
    y += 9;

    for (let i = 0; i < 3; i++) {
      cell('', 15, y, 55, 10);
      cell('', 70, y, 18, 10);
      cell('', 88, y, 25, 10);
      cell('', 113, y, 42, 10);
      cell('', 155, y, 22, 10);
      cell('', 177, y, 18, 10);
      y += 10;
    }

    y += 5;
    y = sectionTitle('F', 'FOLLOW-UP WORK & RECOMMENDATIONS', y);

    const notes = report.notes ? String(report.notes) : 'No additional notes recorded.';
    cell(notes, 15, y, 180, 30);
    y += 35;

    y = sectionTitle('G', 'CLIENT SATISFACTION RATING', y);

    cell('Client Satisfaction', 15, y, 50, 10, true, tableHead);
    emptyCell(65, y, 32, 10);
    emptyCell(97, y, 32, 10);
    emptyCell(129, y, 32, 10);
    emptyCell(161, y, 34, 10);

    drawCheckbox(68, y + 2.7, false);
    drawCheckbox(100, y + 2.7, false);
    drawCheckbox(132, y + 2.7, false);
    drawCheckbox(164, y + 2.7, false);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(...dark);
    doc.text('Excellent', 75, y + 6.2);
    doc.text('Good', 107, y + 6.2);
    doc.text('Average', 139, y + 6.2);
    doc.text('Needs Follow-up', 171, y + 6.2);

    y += 17;
    y = checkPage(y, 40);

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);

    doc.line(15, y, 80, y);
    doc.line(115, y, 195, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text('Client Signature', 47, y, { align: 'center' });
    doc.text('Lead Technician Signature', 155, y, { align: 'center' });

    y += 14;

    doc.line(15, y, 80, y);
    doc.line(115, y, 195, y);
    y += 7;

    doc.text('Client Name / Date & Time', 47, y, { align: 'center' });
    doc.text('Technician Name / Date & Time', 155, y, { align: 'center' });

    addFooter();

    doc.save('VAC-Service-Completion-Report-' + safe(report.contract_number) + '-' + safe(cleanDate(report.visit_date)) + '.pdf');
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