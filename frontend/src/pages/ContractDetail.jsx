import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';

const API = 'https://amc-manager-production.up.railway.app/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('amc_token')
  };
}

const CHECKLISTS = {
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
  const [form, setForm] = useState({
    visit_date: '',
    technician: '',
    manager: '',
    notes: '',
    checklist: {}
  });
  const [saving, setSaving] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    original_price: '',
    discount_amount: '',
    final_price: '',
    discount_reason: '',
    discount_approved_by: '',
    discount_approved_date: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('amc_user') || '{}');
  const canManageAMC = ['owner', 'admin', 'manager'].includes(currentUser.role);
  const isSales = currentUser.role === 'sales';

  const load = async () => {
    try {
      const cRes = await fetch(`${API}/contracts/${id}`, { headers: authHeaders() });
            const c = await cRes.json();
      setContract(c);

      const annual = c.annual_value || (Number(c.monthly_value || 0) * 12) || 0;
      const original = Number(c.original_price || annual || 0);
      const discount = Number(c.discount_amount || 0);
      const finalValue = Number(c.final_price || Math.max(original - discount, 0));

      setDiscountForm({
        original_price: original,
        discount_amount: discount,
        final_price: finalValue,
        discount_reason: c.discount_reason || '',
        discount_approved_by: c.discount_approved_by || '',
        discount_approved_date: c.discount_approved_date
          ? String(c.discount_approved_date).split('T')[0]
          : ''
      });

      const rRes = await fetch(`${API}/service-reports?contract_id=${id}`, { headers: authHeaders() });
      const r = await rRes.json();
      setReports(Array.isArray(r) ? r : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const getTier = (pkg) => {
    if (!pkg) return 'Silver';
    if (pkg.includes('Platinum')) return 'Platinum';
    if (pkg.includes('Gold')) return 'Gold';
    return 'Silver';
  };

  const initChecklist = (tier) => {
    const template = CHECKLISTS[tier] || CHECKLISTS.Silver;
    const checklist = {};
    Object.values(template).flat().forEach(item => {
      checklist[item] = false;
    });
    return checklist;
  };

  const openVisit = (visit) => {
    const existing = reports.find(r => r.visit_type === visit.label);

    setSelectedVisit(visit);

    if (existing) {
      setSelectedReport(existing);
      setForm({
        visit_date: existing.visit_date || '',
        technician: existing.technician || '',
        manager: existing.manager || '',
        notes: existing.notes || '',
        checklist: existing.checklist || {}
      });
    } else {
      setSelectedReport(null);
      const tier = getTier(contract?.package);
      setForm({
        visit_date: '',
        technician: '',
        manager: '',
        notes: '',
        checklist: initChecklist(tier)
      });
    }

    setModal(true);
  };

  const save = async () => {
    if (!canManageAMC) return;

    setSaving(true);

    try {
      const body = {
        contract_id: parseInt(id),
        villa_id: contract.villa_id,
        visit_date: form.visit_date,
        visit_type: selectedVisit.label,
        technician: form.technician,
        manager: form.manager,
        checklist: form.checklist,
        notes: form.notes
      };

      if (selectedReport) {
        await fetch(`${API}/service-reports/${selectedReport.id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            checklist: form.checklist,
            notes: form.notes,
            manager_approved: selectedReport.manager_approved,
            client_signature: selectedReport.client_signature
          })
        });
      } else {
        await fetch(`${API}/service-reports`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(body)
        });
      }

      await load();
      setModal(false);
    } catch (e) {
      alert('Error: ' + e.message);
    }

    setSaving(false);
  };

  const updateReportStatus = async (changes) => {
    if (!canManageAMC || !selectedReport) return;

    await fetch(`${API}/service-reports/${selectedReport.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        checklist: form.checklist,
        notes: form.notes,
        manager_approved: changes.manager_approved ?? selectedReport.manager_approved,
        client_signature: changes.client_signature ?? selectedReport.client_signature
      })
    });

    await load();
    setSelectedReport(prev => prev ? { ...prev, ...changes } : prev);
  };
  const saveDiscounts = async () => {
    if (!canManageAMC) return;

    try {
      const originalPrice = parseFloat(discountForm.original_price || 0);
      const discountAmount = parseFloat(discountForm.discount_amount || 0);
      const finalPrice = parseFloat(discountForm.final_price || Math.max(originalPrice - discountAmount, 0));

      const res = await fetch(`${API}/contracts/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          package: contract.package,
          monthly_value: contract.monthly_value,
          start_date: contract.start_date,
          end_date: contract.end_date,
          status: contract.status,
          relationship_manager_id: contract.relationship_manager_id,
          sales_person_id: contract.sales_person_id,
          property_type: contract.property_type,
          commission_amount: contract.commission_amount,
          next_service_date: contract.next_service_date,
          notes: contract.notes,
          original_price: originalPrice,
          discount_amount: discountAmount,
          final_price: finalPrice,
          discount_reason: discountForm.discount_reason,
          discount_approved_by: discountForm.discount_approved_by || currentUser.name || '',
          discount_approved_date: discountForm.discount_approved_date || new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setContract(data);
      alert('Discount details saved');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };
  const logEmergencyCallout = async () => {
    if (!canManageAMC) return;

    if (!window.confirm('Log an emergency call-out for this contract?')) return;

    try {
      const res = await fetch(`${API}/contracts/${id}/emergency-callout`, {
        method: 'POST',
        headers: authHeaders()
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

     const generatePDF = () => {
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

    const tier = getTier(contract?.package);
    const template = CHECKLISTS[tier] || CHECKLISTS.Silver;

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
      if (y + needed > 278) {
        return newPage();
      }
      return y;
    };

    const sectionTitle = (letter, title, y) => {
      y = checkPage(y, 18);

      doc.setTextColor(...darkGold);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${letter} — ${title}`, 15, y);

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

    const emptyCell = (x, y, w, h, bg = null) => {
      if (bg) {
        doc.setFillColor(...bg);
        doc.rect(x, y, w, h, 'F');
      }
      doc.setDrawColor(...border);
      doc.setLineWidth(0.2);
      doc.rect(x, y, w, h);
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
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 26, { align: 'center' });

    let y = 48;

    y = sectionTitle('A', 'CLIENT & VISIT DETAILS', y);

    cell('Job Reference', 15, y, 35, 9, true, tableHead);
    cell(contract?.contract_number, 50, y, 45, 9);
    cell('Date', 95, y, 25, 9, true, tableHead);
    cell(cleanDate(form.visit_date), 120, y, 30, 9);
    cell('Visit Type', 150, y, 25, 9, true, tableHead);
    cell(selectedVisit?.label, 175, y, 20, 9);
    y += 9;

    cell('Client Name', 15, y, 35, 9, true, tableHead);
    cell(contract?.client_name, 50, y, 45, 9);
    cell('Contact Number', 95, y, 35, 9, true, tableHead);
    cell(contract?.client_phone, 130, y, 65, 9);
    y += 9;

    cell('Villa / Unit', 15, y, 35, 9, true, tableHead);
    cell(`${safe(contract?.villa_number)}, Block ${safe(contract?.block)}`, 50, y, 45, 9);
    cell('Community / Area', 95, y, 35, 9, true, tableHead);
    cell(contract?.address || contract?.villa_address || '-', 130, y, 65, 9);
    y += 9;

    cell('AMC Plan', 15, y, 35, 9, true, tableHead);
    cell(contract?.package, 50, y, 45, 9);
    cell('Visit No.', 95, y, 35, 9, true, tableHead);
    cell(selectedVisit?.label, 130, y, 25, 9);
    cell('Emergency Calls Used', 155, y, 25, 9, true, tableHead);
    cell(`${safe(contract?.emergency_callouts_used || 0)} / ${safe(contract?.emergency_callouts_total || 1)}`, 180, y, 15, 9);
    y += 14;

    y = sectionTitle('B', 'TEAM ON SITE', y);

    cell('Role', 15, y, 55, 9, true, tableHead);
    cell('Name', 70, y, 65, 9, true, tableHead);
    cell('Time In', 135, y, 30, 9, true, tableHead);
    cell('Time Out', 165, y, 30, 9, true, tableHead);
    y += 9;

    const teamRows = [
      ['Driver', '', '', ''],
      ['Lead AC Technician', form.technician || '', '', ''],
      ['AC Technician 2', '', '', ''],
      ['Helper', '', '', ''],
      ['Manager / Supervisor', form.manager || '', '', '']
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

    cell('Service Category', 15, y, 38, 9, true, tableHead);
    cell('Service Item', 53, y, 82, 9, true, tableHead);
    cell('Done', 135, y, 20, 9, true, tableHead);
    cell('N/A', 155, y, 20, 9, true, tableHead);
    cell('Pending', 175, y, 20, 9, true, tableHead);
    y += 9;

    Object.entries(template).forEach(([category, items]) => {
      items.forEach((item, index) => {
        y = checkPage(y, 9);

        const done = !!form.checklist[item];

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

    const notes = form.notes ? String(form.notes) : 'No additional notes recorded.';
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

    doc.save(`VAC-Service-Completion-Report-${safe(contract?.contract_number)}-${safe(selectedVisit?.month)}.pdf`);
  };


  if (!contract || !contract.contract_number) {
    return <div className="loading">Loading contract...</div>;
  }

  const tier = getTier(contract.package);

  const tierColor = {
    Silver: '#B4B2A9',
    Gold: '#EF9F27',
    Platinum: '#185FA5'
  };

  const tierBg = {
    Silver: '#F1EFE8',
    Gold: '#FAEEDA',
    Platinum: '#E6F1FB'
  };

  const start = new Date(contract.start_date);
  const end = new Date(contract.end_date);
  const now = new Date();
  const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100))) || 0;
  const pctColor = pct < 30 ? '#3B6D11' : pct < 70 ? '#BA7517' : pct < 90 ? '#E07B2A' : '#A32D2D';
  const annualVal = contract.annual_value || (contract.monthly_value * 12) || 0;
  const visitsUsed = reports.length;
  const visitsTotal = contract.visits_total || 3;
  const calloutsUsed = contract.emergency_callouts_used || 0;
  const calloutsTotal = contract.emergency_callouts_total || 1;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">
          <button
            className="btn btn-sm"
            onClick={() => navigate('/contracts')}
            style={{ marginRight: 12 }}
          >
            ← Back
          </button>
          {contract.contract_number}
          {isSales && (
            <span
              style={{
                marginLeft: 10,
                fontSize: 11,
                background: '#F1EFE8',
                color: '#5F5E5A',
                padding: '4px 10px',
                borderRadius: 20
              }}
            >
              View Only
            </span>
          )}
        </div>

        <div className="topbar-right">
          <span
            style={{
              background: tierBg[tier],
              color: tierColor[tier],
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {contract.package}
          </span>
        </div>
      </div>

      <div className="content">
        <div
          className="metrics-grid"
          style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: '1.5rem' }}
        >
          <div className="metric-card">
            <div className="metric-label">Client</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {contract.client_name || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {contract.client_phone || ''}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Villa</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {contract.villa_number || '—'}, Block {contract.block || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {contract.property_type || 'Villa'}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Annual Value</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              AED {Number(annualVal || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              AED {Number(contract.monthly_value || 0).toLocaleString()}/mo
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Contract Period</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {contract.start_date || '—'} → {contract.end_date || '—'}
            </div>

            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: pctColor, marginBottom: 3 }}>
                {pct}% complete
              </div>

              <div
                style={{
                  height: 6,
                  background: 'var(--border)',
                  borderRadius: 10,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: pctColor,
                    borderRadius: 10
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Visits Used</div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 20,
                color: visitsUsed >= visitsTotal ? '#3B6D11' : '#185FA5'
              }}
            >
              {visitsUsed} / {visitsTotal}
            </div>

            <div style={{ marginTop: 6 }}>
              <div
                style={{
                  height: 6,
                  background: 'var(--border)',
                  borderRadius: 10,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (visitsUsed / visitsTotal) * 100)}%`,
                    background: '#185FA5',
                    borderRadius: 10
                  }}
                ></div>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: '#854F0B' }}>
              🚨 {calloutsUsed} / {calloutsTotal} Emergency Call-outs
            </div>

            {canManageAMC && (
              <button
                className="btn btn-sm"
                style={{
                  marginTop: 6,
                  width: '100%',
                  justifyContent: 'center',
                  background: '#FAEEDA',
                  color: '#854F0B'
                }}
                disabled={calloutsUsed >= calloutsTotal}
                onClick={logEmergencyCallout}
              >
                + Log Emergency Call-out
              </button>
            )}
          </div>
        </div>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">Discount & Approval Details</div>

            {canManageAMC && (
              <button className="btn btn-sm" onClick={saveDiscounts}>
                Save Discount
              </button>
            )}
          </div>

          {isSales && (
            <div
              style={{
                background: '#F1EFE8',
                color: '#5F5E5A',
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 12,
                fontWeight: 500
              }}
            >
              Sales view only: discount details cannot be edited.
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 16
            }}
          >
            <div className="form-group">
              <label className="form-label">Original Price</label>
              <input
                className="form-input"
                type="number"
                disabled={!canManageAMC}
                value={discountForm.original_price}
                onChange={e => {
                  const original = parseFloat(e.target.value || 0);
                  const discount = parseFloat(discountForm.discount_amount || 0);

                  setDiscountForm({
                    ...discountForm,
                    original_price: e.target.value,
                    final_price: Math.max(original - discount, 0)
                  });
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Discount Amount</label>
              <input
                className="form-input"
                type="number"
                disabled={!canManageAMC}
                value={discountForm.discount_amount}
                onChange={e => {
                  const discount = parseFloat(e.target.value || 0);
                  const original = parseFloat(discountForm.original_price || 0);

                  setDiscountForm({
                    ...discountForm,
                    discount_amount: e.target.value,
                    final_price: Math.max(original - discount, 0)
                  });
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Final Price</label>
              <input
                className="form-input"
                type="number"
                disabled={!canManageAMC}
                value={discountForm.final_price}
                onChange={e =>
                  setDiscountForm({ ...discountForm, final_price: e.target.value })
                }
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Discount Reason</label>
              <textarea
                className="form-input"
                disabled={!canManageAMC}
                rows="3"
                value={discountForm.discount_reason}
                onChange={e =>
                  setDiscountForm({ ...discountForm, discount_reason: e.target.value })
                }
                placeholder="Example: Management approved discount for existing VIP client"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Approved By</label>
              <input
                className="form-input"
                disabled={!canManageAMC}
                value={discountForm.discount_approved_by}
                onChange={e =>
                  setDiscountForm({ ...discountForm, discount_approved_by: e.target.value })
                }
                placeholder="Manager / Owner name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Approved Date</label>
              <input
                className="form-input"
                type="date"
                disabled={!canManageAMC}
                value={discountForm.discount_approved_date}
                onChange={e =>
                  setDiscountForm({ ...discountForm, discount_approved_date: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Discount Summary</label>
              <div
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: '#FAFAF7',
                  fontSize: 13,
                  lineHeight: 1.7
                }}
              >
                Original: AED {Number(discountForm.original_price || 0).toLocaleString()}<br />
                Discount: AED {Number(discountForm.discount_amount || 0).toLocaleString()}<br />
                <b>Final: AED {Number(discountForm.final_price || 0).toLocaleString()}</b>
              </div>
            </div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">Annual Visit Schedule — {contract.package}</div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 16,
              padding: '1rem 0'
            }}
          >
            {VISITS.map(visit => {
              const report = reports.find(r => r.visit_type === visit.label);
              const done = report !== undefined;
              const approved = report?.manager_approved;

              return (
                <div
                  key={visit.key}
                  onClick={() => openVisit(visit)}
                  style={{
                    border: `2px solid ${done ? (approved ? '#3B6D11' : '#BA7517') : 'var(--border)'}`,
                    borderRadius: 12,
                    padding: '1.25rem',
                    cursor: 'pointer',
                    background: done ? (approved ? '#EAF3DE' : '#FAEEDA') : '#fff',
                    transition: 'all 0.2s'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {visit.label}
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 20,
                        background: done ? (approved ? '#3B6D11' : '#BA7517') : '#E5E5E0',
                        color: done ? '#fff' : '#888',
                        fontWeight: 500
                      }}
                    >
                      {done ? (approved ? '✓ Approved' : 'In Progress') : 'Pending'}
                    </span>
                  </div>

                  <div style={{ fontSize: 22 }}>📅</div>

                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>
                    {visit.month}
                  </div>

                  {report && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                      {report.visit_date} · {report.technician}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: done ? '#BA7517' : '#185FA5',
                      fontWeight: 500
                    }}
                  >
                    {isSales
                      ? (done ? 'Click to view report →' : 'Report not started')
                      : (done ? 'Click to view/edit report →' : 'Click to start report →')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Package Services — {contract.package}</div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2,1fr)',
              gap: 16,
              padding: '0.5rem 0'
            }}
          >
            {Object.entries(CHECKLISTS[tier] || CHECKLISTS.Silver).map(([category, items]) => (
              <div key={category}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    marginBottom: 8
                  }}
                >
                  {category}
                </div>

                {items.map(item => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      fontSize: 13
                    }}
                  >
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
        <div
          className="modal-bg"
          onClick={e => e.target === e.currentTarget && setModal(false)}
        >
          <div
            className="modal"
            style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <div className="modal-title">
                {selectedVisit.label} — Service Report
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm"
                  style={{ background: '#EAF3DE', color: '#3B6D11' }}
                  onClick={generatePDF}
                >
                  📄 Generate PDF
                </button>

                <button className="btn btn-sm" onClick={() => setModal(false)}>
                  ✕
                </button>
              </div>
            </div>

            {isSales && (
              <div
                style={{
                  background: '#F1EFE8',
                  color: '#5F5E5A',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 12,
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                Sales view only: you can view and generate PDF, but cannot edit this report.
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Visit Date</label>
                <input
                  className="form-input"
                  type="date"
                  disabled={!canManageAMC}
                  value={form.visit_date}
                  onChange={e => setForm({ ...form, visit_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Technician</label>
                <input
                  className="form-input"
                  disabled={!canManageAMC}
                  value={form.technician}
                  onChange={e => setForm({ ...form, technician: e.target.value })}
                  placeholder="Technician name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Manager / Supervisor</label>
              <input
                className="form-input"
                disabled={!canManageAMC}
                value={form.manager}
                onChange={e => setForm({ ...form, manager: e.target.value })}
                placeholder="Manager name"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                Services Checklist — {contract.package}
              </div>

              {Object.entries(CHECKLISTS[tier] || CHECKLISTS.Silver).map(([category, items]) => (
                <div key={category} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-3)',
                      textTransform: 'uppercase',
                      marginBottom: 6
                    }}
                  >
                    {category}
                  </div>

                  {items.map(item => (
                    <label
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 8px',
                        cursor: canManageAMC ? 'pointer' : 'not-allowed',
                        borderRadius: 6,
                        background: form.checklist[item] ? '#EAF3DE' : 'transparent',
                        marginBottom: 2,
                        fontSize: 13,
                        opacity: canManageAMC ? 1 : 0.85
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={!canManageAMC}
                        checked={form.checklist[item] || false}
                        onChange={e =>
                          setForm({
                            ...form,
                            checklist: {
                              ...form.checklist,
                              [item]: e.target.checked
                            }
                          })
                        }
                        style={{
                          width: 16,
                          height: 16,
                          cursor: canManageAMC ? 'pointer' : 'not-allowed'
                        }}
                      />

                      <span
                        style={{
                          color: form.checklist[item] ? '#3B6D11' : 'var(--text-primary)',
                          fontWeight: form.checklist[item] ? 500 : 400
                        }}
                      >
                        {item}
                      </span>

                      {form.checklist[item] && (
                        <span style={{ marginLeft: 'auto', color: '#3B6D11', fontSize: 12 }}>
                          ✓
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <div
              style={{
                padding: '10px 0',
                borderTop: '0.5px solid var(--border)',
                marginBottom: 10,
                display: 'flex',
                gap: 20
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  cursor: canManageAMC ? 'pointer' : 'not-allowed'
                }}
              >
                <input
                  type="checkbox"
                  disabled={!canManageAMC}
                  checked={selectedReport?.manager_approved || false}
                  onChange={e => updateReportStatus({ manager_approved: e.target.checked })}
                />

                <span style={{ fontWeight: 500 }}>Manager Approved</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  cursor: canManageAMC ? 'pointer' : 'not-allowed'
                }}
              >
                <input
                  type="checkbox"
                  disabled={!canManageAMC}
                  checked={selectedReport?.client_signature || false}
                  onChange={e => updateReportStatus({ client_signature: e.target.checked })}
                />

                <span style={{ fontWeight: 500 }}>Client Signed</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows={2}
                disabled={!canManageAMC}
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(false)}>
                Close
              </button>

              <button
                className="btn btn-sm"
                style={{ background: '#EAF3DE', color: '#3B6D11' }}
                onClick={generatePDF}
              >
                📄 Generate PDF
              </button>

              {canManageAMC && (
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : selectedReport ? 'Update Report' : 'Save Report'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}