import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const emptyForm = {
  title: '',
  department: 'Sales',
  employee_name: '',
  related_reference: '',
  problem: '',
  root_cause: '',
  lesson_learned: '',
  correct_solution: '',
  prevention_steps: '',
  action_required: '',
  responsible_person: '',
  due_date: '',
  status: 'New',
  manager_review: '',
  company_rule: false
};

const statuses = [
  'New',
  'Under Review',
  'Approved Lesson',
  'Rule Created',
  'Implemented',
  'Closed'
];

export default function BlackBox() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    rulesCreated: 0,
    byStatus: [],
    byDepartment: []
  });

  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: ''
  });

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('amc_user') || '{}');

  const canDelete = ['admin', 'owner', 'manager'].includes(user.role);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/black-box', {
        params: {
          search: filters.search || undefined,
          department: filters.department || undefined,
          status: filters.status || undefined
        }
      });

      setEntries(response.data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to load Black Box entries'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/black-box/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Unable to load Black Box statistics:', err);
    }
  };

  useEffect(() => {
    const delay = setTimeout(loadEntries, 250);
    return () => clearTimeout(delay);
  }, [filters.search, filters.department, filters.status]);

  useEffect(() => {
    loadStats();
  }, []);

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  };

  const openEditForm = (entry) => {
    setEditingId(entry.id);

    setForm({
      title: entry.title || '',
      department: entry.department || 'Sales',
      employee_name: entry.employee_name || '',
      related_reference: entry.related_reference || '',
      problem: entry.problem || '',
      root_cause: entry.root_cause || '',
      lesson_learned: entry.lesson_learned || '',
      correct_solution: entry.correct_solution || '',
      prevention_steps: entry.prevention_steps || '',
      action_required: entry.action_required || '',
      responsible_person: entry.responsible_person || '',
      due_date: entry.due_date
        ? String(entry.due_date).slice(0, 10)
        : '',
      status: entry.status || 'New',
      manager_review: entry.manager_review || '',
      company_rule: Boolean(entry.company_rule)
    });

    setSelectedEntry(null);
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const submitForm = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      if (editingId) {
        await api.put(`/black-box/${editingId}`, form);
      } else {
        await api.post('/black-box', form);
      }

      closeForm();
      await Promise.all([loadEntries(), loadStats()]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to save this entry'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry) => {
    const confirmed = window.confirm(
      `Delete "${entry.title}" permanently?`
    );

    if (!confirmed) return;

    try {
      setError('');
      await api.delete(`/black-box/${entry.id}`);
      setSelectedEntry(null);
      await Promise.all([loadEntries(), loadStats()]);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to delete this entry'
      );
    }
  };

  const convertToRule = async (entry) => {
    const confirmed = window.confirm(
      `Create a draft Training Rule from "${entry.title}"?`
    );

    if (!confirmed) return;

    try {
      setConvertingId(entry.id);
      setError('');

      await api.post(
        `/training-rules/from-black-box/${entry.id}`
      );

      await Promise.all([
        loadEntries(),
        loadStats()
      ]);

      setSelectedEntry(null);
      navigate('/training-rules');
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to create the Training Rule'
      );
    } finally {
      setConvertingId(null);
    }
  };
  const countByStatus = (status) => {
    const row = stats.byStatus?.find(
      (item) => item.status === status
    );

    return row?.total || 0;
  };

  const openLessons = useMemo(() => {
    return (
      countByStatus('New') +
      countByStatus('Under Review') +
      countByStatus('Approved Lesson')
    );
  }, [stats]);

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div>
          <div className="topbar-title">Black Box Thinking</div>

          <div
            style={{
              color: 'var(--text-3)',
              fontSize: 13,
              marginTop: 5,
              maxWidth: 720
            }}
          >
            Record mistakes, lessons learned, corrective actions and
            improvements so the same problem does not happen again.
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={openNewForm}
        >
          + Add New Lesson
        </button>
      </div>

      {error && !showForm && (
        <div
          className="card"
          style={{
            color: 'var(--red)',
            marginBottom: 18,
            padding: 14
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 22
        }}
      >
        <div className="card">
          <div className="metric-label">Total Lessons</div>
          <div className="metric-val">{stats.total || 0}</div>
          <div className="metric-sub">
            All recorded learning entries
          </div>
        </div>

        <div className="card">
          <div className="metric-label">Open Learning</div>
          <div className="metric-val">{openLessons}</div>
          <div className="metric-sub">
            New, review and approved
          </div>
        </div>

        <div className="card">
          <div className="metric-label">Implemented</div>
          <div className="metric-val">
            {countByStatus('Implemented')}
          </div>
          <div className="metric-sub">
            Changes applied to the system
          </div>
        </div>

        <div className="card">
          <div className="metric-label">Company Rules</div>
          <div className="metric-val">
            {stats.rulesCreated || 0}
          </div>
          <div className="metric-sub">
            Lessons converted into rules
          </div>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginBottom: 18,
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr auto',
          gap: 12,
          alignItems: 'end'
        }}
      >
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Search lessons</label>

          <input
            className="form-input"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value
              }))
            }
            placeholder="Search problem, employee, solution or reference..."
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Department</label>

          <select
            className="form-input"
            value={filters.department}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                department: event.target.value
              }))
            }
          >
            <option value="">All departments</option>
            <option value="Sales">Sales</option>
            <option value="Operations">Operations</option>
            <option value="Management">Management</option>
            <option value="Customer Service">
              Customer Service
            </option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Status</label>

          <select
            className="form-input"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value
              }))
            }
          >
            <option value="">All statuses</option>

            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn"
          onClick={() =>
            setFilters({
              search: '',
              department: '',
              status: ''
            })
          }
        >
          Clear
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 920
            }}
          >
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Lesson</th>
                <th style={tableHeaderStyle}>Department</th>
                <th style={tableHeaderStyle}>Employee</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Responsible</th>
                <th style={tableHeaderStyle}>Due Date</th>
                <th style={tableHeaderStyle}>Rule</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={emptyStyle}>
                    Loading Black Box lessons...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={emptyStyle}>
                    No lessons recorded yet. Add the first Black Box
                    learning entry.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        style={{
                          border: 0,
                          background: 'transparent',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: 'var(--text-1)',
                          fontWeight: 600
                        }}
                      >
                        {entry.title}
                      </button>

                      <div
                        style={{
                          color: 'var(--text-3)',
                          fontSize: 11,
                          marginTop: 5,
                          maxWidth: 280,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {entry.problem}
                      </div>
                    </td>

                    <td style={tableCellStyle}>
                      <span className="chip">
                        {entry.department}
                      </span>
                    </td>

                    <td style={tableCellStyle}>
                      {entry.employee_name || 'â€”'}
                    </td>

                    <td style={tableCellStyle}>
                      <span className="chip">{entry.status}</span>
                    </td>

                    <td style={tableCellStyle}>
                      {entry.responsible_person || 'â€”'}
                    </td>

                    <td style={tableCellStyle}>
                      {entry.due_date
                        ? new Date(entry.due_date).toLocaleDateString()
                        : 'â€”'}
                    </td>

                    <td style={tableCellStyle}>
                      {entry.company_rule ? 'Yes' : 'No'}
                    </td>

                    <td style={tableCellStyle}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          flexWrap: 'wrap'
                        }}
                      >
                        <button
                          className="btn btn-sm"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          View
                        </button>

                        <></>

                        {canDelete && !entry.has_training_rule && (
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={convertingId === entry.id}
                            onClick={() => convertToRule(entry)}
                          >
                            {convertingId === entry.id
                              ? 'Creating...'
                              : 'Convert to Rule'}
                          </button>
                        )}

                        {entry.has_training_rule && (
                          <span className="chip">
                            Rule Created
                          </span>
                        )}

                        {canDelete && (
                          <></>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700
                  }}
                >
                  {editingId
                    ? 'Edit Black Box Lesson'
                    : 'Add Black Box Lesson'}
                </div>

                <div
                  style={{
                    color: 'var(--text-3)',
                    fontSize: 12,
                    marginTop: 4
                  }}
                >
                  Record the problem, learning and system improvement.
                </div>
              </div>

              <button className="btn" onClick={closeForm}>
                Close
              </button>
            </div>

            {error && (
              <div
                style={{
                  color: 'var(--red)',
                  marginBottom: 14,
                  fontSize: 13
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={submitForm}>
              <div style={formGridStyle}>
                <FormInput
                  label="Lesson title *"
                  value={form.title}
                  onChange={(value) => updateField('title', value)}
                  placeholder="Example: Client complaint was not escalated"
                />

                <FormSelect
                  label="Department *"
                  value={form.department}
                  onChange={(value) =>
                    updateField('department', value)
                  }
                  options={[
                    'Sales',
                    'Operations',
                    'Management',
                    'Customer Service'
                  ]}
                />

                <FormInput
                  label="Employee name"
                  value={form.employee_name}
                  onChange={(value) =>
                    updateField('employee_name', value)
                  }
                  placeholder="Employee involved or reporting"
                />

                <FormInput
                  label="Related client, project or job"
                  value={form.related_reference}
                  onChange={(value) =>
                    updateField('related_reference', value)
                  }
                  placeholder="Client, villa, contract or ticket"
                />

                <FormTextArea
                  label="What happened? *"
                  value={form.problem}
                  onChange={(value) => updateField('problem', value)}
                  placeholder="Describe the mistake, problem or incident"
                />

                <FormTextArea
                  label="Root cause"
                  value={form.root_cause}
                  onChange={(value) =>
                    updateField('root_cause', value)
                  }
                  placeholder="Why did this happen?"
                />

                <FormTextArea
                  label="Lesson learned *"
                  value={form.lesson_learned}
                  onChange={(value) =>
                    updateField('lesson_learned', value)
                  }
                  placeholder="What did the team learn?"
                />

                <FormTextArea
                  label="Correct solution"
                  value={form.correct_solution}
                  onChange={(value) =>
                    updateField('correct_solution', value)
                  }
                  placeholder="What is the correct way to handle it?"
                />

                <FormTextArea
                  label="Prevention steps"
                  value={form.prevention_steps}
                  onChange={(value) =>
                    updateField('prevention_steps', value)
                  }
                  placeholder="How will we prevent this from happening again?"
                />

                <FormTextArea
                  label="Action required"
                  value={form.action_required}
                  onChange={(value) =>
                    updateField('action_required', value)
                  }
                  placeholder="Specific action that must be completed"
                />

                <FormInput
                  label="Responsible person"
                  value={form.responsible_person}
                  onChange={(value) =>
                    updateField('responsible_person', value)
                  }
                  placeholder="Who must implement this change?"
                />

                <FormInput
                  label="Due date"
                  type="date"
                  value={form.due_date}
                  onChange={(value) =>
                    updateField('due_date', value)
                  }
                />

                <FormSelect
                  label="Status"
                  value={form.status}
                  onChange={(value) => updateField('status', value)}
                  options={statuses}
                />

                <FormTextArea
                  label="Manager review"
                  value={form.manager_review}
                  onChange={(value) =>
                    updateField('manager_review', value)
                  }
                  placeholder="Management decision or review notes"
                />
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  marginTop: 10,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={form.company_rule}
                  onChange={(event) =>
                    updateField(
                      'company_rule',
                      event.target.checked
                    )
                  }
                />

                Mark this lesson as approved for company rule review
              </label>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 22
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Update Lesson'
                      : 'Save Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEntry && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                marginBottom: 20
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {selectedEntry.title}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 8,
                    flexWrap: 'wrap'
                  }}
                >
                  <span className="chip">
                    {selectedEntry.department}
                  </span>

                  <span className="chip">
                    {selectedEntry.status}
                  </span>

                  {selectedEntry.company_rule && (
                    <span className="chip">Company Rule</span>
                  )}
                </div>
              </div>

              <button
                className="btn"
                onClick={() => setSelectedEntry(null)}
              >
                Close
              </button>
            </div>

            <Detail label="Employee">
              {selectedEntry.employee_name || 'Not specified'}
            </Detail>

            <Detail label="Related reference">
              {selectedEntry.related_reference || 'Not specified'}
            </Detail>

            <Detail label="Problem or mistake">
              {selectedEntry.problem}
            </Detail>

            <Detail label="Root cause">
              {selectedEntry.root_cause || 'Not specified'}
            </Detail>

            <Detail label="Lesson learned">
              {selectedEntry.lesson_learned}
            </Detail>

            <Detail label="Correct solution">
              {selectedEntry.correct_solution || 'Not specified'}
            </Detail>

            <Detail label="Prevention steps">
              {selectedEntry.prevention_steps || 'Not specified'}
            </Detail>

            <Detail label="Action required">
              {selectedEntry.action_required || 'Not specified'}
            </Detail>

            <Detail label="Responsible person">
              {selectedEntry.responsible_person || 'Not assigned'}
            </Detail>

            <Detail label="Manager review">
              {selectedEntry.manager_review || 'Not reviewed'}
            </Detail>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 20
              }}
            >
              {canDelete && !selectedEntry.has_training_rule && (
                <button
                  className="btn btn-primary"
                  disabled={convertingId === selectedEntry.id}
                  onClick={() => convertToRule(selectedEntry)}
                >
                  {convertingId === selectedEntry.id
                    ? 'Creating Rule...'
                    : 'Convert to Training Rule'}
                </button>
              )}

              {selectedEntry.has_training_rule && (
                <span className="chip">
                  Training Rule Created
                </span>
              )}

              <></>

              {canDelete && (
                <></>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text'
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>

      <input
        className="form-input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>

      <select
        className="form-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormTextArea({
  label,
  value,
  onChange,
  placeholder = ''
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>

      <textarea
        className="form-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows="4"
        style={{ resize: 'vertical' }}
      />
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div
      style={{
        padding: '13px 0',
        borderBottom: '1px solid var(--border)'
      }}
    >
      <div
        style={{
          color: 'var(--text-3)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.04em',
          marginBottom: 5
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6
        }}
      >
        {children}
      </div>
    </div>
  );
}

const tableHeaderStyle = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  color: 'var(--text-3)',
  borderBottom: '1px solid var(--border)'
};

const tableCellStyle = {
  padding: '14px',
  borderBottom: '1px solid var(--border)',
  fontSize: 13,
  verticalAlign: 'top'
};

const emptyStyle = {
  padding: 34,
  textAlign: 'center',
  color: 'var(--text-3)',
  fontSize: 13
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(0, 0, 0, 0.58)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20
};

const modalStyle = {
  width: 'min(980px, 100%)',
  maxHeight: '92vh',
  overflowY: 'auto',
  background: 'var(--surface, #ffffff)',
  color: 'var(--text-1)',
  borderRadius: 14,
  border: '1px solid var(--border)',
  padding: 24,
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)'
};

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0 16px'
};
