import { useEffect, useMemo, useState } from 'react';
import api from '../api';

const STATUSES = [
  'New Lead',
  'Confirmed',
  'Technician Assigned',
  'On the Way',
  'Work Started',
  'Completed',
  'Invoice Sent',
  'Paid',
  'Cancelled'
];

const SERVICE_TYPES = [
  'AC Maintenance',
  'AC Repair',
  'Duct Cleaning',
  'Plumbing',
  'Electrical',
  'Annual Inspection',
  'Emergency Callout',
  'General Maintenance'
];

const PAYMENT_METHODS = [
  'Cash',
  'Card',
  'Bank Transfer',
  'Cheque',
  'Online Payment'
];

const emptyForm = {
  customer_name: '',
  mobile: '',
  whatsapp: '',
  email: '',
  address: '',
  google_maps_link: '',
  service_type: SERVICE_TYPES[0],
  booking_date: '',
  preferred_time: '',
  assigned_technician: '',
  status: STATUSES[0],
  price: '',
  discount: '',
  payment_method: PAYMENT_METHODS[0],
  notes: ''
};

function dateForInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return dateForInput(value);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function money(value) {
  const amount = Number(value || 0);
  return `AED ${amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 ? 2 : 0,
    maximumFractionDigits: 2
  })}`;
}

function statusClass(status) {
  if (status === 'Cancelled') return 'pill-expired';
  if (status === 'Paid' || status === 'Completed') return 'pill-active';
  if (status === 'New Lead' || status === 'Confirmed') return 'pill-pending';
  return 'pill-open';
}

export default function ServiceBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');

  const loadBookings = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/service-bookings');
      setBookings(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load service bookings.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const serviceOptions = useMemo(() => {
    const existing = bookings
      .map((booking) => booking.service_type)
      .filter(Boolean);

    return Array.from(new Set([...SERVICE_TYPES, ...existing]));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesSearch = !term || [
        booking.booking_no,
        booking.customer_name,
        booking.mobile,
        booking.whatsapp,
        booking.email,
        booking.service_type,
        booking.assigned_technician
      ].some((value) => String(value || '').toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === 'All' || booking.status === statusFilter;

      const matchesService =
        serviceFilter === 'All' || booking.service_type === serviceFilter;

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [bookings, search, statusFilter, serviceFilter]);

  const openNewModal = () => {
    setEditItem(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (booking) => {
    setEditItem(booking);
    setForm({
      customer_name: booking.customer_name || '',
      mobile: booking.mobile || '',
      whatsapp: booking.whatsapp || '',
      email: booking.email || '',
      address: booking.address || '',
      google_maps_link: booking.google_maps_link || booking.google_map || '',
      service_type: booking.service_type || SERVICE_TYPES[0],
      booking_date: dateForInput(booking.booking_date),
      preferred_time: booking.preferred_time || booking.booking_time || '',
      assigned_technician: booking.assigned_technician || '',
      status: booking.status || STATUSES[0],
      price: booking.price ?? '',
      discount: booking.discount ?? '',
      payment_method: booking.payment_method || PAYMENT_METHODS[0],
      notes: booking.notes || ''
    });
    setModalOpen(true);
  };
const openJobCard = async (booking) => {
  try {
    const { data } = await api.post(
      `/service-bookings/${booking.id}/job-card`
    );

    window.location.href = `/technician-job-cards?id=${data.id}`;
  } catch (err) {
    alert(
      err.response?.data?.error ||
      'Unable to open Job Card.'
    );
  }
};

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const finalAmount = Math.max(Number(form.price || 0) - Number(form.discount || 0), 0);

const commissionRate = 10;
const commissionAmount = Number(
  (Number(form.price || 0) * commissionRate / 100).toFixed(2)
);

  const saveBooking = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      price: Number(form.price || 0),
      discount: Number(form.discount || 0)
    };

    try {
      if (editItem) {
        await api.put(`/service-bookings/${editItem.id}`, payload);
      } else {
        await api.post('/service-bookings', payload);
      }

      setModalOpen(false);
      setEditItem(null);
      setForm(emptyForm);
      await loadBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to save service booking.');
    } finally {
      setSaving(false);
    }
  };

  const deleteBooking = async (booking) => {
    if (!window.confirm(`Delete booking ${booking.booking_no}?`)) return;

    try {
      await api.delete(`/service-bookings/${booking.id}`);
      await loadBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to delete service booking.');
    }
  };

  const totalValue = filteredBookings.reduce(
    (sum, booking) => sum + Number(booking.final_amount || 0),
    0
  );

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">Service Bookings</div>

        <div className="topbar-right">
          <button className="btn btn-primary" onClick={openNewModal}>
            + New Booking
          </button>
        </div>
      </div>

      <div className="content">
        <div className="metrics-grid service-bookings-metrics">
          <div className="metric-card">
            <div className="metric-label">Bookings</div>
            <div className="metric-val">{filteredBookings.length}</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Open Work</div>
            <div className="metric-val">
              {filteredBookings.filter((b) => !['Completed', 'Paid', 'Cancelled'].includes(b.status)).length}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Revenue Pipeline</div>
            <div className="metric-val service-bookings-money">{money(totalValue)}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header service-bookings-header">
            <div>
              <div className="card-title">Bookings</div>
              <div className="service-bookings-subtitle">
                Track customer service requests from lead to payment.
              </div>
            </div>
          </div>

          <div className="filter-row service-bookings-filters">
            <input
              className="search-input service-bookings-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bookings"
            />

            <select
              className="form-input service-bookings-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              className="form-input service-bookings-select"
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
            >
              <option value="All">All services</option>
              {serviceOptions.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="loading">Loading service bookings...</div>
          ) : error ? (
            <div className="empty">{error}</div>
          ) : filteredBookings.length === 0 ? (
            <div className="empty">
              No service bookings found.
            </div>
          ) : (
            <div className="table-wrap service-bookings-table">
              <table>
                <thead>
                  <tr>
                    <th>Booking No</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Technician</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td style={{ fontWeight: 600 }}>{booking.booking_no}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{booking.customer_name}</div>
                        <div className="service-bookings-muted">
                          {booking.mobile}
                          {booking.email ? ` | ${booking.email}` : ''}
                        </div>
                      </td>
                      <td>
                        <div>{booking.service_type}</div>
                        <div className="service-bookings-muted">
                          {booking.payment_method || 'Payment not set'}
                        </div>
                      </td>
                      <td>
                        <div>{formatDate(booking.booking_date)}</div>
                        <div className="service-bookings-muted">
                          {booking.preferred_time || '-'}
                        </div>
                      </td>
                      <td>{booking.assigned_technician || '-'}</td>
                      <td>
                        <span className={`pill ${statusClass(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{money(booking.final_amount)}</div>
                        {Number(booking.discount || 0) > 0 && (
                          <div className="service-bookings-muted">
                            Discount {money(booking.discount)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="service-bookings-actions">
                          {booking.google_maps_link && (
                            <a
                              className="btn btn-sm"
                              href={booking.google_maps_link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Map
                            </a>
                          )}

                          <button
  className="btn btn-sm"
  onClick={() => openEditModal(booking)}
>
  Edit
</button>

<button
  className="btn btn-sm btn-primary"
  onClick={() => openJobCard(booking)}
>
              Job Card
</button>

<button
  className="btn btn-sm btn-danger"
  onClick={() => deleteBooking(booking)}
>
  Delete
</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div
          className="modal-bg"
          onClick={(event) => event.target === event.currentTarget && setModalOpen(false)}
        >
          <form className="modal service-bookings-modal" onSubmit={saveBooking}>
            <div className="modal-header">
              <div className="modal-title">
                {editItem ? `Edit ${editItem.booking_no}` : 'New Booking'}
              </div>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setModalOpen(false)}
              >
                X
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input
                  className="form-input"
                  value={form.customer_name}
                  onChange={(event) => updateField('customer_name', event.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input
                  className="form-input"
                  value={form.mobile}
                  onChange={(event) => updateField('mobile', event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input
                  className="form-input"
                  value={form.whatsapp}
                  onChange={(event) => updateField('whatsapp', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                className="form-input"
                rows="2"
                value={form.address}
                onChange={(event) => updateField('address', event.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Google Maps Link</label>
              <input
                className="form-input"
                value={form.google_maps_link}
                onChange={(event) => updateField('google_maps_link', event.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Service Type</label>
                <select
                  className="form-input"
                  value={form.service_type}
                  onChange={(event) => updateField('service_type', event.target.value)}
                  required
                >
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value)}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Booking Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.booking_date}
                  onChange={(event) => updateField('booking_date', event.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Time</label>
                <input
                  className="form-input"
                  type="time"
                  value={form.preferred_time}
                  onChange={(event) => updateField('preferred_time', event.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assigned Technician</label>
                <input
                  className="form-input"
                  value={form.assigned_technician}
                  onChange={(event) => updateField('assigned_technician', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-input"
                  value={form.payment_method}
                  onChange={(event) => updateField('payment_method', event.target.value)}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Price</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => updateField('price', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Discount</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount}
                  onChange={(event) => updateField('discount', event.target.value)}
                />
              </div>
            </div>

            <div className="service-bookings-total">
              <span>Final Amount</span>
              <strong>{money(finalAmount)}</strong>
            </div>

        <div className="service-bookings-total">
          <span>Salesperson Commission ({commissionRate}%)</span>
          <strong>{money(commissionAmount)}</strong>
        </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows="3"
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : editItem ? 'Update Booking' : 'Create Booking'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


