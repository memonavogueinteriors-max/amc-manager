import { useEffect, useMemo, useState } from 'react';

const API_ROOT =
  import.meta.env.VITE_API_URL ||
  'https://amc-manager-production.up.railway.app';
const API = `${API_ROOT.replace(/\/$/, '')}/api`;

const emptyForm = {
  client_id: '',
  contract_id: '',
  villa_id: '',
  villa_number: '',
  technician_name: '',
  service_date: '',
  service_type: '',
  technician_notes: '',
  before_photos: [],
  after_photos: [],
  customer_signature: '',
  technician_signature: '',
  status: 'Pending'
};

const statusOptions = ['Pending', 'In Progress', 'Completed'];

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('amc_token')
  };
}

function formatDate(value) {
  if (!value) return '-';
  return String(value).split('T')[0];
}

function normalizeStatus(status) {
  return String(status || 'Pending').trim();
}

function statusClass(status) {
  const key = normalizeStatus(status).toLowerCase();
  if (key === 'completed') return 'pill-active';
  if (key === 'pending') return 'pill-pending';
  return 'pill-expiring';
}

export default function TechnicianJobCards() {
  const [jobCards, setJobCards] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCard, setEditingCard] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState({
    before_photos: false,
    after_photos: false
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');

  const fetchJson = async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: authHeaders()
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || data?.error || 'Request failed');
    }
    return data;
  };

  const normalizeContracts = (data) => {
    const rows = Array.isArray(data) ? data : Array.isArray(data?.contracts) ? data.contracts : [];

    return rows.map(contract => ({
      ...contract,
      id: contract.id ?? contract.contract_id,
      contract_number:
        contract.contract_number ||
        contract.number ||
        contract.label ||
        (contract.id || contract.contract_id ? `Contract #${contract.id || contract.contract_id}` : 'Contract')
    }));
  };

  const loadJobCards = async () => {
    setLoading(true);
    try {
      const data = await fetchJson('/technician-job-cards');
      setJobCards(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setJobCards([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await fetchJson('/technician-job-cards/customers');
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setCustomers([]);
    }
  };

  const loadTechnicians = async () => {
    try {
      const data = await fetchJson('/technician-job-cards/technicians');
      setTechnicians(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setTechnicians([]);
    }
  };

  const loadContracts = async (customerId) => {
    if (!customerId) {
      setContracts([]);
      return [];
    }

    try {
      const data = await fetchJson(`/technician-job-cards/contracts/${customerId}`);
      const nextContracts = normalizeContracts(data);
      setContracts(nextContracts);
      return nextContracts;
    } catch (error) {
      console.error(error);
      setContracts([]);
      return [];
    }
  };

  const loadVilla = async (contractId) => {
    if (!contractId) {
      setForm(prev => ({ ...prev, villa_id: '', villa_number: '' }));
      return;
    }

    try {
      const villa = await fetchJson(`/technician-job-cards/villa/${contractId}`);
      setForm(prev => ({ ...prev, villa_id: villa?.id || '', villa_number: villa?.villa_number || '' }));
    } catch (error) {
      console.error(error);
      setForm(prev => ({ ...prev, villa_id: '', villa_number: '' }));
    }
  };

  useEffect(() => {
    loadJobCards();
    loadCustomers();
    loadTechnicians();
  }, []);

  const stats = useMemo(() => {
    const pending = jobCards.filter(card => normalizeStatus(card.status).toLowerCase() === 'pending').length;
    const completed = jobCards.filter(card => normalizeStatus(card.status).toLowerCase() === 'completed').length;
    return { total: jobCards.length, pending, completed };
  }, [jobCards]);

  const filteredJobCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobCards.filter(card => {
      const status = normalizeStatus(card.status);
      const technician = card.technician_name || '';
      const searchable = [
        card.job_card_no,
        card.customer_name,
        card.client_name,
        card.contract_number,
        card.property_type,
        technician,
        card.service_date,
        status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = statusFilter === 'all' || status.toLowerCase() === statusFilter.toLowerCase();
      const matchesTechnician = technicianFilter === 'all' || technician === technicianFilter;

      return matchesSearch && matchesStatus && matchesTechnician;
    });
  }, [jobCards, search, statusFilter, technicianFilter]);

  const technicianNames = useMemo(() => {
    const names = new Set();
    technicians.forEach(technician => {
      if (technician.name) names.add(technician.name);
    });
    jobCards.forEach(card => {
      if (card.technician_name) names.add(card.technician_name);
    });
    return Array.from(names).sort();
  }, [jobCards, technicians]);

  const selectedVilla = useMemo(() => {
    if (!form.villa_id) return null;
    const currentContract = contracts.find(contract => String(contract.id) === String(form.contract_id));
    return form.villa_number || currentContract?.villa_number || form.property_type || `Villa #${form.villa_id}`;
  }, [contracts, form.contract_id, form.property_type, form.villa_id, form.villa_number]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const uploadPhoto = async (file) => {
    const data = new FormData();
    data.append('file', file);

    const response = await fetch(`${API}/upload`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('amc_token')
      },
      body: data
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || result?.message || 'Image upload failed');
    }

    return result.url;
  };

  const uploadPhotos = async (field, fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploadingPhotos(prev => ({ ...prev, [field]: true }));
    try {
      const urls = await Promise.all(files.map(uploadPhoto));
      setForm(prev => ({
        ...prev,
        [field]: [...(Array.isArray(prev[field]) ? prev[field] : []), ...urls]
      }));
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to upload image.');
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [field]: false }));
    }
  };

  const removePhoto = (field, index) => {
    setForm(prev => ({
      ...prev,
      [field]: (Array.isArray(prev[field]) ? prev[field] : []).filter((_, photoIndex) => photoIndex !== index)
    }));
  };

  const openCreate = () => {
    setEditingCard(null);
    setContracts([]);
    setForm(emptyForm);
    setDrawerOpen(true);
  };

  const openEdit = async (card) => {
    setEditingCard(card);
    setDrawerOpen(true);

    try {
      const data = await fetchJson(`/technician-job-cards/${card.id}`);
      const nextForm = {
        ...emptyForm,
        ...data,
        client_id: data.client_id || '',
        contract_id: data.contract_id || '',
        villa_id: data.villa_id || '',
        technician_name: data.technician_name || '',
        service_date: formatDate(data.service_date) === '-' ? '' : formatDate(data.service_date),
        service_type: data.service_type || '',
        technician_notes: data.technician_notes || '',
        before_photos: data.before_photos || [],
        after_photos: data.after_photos || [],
        customer_signature: data.customer_signature || '',
        technician_signature: data.technician_signature || '',
        status: data.status || 'Pending'
      };

      setForm(nextForm);
      if (nextForm.client_id) {
        await loadContracts(nextForm.client_id);
      }
      if (nextForm.contract_id) {
        await loadVilla(nextForm.contract_id);
      }
    } catch (error) {
      console.error(error);
      alert('Unable to load Job Card.');
    }
  };

  const handleCustomerChange = async (customerId) => {
    setForm(prev => ({
      ...prev,
      client_id: customerId,
      contract_id: '',
      villa_id: '',
      villa_number: ''
    }));
    await loadContracts(customerId);
  };

  const handleContractChange = async (contractId) => {
    setForm(prev => ({ ...prev, contract_id: contractId, villa_id: '', villa_number: '' }));
    await loadVilla(contractId);
  };

  const saveJobCard = async () => {
    if (uploadingPhotos.before_photos || uploadingPhotos.after_photos) {
      alert('Please wait for image uploads to finish.');
      return;
    }

    if (!form.technician_name || !form.service_date || !form.service_type) {
  alert('Technician, service type and service date are required.');
  return;
}

    setSaving(true);
    try {
      const { villa_number, property_type, ...payload } = form;
      const body = {
        ...payload,
        client_id: form.client_id ? Number(form.client_id) : null,
        contract_id: form.contract_id ? Number(form.contract_id) : null,
        villa_id: form.villa_id ? Number(form.villa_id) : null,
        before_photos: Array.isArray(form.before_photos) ? form.before_photos : [],
        after_photos: Array.isArray(form.after_photos) ? form.after_photos : []
      };

      if (editingCard) {
        await fetchJson(`/technician-job-cards/${editingCard.id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      } else {
        await fetchJson('/technician-job-cards', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }

      setDrawerOpen(false);
      setEditingCard(null);
      setForm(emptyForm);
      setContracts([]);
      await loadJobCards();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to save Job Card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Technician Job Cards</div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={openCreate}>+ New Job Card</button>
        </div>
      </div>

      <div className="content">
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="metric-card">
            <div className="metric-label">Total Job Cards</div>
            <div className="metric-val">{stats.total}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Pending</div>
            <div className="metric-val">{stats.pending}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Completed</div>
            <div className="metric-val">{stats.completed}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Job Cards</div>
              <div className="card-subtitle">Track technician work, service dates and completion status.</div>
            </div>
          </div>

          <div className="filter-row">
            <input
              className="search-input"
              placeholder="Search job cards..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
            <select
              className="form-input"
              style={{ width: 180 }}
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
            >
              <option value="all">All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              className="form-input"
              style={{ width: 220 }}
              value={technicianFilter}
              onChange={event => setTechnicianFilter(event.target.value)}
            >
              <option value="all">All Technicians</option>
              {technicianNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job Card No</th>
                  <th>Customer</th>
                  <th>Contract</th>
                  <th>Property</th>
                  <th>Technician</th>
                  <th>Service Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="loading">Loading job cards...</td>
                  </tr>
                ) : filteredJobCards.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty">No job cards found.</td>
                  </tr>
                ) : (
                  filteredJobCards.map(card => (
                    <tr key={card.id}>
                      <td style={{ fontWeight: 500 }}>{card.job_card_no || `#${card.id}`}</td>
                      <td>{card.customer_name || card.client_name || '-'}</td>
                      <td>{card.contract_number || '-'}</td>
                      <td>{card.property_type || card.villa_number || '-'}</td>
                      <td>{card.technician_name || '-'}</td>
                      <td>{formatDate(card.service_date)}</td>
                      <td>
                        <span className={`pill ${statusClass(card.status)}`}>
                          {normalizeStatus(card.status)}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={() => openEdit(card)}>Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drawerOpen && (
        <div className="modal-bg" onClick={event => event.target === event.currentTarget && setDrawerOpen(false)}>
          <div
            className="modal"
            style={{
              width: 720,
              maxWidth: 'min(100%, 720px)',
              minHeight: '100vh',
              maxHeight: '100vh',
              marginLeft: 'auto',
              borderRadius: '12px 0 0 12px'
            }}
          >
            <div className="modal-header">
              <div className="modal-title">{editingCard ? 'Edit Job Card' : 'New Job Card'}</div>
              <button className="btn btn-sm" onClick={() => setDrawerOpen(false)}>x</button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Customer</label>
                <select
                  className="form-input"
                  value={form.client_id}
                  onChange={event => handleCustomerChange(event.target.value)}
                >
                  <option value="">Select customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Contract</label>
                <select
                  className="form-input"
                  value={form.contract_id}
                  onChange={event => handleContractChange(event.target.value)}
                >
                  <option value="">Select contract</option>
                  {contracts.map(contract => (
                    <option key={contract.id} value={contract.id}>
                      {contract.contract_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Villa</label>
                <input
                  className="form-input"
                  value={selectedVilla || ''}
                  placeholder="Auto-loads from contract"
                  readOnly
                />
              </div>

              <div className="form-group">
                <label className="form-label">Technician</label>
                <select
                  className="form-input"
                  value={form.technician_name}
                  onChange={event => updateField('technician_name', event.target.value)}
                >
                  <option value="">Select technician</option>
                  {technicianNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Service Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.service_date}
                  onChange={event => updateField('service_date', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Service Type</label>
                <input
                  className="form-input"
                  value={form.service_type}
                  onChange={event => updateField('service_type', event.target.value)}
                  placeholder="AC Maintenance"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Technician Notes</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.technician_notes}
                onChange={event => updateField('technician_notes', event.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Before Photos</label>
                <input
                  className="form-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={event => {
                    uploadPhotos('before_photos', event.target.files);
                    event.target.value = '';
                  }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                  {uploadingPhotos.before_photos ? 'Uploading images...' : `${form.before_photos.length} image${form.before_photos.length === 1 ? '' : 's'} uploaded`}
                </div>
                {form.before_photos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 8, marginTop: 10 }}>
                    {form.before_photos.map((url, index) => (
                      <div key={`${url}-${index}`} style={{ position: 'relative', border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg)' }}>
                        <img src={url} alt="Before service" style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => removePhoto('before_photos', index)}
                          style={{ position: 'absolute', top: 4, right: 4, padding: '2px 6px', background: 'var(--surface)' }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">After Photos</label>
                <input
                  className="form-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={event => {
                    uploadPhotos('after_photos', event.target.files);
                    event.target.value = '';
                  }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                  {uploadingPhotos.after_photos ? 'Uploading images...' : `${form.after_photos.length} image${form.after_photos.length === 1 ? '' : 's'} uploaded`}
                </div>
                {form.after_photos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 8, marginTop: 10 }}>
                    {form.after_photos.map((url, index) => (
                      <div key={`${url}-${index}`} style={{ position: 'relative', border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg)' }}>
                        <img src={url} alt="After service" style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => removePhoto('after_photos', index)}
                          style={{ position: 'absolute', top: 4, right: 4, padding: '2px 6px', background: 'var(--surface)' }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Customer Signature</label>
                <input
                  className="form-input"
                  value={form.customer_signature}
                  onChange={event => updateField('customer_signature', event.target.value)}
                  placeholder="Signature URL or name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Technician Signature</label>
                <input
                  className="form-input"
                  value={form.technician_signature}
                  onChange={event => updateField('technician_signature', event.target.value)}
                  placeholder="Signature URL or name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={form.status}
                onChange={event => updateField('status', event.target.value)}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setDrawerOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveJobCard} disabled={saving || uploadingPhotos.before_photos || uploadingPhotos.after_photos}>
                {saving ? 'Saving...' : editingCard ? 'Update Job Card' : 'Create Job Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
